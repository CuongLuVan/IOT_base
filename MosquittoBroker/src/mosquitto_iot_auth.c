/*
 * Mosquitto 2.x plugin: port of mqttBroker/MqttBroker1885.js.
 *
 * TLS (port, certificates, ECDSA cipher suites, client certificate request)
 * is configured in mosquitto.conf. This plugin adds the rest of the broker
 * logic and reads the same JSON rule files on every event, so changes made by
 * web_manager (saveCertificateMqtt) apply without restarting the broker:
 *
 *   mqtt_device_certs.json   mTLS fingerprint / CN per clientId, ECDSA P-256
 *   mqtt_client_ids.json     client ID anti-spoofing
 *   mqtt_users.json          username / password
 *   mqtt_acl.json            publish / subscribe ACL with + and # wildcards
 *   mqtt_bruteforce.json     brute-force protection
 *   mqtt_message_auth.json   HMAC-SHA256 message authentication
 *   mqtt_replay.json         replay attack protection
 *
 * plugin_opt_* options (mosquitto.conf) replace the enable* variables of the
 * Node.js broker; defaults are the same.
 */
#include <ctype.h>
#include <math.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include <cjson/cJSON.h>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/pem.h>
#include <openssl/x509.h>

#include <mosquitto.h>
#include <mosquitto_broker.h>
#include <mosquitto_plugin.h>

#define PLUGIN_NAME "iot_auth"

struct plugin_config {
	bool enable_tls_certificate;
	bool enable_ecdsa;
	bool enable_acl;
	bool enable_attack;
	bool enable_client_id;
	bool enable_message_authentication;
	bool enable_brute_force;
	/* MqttBroker1885.js closes a client whose publish is rejected. */
	bool disconnect_on_denied_publish;
	char *server_cert_path;
	char *device_certs_path;
	char *acl_path;
	char *client_ids_path;
	char *auth_path;
	char *users_path;
	char *brute_force_path;
	char *replay_path;
};

static mosquitto_plugin_id_t *plugin_id = NULL;
static struct plugin_config config;

/* ------------------------------------------------------------------------ */
/* Small utilities                                                           */
/* ------------------------------------------------------------------------ */

static char *xstrdup(const char *value)
{
	size_t length = strlen(value) + 1;
	char *copy = malloc(length);
	if (copy) memcpy(copy, value, length);
	return copy;
}

static char *join_path(const char *dir, const char *name)
{
	size_t length = strlen(dir) + strlen(name) + 2;
	char *path = malloc(length);
	if (path) snprintf(path, length, "%s/%s", dir, name);
	return path;
}

static int64_t now_ms(void)
{
	struct timespec ts;
	timespec_get(&ts, TIME_UTC);
	return (int64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

static bool ascii_iequals(const char *a, const char *b)
{
	while (*a && *b) {
		if (tolower((unsigned char)*a) != tolower((unsigned char)*b)) return false;
		a++;
		b++;
	}
	return *a == *b;
}

static bool has_iprefix(const char *value, const char *prefix)
{
	while (*prefix) {
		if (tolower((unsigned char)*value) != tolower((unsigned char)*prefix)) return false;
		value++;
		prefix++;
	}
	return true;
}

static const char *non_empty(const char *value)
{
	return value && *value ? value : NULL;
}

/* Growable string used for canonical JSON and fingerprints. */
struct strbuf {
	char *data;
	size_t length;
	size_t capacity;
	bool failed;
};

static void sb_append_n(struct strbuf *sb, const char *text, size_t length)
{
	if (sb->failed) return;
	if (sb->length + length + 1 > sb->capacity) {
		size_t capacity = sb->capacity ? sb->capacity : 128;
		while (sb->length + length + 1 > capacity) capacity *= 2;
		char *data = realloc(sb->data, capacity);
		if (!data) {
			sb->failed = true;
			return;
		}
		sb->data = data;
		sb->capacity = capacity;
	}
	memcpy(sb->data + sb->length, text, length);
	sb->length += length;
	sb->data[sb->length] = '\0';
}

static void sb_append(struct strbuf *sb, const char *text)
{
	sb_append_n(sb, text, strlen(text));
}

static void sb_free(struct strbuf *sb)
{
	free(sb->data);
	memset(sb, 0, sizeof(*sb));
}

/* ------------------------------------------------------------------------ */
/* String-keyed hash table (brute-force state and replay cache)              */
/* ------------------------------------------------------------------------ */

#define TABLE_BUCKETS 4096

struct table_entry {
	char *key;
	int64_t failures;        /* brute force */
	int64_t first_failure_at;
	int64_t blocked_until;
	int64_t seen_at;         /* replay cache */
	struct table_entry *next;
};

struct table {
	struct table_entry *buckets[TABLE_BUCKETS];
};

static struct table brute_force_state; /* clientId/username -> state */
static struct table replay_cache;      /* fingerprint -> timestamp */
static int64_t last_brute_force_cleanup = 0;
static int64_t last_replay_cache_cleanup = 0;

static size_t table_hash(const char *key)
{
	uint64_t hash = 1469598103934665603ULL;
	while (*key) {
		hash ^= (unsigned char)*key++;
		hash *= 1099511628211ULL;
	}
	return (size_t)(hash % TABLE_BUCKETS);
}

static struct table_entry *table_find(struct table *table, const char *key)
{
	struct table_entry *entry = table->buckets[table_hash(key)];
	while (entry && strcmp(entry->key, key) != 0) entry = entry->next;
	return entry;
}

static struct table_entry *table_get_or_add(struct table *table, const char *key)
{
	struct table_entry *entry = table_find(table, key);
	if (entry) return entry;
	entry = calloc(1, sizeof(*entry));
	if (!entry) return NULL;
	entry->key = xstrdup(key);
	if (!entry->key) {
		free(entry);
		return NULL;
	}
	size_t bucket = table_hash(key);
	entry->next = table->buckets[bucket];
	table->buckets[bucket] = entry;
	return entry;
}

static void table_remove(struct table *table, const char *key)
{
	struct table_entry **link = &table->buckets[table_hash(key)];
	while (*link) {
		if (strcmp((*link)->key, key) == 0) {
			struct table_entry *entry = *link;
			*link = entry->next;
			free(entry->key);
			free(entry);
			return;
		}
		link = &(*link)->next;
	}
}

/* Removes every entry for which should_remove() returns true. */
static void table_prune(struct table *table, bool (*should_remove)(struct table_entry *, int64_t, int64_t),
	int64_t now, int64_t window_ms)
{
	for (size_t i = 0; i < TABLE_BUCKETS; i++) {
		struct table_entry **link = &table->buckets[i];
		while (*link) {
			if (should_remove(*link, now, window_ms)) {
				struct table_entry *entry = *link;
				*link = entry->next;
				free(entry->key);
				free(entry);
			} else {
				link = &(*link)->next;
			}
		}
	}
}

static void table_clear(struct table *table)
{
	for (size_t i = 0; i < TABLE_BUCKETS; i++) {
		struct table_entry *entry = table->buckets[i];
		while (entry) {
			struct table_entry *next = entry->next;
			free(entry->key);
			free(entry);
			entry = next;
		}
		table->buckets[i] = NULL;
	}
}

/* ------------------------------------------------------------------------ */
/* Clients to disconnect after a rejected publish                            */
/* ------------------------------------------------------------------------ */

/* Kicking from inside the ACL callback would free the client while mosquitto
 * is still handling its PUBLISH, so the kick runs on the next MOSQ_EVT_TICK. */
struct pending_kick {
	char *client_id;
	struct pending_kick *next;
};
static struct pending_kick *pending_kicks = NULL;

static void queue_kick(const char *client_id)
{
	if (!non_empty(client_id)) return;
	for (struct pending_kick *kick = pending_kicks; kick; kick = kick->next) {
		if (strcmp(kick->client_id, client_id) == 0) return;
	}
	struct pending_kick *kick = calloc(1, sizeof(*kick));
	if (!kick) return;
	kick->client_id = xstrdup(client_id);
	if (!kick->client_id) {
		free(kick);
		return;
	}
	kick->next = pending_kicks;
	pending_kicks = kick;
}

static void run_pending_kicks(bool kick_clients)
{
	while (pending_kicks) {
		struct pending_kick *kick = pending_kicks;
		pending_kicks = kick->next;
		if (kick_clients) mosquitto_kick_client_by_clientid(kick->client_id, true);
		free(kick->client_id);
		free(kick);
	}
}

/* ------------------------------------------------------------------------ */
/* JSON helpers with JavaScript semantics                                    */
/* ------------------------------------------------------------------------ */

static cJSON *read_json_file(const char *path, const char *label)
{
	FILE *file = fopen(path, "rb");
	if (!file) {
		mosquitto_log_printf(MOSQ_LOG_ERR, PLUGIN_NAME ": %s not loaded: cannot open %s", label, path);
		return NULL;
	}
	struct strbuf sb = {0};
	char chunk[4096];
	size_t count;
	while ((count = fread(chunk, 1, sizeof(chunk), file)) > 0) sb_append_n(&sb, chunk, count);
	fclose(file);
	if (sb.failed || !sb.data) {
		mosquitto_log_printf(MOSQ_LOG_ERR, PLUGIN_NAME ": %s not loaded: cannot read %s", label, path);
		sb_free(&sb);
		return NULL;
	}
	cJSON *root = cJSON_Parse(sb.data);
	sb_free(&sb);
	if (!cJSON_IsObject(root)) {
		mosquitto_log_printf(MOSQ_LOG_ERR, PLUGIN_NAME ": %s not loaded: %s must hold a JSON object", label, path);
		cJSON_Delete(root);
		return NULL;
	}
	return root;
}

/* JS property access: with duplicate keys the last one wins. */
static cJSON *get_item(const cJSON *object, const char *key)
{
	cJSON *found = NULL;
	if (!cJSON_IsObject(object) || !key) return NULL;
	for (cJSON *item = object->child; item; item = item->next) {
		if (item->string && strcmp(item->string, key) == 0) found = item;
	}
	return found;
}

static const char *get_string(const cJSON *object, const char *key)
{
	cJSON *item = get_item(object, key);
	return cJSON_IsString(item) ? item->valuestring : NULL;
}

static bool js_truthy(const cJSON *item)
{
	if (!item || cJSON_IsNull(item) || cJSON_IsFalse(item)) return false;
	if (cJSON_IsNumber(item)) return item->valuedouble != 0 && !isnan(item->valuedouble);
	if (cJSON_IsString(item)) return item->valuestring && item->valuestring[0] != '\0';
	return true;
}

static bool array_contains_string(const cJSON *array, const char *value)
{
	if (!cJSON_IsArray(array) || !value) return false;
	for (cJSON *item = array->child; item; item = item->next) {
		if (cJSON_IsString(item) && strcmp(item->valuestring, value) == 0) return true;
	}
	return false;
}

/* Number.prototype.toString() for finite numbers. */
static void js_number_to_string(double value, struct strbuf *sb)
{
	if (!isfinite(value)) {
		sb_append(sb, isnan(value) ? "NaN" : (value > 0 ? "Infinity" : "-Infinity"));
		return;
	}
	if (value == 0) {
		sb_append(sb, "0");
		return;
	}
	if (value < 0) {
		sb_append(sb, "-");
		value = -value;
	}

	/* Shortest digit string that round-trips, as ECMAScript requires. */
	char formatted[64];
	for (int precision = 1; precision <= 17; precision++) {
		snprintf(formatted, sizeof(formatted), "%.*e", precision - 1, value);
		if (strtod(formatted, NULL) == value) break;
	}
	char digits[32];
	int k = 0;
	const char *cursor = formatted;
	for (; *cursor && *cursor != 'e'; cursor++) {
		if (isdigit((unsigned char)*cursor) && k < (int)sizeof(digits) - 1) digits[k++] = *cursor;
	}
	while (k > 1 && digits[k - 1] == '0') k--;
	digits[k] = '\0';
	int n = atoi(cursor + 1) + 1; /* value = 0.digits * 10^n */

	char out[64];
	if (k <= n && n <= 21) {
		sb_append(sb, digits);
		for (int i = 0; i < n - k; i++) sb_append(sb, "0");
	} else if (0 < n && n <= 21) {
		sb_append_n(sb, digits, (size_t)n);
		sb_append(sb, ".");
		sb_append(sb, digits + n);
	} else if (-6 < n && n <= 0) {
		sb_append(sb, "0.");
		for (int i = 0; i < -n; i++) sb_append(sb, "0");
		sb_append(sb, digits);
	} else {
		int exponent = n - 1;
		sb_append_n(sb, digits, 1);
		if (k > 1) {
			sb_append(sb, ".");
			sb_append(sb, digits + 1);
		}
		snprintf(out, sizeof(out), "e%c%d", exponent < 0 ? '-' : '+', exponent < 0 ? -exponent : exponent);
		sb_append(sb, out);
	}
}

/* JSON.stringify() of a string. */
static void js_quote_string(const char *value, struct strbuf *sb)
{
	sb_append(sb, "\"");
	for (const unsigned char *c = (const unsigned char *)value; *c; c++) {
		char escape[8];
		switch (*c) {
			case '"': sb_append(sb, "\\\""); break;
			case '\\': sb_append(sb, "\\\\"); break;
			case '\b': sb_append(sb, "\\b"); break;
			case '\f': sb_append(sb, "\\f"); break;
			case '\n': sb_append(sb, "\\n"); break;
			case '\r': sb_append(sb, "\\r"); break;
			case '\t': sb_append(sb, "\\t"); break;
			default:
				if (*c < 0x20) {
					snprintf(escape, sizeof(escape), "\\u%04x", *c);
					sb_append(sb, escape);
				} else {
					sb_append_n(sb, (const char *)c, 1);
				}
		}
	}
	sb_append(sb, "\"");
}

static int compare_keys(const void *a, const void *b)
{
	/* Byte order of UTF-8 equals JS code-unit order except for characters
	 * above U+FFFF compared with U+E000..U+FFFF. */
	return strcmp(*(const char *const *)a, *(const char *const *)b);
}

/* canonicalizePayloadValue(): JSON with sorted object keys, no whitespace.
 * skip1/skip2 drop top-level keys (signature and keyId). */
static void canonicalize_json(const cJSON *value, struct strbuf *sb, const char *skip1, const char *skip2)
{
	if (cJSON_IsArray(value)) {
		sb_append(sb, "[");
		for (cJSON *item = value->child; item; item = item->next) {
			if (item != value->child) sb_append(sb, ",");
			canonicalize_json(item, sb, NULL, NULL);
		}
		sb_append(sb, "]");
	} else if (cJSON_IsObject(value)) {
		size_t count = 0;
		for (cJSON *item = value->child; item; item = item->next) count++;
		const char **keys = calloc(count ? count : 1, sizeof(*keys));
		if (!keys) {
			sb->failed = true;
			return;
		}
		size_t unique = 0;
		for (cJSON *item = value->child; item; item = item->next) {
			if ((skip1 && strcmp(item->string, skip1) == 0) || (skip2 && strcmp(item->string, skip2) == 0)) continue;
			if (get_item(value, item->string) != item) continue; /* keep the last duplicate */
			keys[unique++] = item->string;
		}
		qsort(keys, unique, sizeof(*keys), compare_keys);
		sb_append(sb, "{");
		for (size_t i = 0; i < unique; i++) {
			if (i) sb_append(sb, ",");
			js_quote_string(keys[i], sb);
			sb_append(sb, ":");
			canonicalize_json(get_item(value, keys[i]), sb, NULL, NULL);
		}
		sb_append(sb, "}");
		free(keys);
	} else if (cJSON_IsString(value)) {
		js_quote_string(value->valuestring, sb);
	} else if (cJSON_IsNumber(value)) {
		if (isfinite(value->valuedouble)) js_number_to_string(value->valuedouble, sb);
		else sb_append(sb, "null");
	} else if (cJSON_IsTrue(value)) {
		sb_append(sb, "true");
	} else if (cJSON_IsFalse(value)) {
		sb_append(sb, "false");
	} else {
		sb_append(sb, "null");
	}
}

/* String(value) for values coming from JSON.parse(). */
static void js_to_string(const cJSON *value, struct strbuf *sb)
{
	if (cJSON_IsString(value)) {
		sb_append(sb, value->valuestring);
	} else if (cJSON_IsNumber(value)) {
		js_number_to_string(value->valuedouble, sb);
	} else if (cJSON_IsTrue(value)) {
		sb_append(sb, "true");
	} else if (cJSON_IsFalse(value)) {
		sb_append(sb, "false");
	} else if (cJSON_IsNull(value)) {
		sb_append(sb, "null");
	} else if (cJSON_IsArray(value)) {
		for (cJSON *item = value->child; item; item = item->next) {
			if (item != value->child) sb_append(sb, ",");
			if (!cJSON_IsNull(item)) js_to_string(item, sb);
		}
	} else {
		sb_append(sb, "[object Object]");
	}
}

/* JSON.parse() of the payload; NULL when it is not valid JSON. */
static cJSON *parse_payload(const void *payload, uint32_t length)
{
	if (!payload || length == 0) return NULL;
	const char *end = NULL;
	cJSON *value = cJSON_ParseWithLengthOpts(payload, length, &end, false);
	if (!value) return NULL;
	const char *limit = (const char *)payload + length;
	while (end && end < limit && (*end == ' ' || *end == '\t' || *end == '\n' || *end == '\r')) end++;
	if (end != limit && !(end && end + 1 == limit && *end == '\0')) {
		cJSON_Delete(value);
		return NULL;
	}
	return value;
}

/* ------------------------------------------------------------------------ */
/* Topic matching                                                            */
/* ------------------------------------------------------------------------ */

/* Same as the regular expression built by topicMatches(): '+' matches one or
 * more characters other than '/', '#' matches anything, other characters are
 * literal. */
static bool match_from(const char *pattern, const char *topic)
{
	for (;;) {
		if (*pattern == '\0') return *topic == '\0';
		if (*pattern == '#') {
			pattern++;
			for (const char *rest = topic;; rest++) {
				if (match_from(pattern, rest)) return true;
				if (*rest == '\0') return false;
			}
		}
		if (*pattern == '+') {
			pattern++;
			if (*topic == '\0' || *topic == '/') return false;
			for (const char *rest = topic + 1;; rest++) {
				if (match_from(pattern, rest)) return true;
				if (*rest == '\0' || *rest == '/') return false;
			}
		}
		if (*pattern != *topic) return false;
		pattern++;
		topic++;
	}
}

static bool topic_matches(const cJSON *pattern, const char *topic)
{
	if (!cJSON_IsString(pattern) || !non_empty(pattern->valuestring) || !topic) return false;
	return match_from(pattern->valuestring, topic);
}

/* ------------------------------------------------------------------------ */
/* Brute-force protection                                                    */
/* ------------------------------------------------------------------------ */

struct brute_force_config {
	double window_seconds;
	double max_failed_attempts;
	double block_duration_seconds;
	cJSON *root;               /* owns ignore_users */
	const cJSON *ignore_users;
};

static double number_or(const cJSON *object, const char *key, double fallback)
{
	cJSON *item = get_item(object, key);
	return cJSON_IsNumber(item) ? item->valuedouble : fallback;
}

static void load_brute_force_config(struct brute_force_config *bf)
{
	cJSON *value = read_json_file(config.brute_force_path, "Brute-force config");
	if (!value) mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": using default brute-force config");
	bf->window_seconds = number_or(value, "windowSeconds", 300);
	bf->max_failed_attempts = number_or(value, "maxFailedAttempts", 5);
	bf->block_duration_seconds = number_or(value, "blockDurationSeconds", 900);
	cJSON *ignore = get_item(value, "ignoreUsers");
	bf->ignore_users = cJSON_IsArray(ignore) ? ignore : NULL;
	bf->root = value;
}

static bool brute_force_expired(struct table_entry *state, int64_t now, int64_t window_ms)
{
	bool blocked = state->blocked_until && now < state->blocked_until;
	return !blocked && now - state->first_failure_at > window_ms;
}

static void prune_brute_force_state(int64_t now, const struct brute_force_config *bf)
{
	if (now - last_brute_force_cleanup < 60000) return;
	last_brute_force_cleanup = now;
	table_prune(&brute_force_state, brute_force_expired, now, (int64_t)(bf->window_seconds * 1000));
}

static bool is_brute_force_blocked(const char *id)
{
	struct table_entry *state = table_find(&brute_force_state, id);
	return state && state->blocked_until && now_ms() < state->blocked_until;
}

static void record_brute_force_failure(const char *id, const char *username, const struct brute_force_config *bf)
{
	if (array_contains_string(bf->ignore_users, id) || array_contains_string(bf->ignore_users, username)) return;
	int64_t now = now_ms();
	struct table_entry *state = table_find(&brute_force_state, id);
	if (!state) {
		state = table_get_or_add(&brute_force_state, id);
		if (!state) return;
		state->failures = 0;
		state->first_failure_at = now;
		state->blocked_until = 0;
	}
	if (state->blocked_until && now < state->blocked_until) return;
	if (now - state->first_failure_at > bf->window_seconds * 1000) {
		state->failures = 1;
		state->first_failure_at = now;
	} else {
		state->failures += 1;
	}
	if (state->failures >= bf->max_failed_attempts) {
		state->blocked_until = now + (int64_t)(bf->block_duration_seconds * 1000);
		time_t until = (time_t)(state->blocked_until / 1000);
		char text[32];
		strftime(text, sizeof(text), "%Y-%m-%dT%H:%M:%SZ", gmtime(&until));
		mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": brute-force protection blocking %s until %s", id, text);
	}
}

/* ------------------------------------------------------------------------ */
/* Authentication                                                            */
/* ------------------------------------------------------------------------ */

static bool is_ecdsa_p256(X509 *certificate)
{
	EVP_PKEY *key = X509_get0_pubkey(certificate);
	char group[64] = {0};
	size_t length = 0;
	if (!key || EVP_PKEY_get_base_id(key) != EVP_PKEY_EC) return false;
	if (EVP_PKEY_get_group_name(key, group, sizeof(group), &length) != 1) return false;
	return strcmp(group, "prime256v1") == 0 || strcmp(group, "P-256") == 0;
}

/* Upper-case colon separated SHA-256, as Node.js fingerprint256. */
static bool certificate_fingerprint256(X509 *certificate, char *out, size_t size)
{
	unsigned char digest[EVP_MAX_MD_SIZE];
	unsigned int length = 0;
	if (!X509_digest(certificate, EVP_sha256(), digest, &length) || size < length * 3) return false;
	for (unsigned int i = 0; i < length; i++) {
		snprintf(out + i * 3, 4, "%02X%s", digest[i], i + 1 < length ? ":" : "");
	}
	return true;
}

static bool verify_device_certificate(struct mosquitto *client, const char *identity)
{
	if (!identity) return false;

	cJSON *value = read_json_file(config.device_certs_path, "Device cert mapping");
	if (!value) return false;

	cJSON *devices = get_item(value, "devices");
	const cJSON *device = NULL;
	if (cJSON_IsArray(devices)) {
		for (cJSON *item = devices->child; item; item = item->next) {
			const char *client_id = get_string(item, "clientId");
			if (client_id && strcmp(client_id, identity) == 0) {
				device = item;
				break;
			}
		}
	}
	/* device.fingerprint256 || device.fingerprint || device.subjectCN */
	const cJSON *expected = NULL;
	if (device) {
		const char *fields[] = {"fingerprint256", "fingerprint", "subjectCN"};
		for (size_t i = 0; i < 3 && !js_truthy(expected); i++) expected = get_item(device, fields[i]);
	}

	X509 *peer = mosquitto_client_certificate(client);
	char fingerprint[EVP_MAX_MD_SIZE * 3] = "";
	if (peer) certificate_fingerprint256(peer, fingerprint, sizeof(fingerprint));

	if (config.enable_ecdsa && peer && !is_ecdsa_p256(peer)) {
		mosquitto_log_printf(MOSQ_LOG_WARNING,
			PLUGIN_NAME ": mTLS authentication failed for %s - client certificate is not ECDSA P-256", identity);
		X509_free(peer);
		cJSON_Delete(value);
		return false;
	}

	bool authorized = false;
	if (peer && cJSON_IsString(expected)) {
		char common_name[256] = "";
		X509_NAME_get_text_by_NID(X509_get_subject_name(peer), NID_commonName, common_name, sizeof(common_name));
		authorized = (fingerprint[0] && ascii_iequals(fingerprint, expected->valuestring)) ||
			(common_name[0] && strcmp(common_name, expected->valuestring) == 0);
	}
	if (!authorized) {
		mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": mTLS authentication failed for %s peer fingerprint: %s",
			identity, peer ? fingerprint : "undefined");
	}
	if (peer) X509_free(peer);
	cJSON_Delete(value);
	return authorized;
}

static bool verify_username_password(const char *username, const char *password)
{
	cJSON *value = read_json_file(config.users_path, "mqtt_users.json");
	if (!value) return false;
	bool authorized = false;
	cJSON *users = get_item(value, "users");
	if (username && cJSON_IsArray(users)) {
		for (cJSON *item = users->child; item && !authorized; item = item->next) {
			const char *user = get_string(item, "username");
			const char *pass = get_string(item, "password");
			authorized = user && pass && strcmp(user, username) == 0 && strcmp(pass, password) == 0;
		}
	}
	cJSON_Delete(value);
	return authorized;
}

static bool verify_credentials(struct mosquitto *client, const char *identity, const char *username,
	const char *password)
{
	return config.enable_tls_certificate ? verify_device_certificate(client, identity) :
		verify_username_password(username, password);
}

static bool verify_client_identity(struct mosquitto *client, const char *username, const char *password)
{
	const char *client_id = non_empty(mosquitto_client_id(client));
	if (!config.enable_client_id) {
		const char *identity = client_id ? client_id : non_empty(username);
		return verify_credentials(client, identity, username, password);
	}

	cJSON *value = read_json_file(config.client_ids_path, "Client ID mapping");
	if (!value) return false;

	const cJSON *record = NULL;
	cJSON *clients = get_item(value, "clients");
	if (client_id && cJSON_IsArray(clients)) {
		for (cJSON *item = clients->child; item; item = item->next) {
			const char *id = get_string(item, "clientId");
			if (id && strcmp(id, client_id) == 0) {
				record = item;
				break;
			}
		}
	}
	if (!client_id || !record) {
		mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": Client ID validation failed: unknown clientId %s",
			client_id ? client_id : "undefined");
		cJSON_Delete(value);
		return false;
	}

	const char *expected_username = get_string(record, "username");
	if (non_empty(expected_username) && non_empty(username) && strcmp(expected_username, username) != 0) {
		mosquitto_log_printf(MOSQ_LOG_WARNING,
			PLUGIN_NAME ": Client ID validation failed: username mismatch for %s expected %s got %s",
			client_id, expected_username, username);
		cJSON_Delete(value);
		return false;
	}
	cJSON_Delete(value);
	return verify_credentials(client, client_id, username, password);
}

static int on_basic_auth(int event, void *event_data, void *userdata)
{
	struct mosquitto_evt_basic_auth *ed = event_data;
	(void)event;
	(void)userdata;

	const char *username = ed->username;
	const char *password = ed->password ? ed->password : "";
	const char *client_id = non_empty(mosquitto_client_id(ed->client));
	const char *identity = client_id ? client_id : (non_empty(username) ? username : "unknown");

	struct brute_force_config bf = {0};
	if (config.enable_brute_force) {
		load_brute_force_config(&bf);
		prune_brute_force_state(now_ms(), &bf);
		if (is_brute_force_blocked(identity)) {
			mosquitto_log_printf(MOSQ_LOG_WARNING,
				PLUGIN_NAME ": authentication denied by brute-force protection for %s", identity);
			cJSON_Delete(bf.root);
			return MOSQ_ERR_AUTH;
		}
	}

	bool authorized = verify_client_identity(ed->client, username, password);

	if (config.enable_brute_force) {
		if (authorized) table_remove(&brute_force_state, identity);
		else record_brute_force_failure(identity, username, &bf);
		cJSON_Delete(bf.root);
	}
	return authorized ? MOSQ_ERR_SUCCESS : MOSQ_ERR_AUTH;
}

/* ------------------------------------------------------------------------ */
/* Message authentication (HMAC-SHA256)                                      */
/* ------------------------------------------------------------------------ */

static const char *lookup_secret(const cJSON *keys, const char *id)
{
	cJSON *secret = id ? get_item(keys, id) : NULL;
	/* crypto.createHmac() needs a string secret; anything else fails. */
	return cJSON_IsString(secret) && secret->valuestring[0] ? secret->valuestring : NULL;
}

static bool verify_message_authentication(struct mosquitto *client, const char *topic, const cJSON *data,
	const cJSON *auth)
{
	const char *scheme = get_string(auth, "scheme");
	const char *field = get_string(auth, "field");
	const char *key_field = get_string(auth, "keyField");
	cJSON *ignore_topics = get_item(auth, "ignoreTopics");
	cJSON *keys = get_item(auth, "keys");
	if (!scheme) scheme = "hmac-sha256";
	if (!field) field = "signature";
	if (!key_field) key_field = "keyId";
	if (!cJSON_IsObject(keys)) keys = NULL;

	if (array_contains_string(ignore_topics, topic)) return true;
	/* An array body has no signature field either. */
	if (!cJSON_IsObject(data)) return false;

	cJSON *signature = get_item(data, field);
	if (!js_truthy(signature)) return false;

	const char *skip_key = non_empty(key_field);
	const char *secret = NULL;
	if (skip_key) {
		cJSON *key_id = get_item(data, skip_key);
		if (js_truthy(key_id)) {
			struct strbuf id = {0};
			js_to_string(key_id, &id);
			if (!id.failed) secret = lookup_secret(keys, id.data);
			sb_free(&id);
		}
	}
	if (!secret) secret = lookup_secret(keys, non_empty(mosquitto_client_id(client)));
	if (!secret) secret = lookup_secret(keys, non_empty(mosquitto_client_username(client)));
	if (!secret) return false;

	if (!ascii_iequals(scheme, "hmac-sha256")) {
		mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": unsupported message authentication scheme %s", scheme);
		return false;
	}

	struct strbuf canonical = {0};
	canonicalize_json(data, &canonical, field, skip_key);
	if (canonical.failed || !canonical.data) {
		sb_free(&canonical);
		return false;
	}
	unsigned char digest[EVP_MAX_MD_SIZE];
	unsigned int digest_length = 0;
	bool hashed = HMAC(EVP_sha256(), secret, (int)strlen(secret), (const unsigned char *)canonical.data,
		canonical.length, digest, &digest_length) != NULL;
	sb_free(&canonical);
	if (!hashed) return false;

	char expected[EVP_MAX_MD_SIZE * 2 + 1];
	for (unsigned int i = 0; i < digest_length; i++) snprintf(expected + i * 2, 3, "%02x", digest[i]);

	/* normalizeSignature(): strip 0x and sha256: prefixes, lower case. */
	if (!cJSON_IsString(signature)) return false;
	const char *provided = signature->valuestring;
	if (has_iprefix(provided, "0x")) provided += 2;
	if (has_iprefix(provided, "sha256:")) provided += 7;
	size_t length = strlen(provided);
	if (length != digest_length * 2) return false;
	char normalized[EVP_MAX_MD_SIZE * 2 + 1];
	for (size_t i = 0; i < length; i++) normalized[i] = (char)tolower((unsigned char)provided[i]);
	normalized[length] = '\0';
	return CRYPTO_memcmp(normalized, expected, length) == 0;
}

/* ------------------------------------------------------------------------ */
/* Replay protection                                                         */
/* ------------------------------------------------------------------------ */

struct replay_config {
	double window_seconds;
	double max_skew_seconds;
	const char *timestamp_field;
	const char *nonce_field;
	const cJSON *ignore_topics;
	cJSON *root;
};

static void load_replay_config(struct replay_config *rc)
{
	cJSON *value = read_json_file(config.replay_path, "Replay config");
	if (!value) mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": using default replay config");
	rc->window_seconds = number_or(value, "windowSeconds", 60);
	rc->max_skew_seconds = number_or(value, "maxSkewSeconds", 300);
	cJSON *timestamp = get_item(value, "timestampField");
	cJSON *nonce = get_item(value, "nonceField");
	rc->timestamp_field = cJSON_IsString(timestamp) ? timestamp->valuestring : "timestamp";
	rc->nonce_field = cJSON_IsString(nonce) ? nonce->valuestring : "nonce";
	cJSON *ignore = get_item(value, "ignoreTopics");
	rc->ignore_topics = cJSON_IsArray(ignore) ? ignore : NULL;
	rc->root = value;
}

static bool is_js_space(char c)
{
	return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\v' || c == '\f';
}

/* Number(string) */
static double js_string_to_number(const char *text)
{
	while (is_js_space(*text)) text++;
	size_t length = strlen(text);
	while (length && is_js_space(text[length - 1])) length--;
	if (length == 0) return 0;

	char buffer[128];
	if (length >= sizeof(buffer)) return NAN;
	memcpy(buffer, text, length);
	buffer[length] = '\0';

	if (strcmp(buffer, "Infinity") == 0 || strcmp(buffer, "+Infinity") == 0) return INFINITY;
	if (strcmp(buffer, "-Infinity") == 0) return -INFINITY;
	if (buffer[0] == '0' && (buffer[1] == 'x' || buffer[1] == 'X' || buffer[1] == 'o' || buffer[1] == 'O' ||
		buffer[1] == 'b' || buffer[1] == 'B')) {
		int base = (buffer[1] == 'x' || buffer[1] == 'X') ? 16 : (buffer[1] == 'o' || buffer[1] == 'O') ? 8 : 2;
		if (buffer[2] == '\0') return NAN;
		double value = 0;
		for (const char *c = buffer + 2; *c; c++) {
			int digit = isdigit((unsigned char)*c) ? *c - '0' :
				isalpha((unsigned char)*c) ? tolower((unsigned char)*c) - 'a' + 10 : 99;
			if (digit >= base) return NAN;
			value = value * base + digit;
		}
		return value;
	}

	/* StrDecimalLiteral: [+-] (digits [. digits] | . digits) [e [+-] digits] */
	const char *c = buffer;
	if (*c == '+' || *c == '-') c++;
	bool digits = false;
	while (isdigit((unsigned char)*c)) { c++; digits = true; }
	if (*c == '.') {
		c++;
		while (isdigit((unsigned char)*c)) { c++; digits = true; }
	}
	if (!digits) return NAN;
	if (*c == 'e' || *c == 'E') {
		c++;
		if (*c == '+' || *c == '-') c++;
		if (!isdigit((unsigned char)*c)) return NAN;
		while (isdigit((unsigned char)*c)) c++;
	}
	if (*c != '\0') return NAN;
	return strtod(buffer, NULL);
}

static int64_t days_from_civil(int64_t y, unsigned m, unsigned d)
{
	y -= m <= 2;
	int64_t era = (y >= 0 ? y : y - 399) / 400;
	unsigned yoe = (unsigned)(y - era * 400);
	unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
	unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
	return era * 146097 + (int64_t)doe - 719468;
}

static bool read_digits(const char **cursor, int count, int *out)
{
	int value = 0;
	for (int i = 0; i < count; i++) {
		if (!isdigit((unsigned char)(*cursor)[i])) return false;
		value = value * 10 + (*cursor)[i] - '0';
	}
	*cursor += count;
	*out = value;
	return true;
}

/* Date.parse() for the ISO 8601 format of Date.prototype.toISOString():
 * YYYY-MM-DD[THH:mm[:ss[.sss]]][Z|+HH:mm|-HH:mm]. A date-time without an
 * offset is local time, a date alone is UTC, as in JavaScript. */
static double js_date_parse(const char *text)
{
	int year, month = 1, day = 1, hour = 0, minute = 0, second = 0, millis = 0;
	const char *c = text;
	if (!read_digits(&c, 4, &year)) return NAN;
	if (*c == '-') {
		c++;
		if (!read_digits(&c, 2, &month)) return NAN;
		if (*c == '-') {
			c++;
			if (!read_digits(&c, 2, &day)) return NAN;
		}
	}
	bool has_time = false, has_offset = false;
	int offset_minutes = 0;
	if (*c == 'T' || *c == 't') {
		has_time = true;
		c++;
		if (!read_digits(&c, 2, &hour) || *c++ != ':' || !read_digits(&c, 2, &minute)) return NAN;
		if (*c == ':') {
			c++;
			if (!read_digits(&c, 2, &second)) return NAN;
			if (*c == '.') {
				c++;
				int digits = 0;
				millis = 0;
				while (isdigit((unsigned char)*c)) {
					if (digits < 3) millis = millis * 10 + (*c - '0');
					digits++;
					c++;
				}
				if (!digits) return NAN;
				for (; digits < 3; digits++) millis *= 10;
			}
		}
		if (*c == 'Z' || *c == 'z') {
			has_offset = true;
			c++;
		} else if (*c == '+' || *c == '-') {
			int sign = *c++ == '-' ? -1 : 1, oh, om;
			if (!read_digits(&c, 2, &oh) || *c++ != ':' || !read_digits(&c, 2, &om)) return NAN;
			has_offset = true;
			offset_minutes = sign * (oh * 60 + om);
		}
	}
	if (*c != '\0' || month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || minute > 59 || second > 59)
		return NAN;

	if (has_time && !has_offset) {
		struct tm local = {0};
		local.tm_year = year - 1900;
		local.tm_mon = month - 1;
		local.tm_mday = day;
		local.tm_hour = hour;
		local.tm_min = minute;
		local.tm_sec = second;
		local.tm_isdst = -1;
		time_t seconds = mktime(&local);
		return seconds == (time_t)-1 ? NAN : (double)seconds * 1000 + millis;
	}
	int64_t days = days_from_civil(year, (unsigned)month, (unsigned)day);
	double value = ((double)days * 86400 + hour * 3600 + minute * 60 + second) * 1000 + millis;
	return value - (double)offset_minutes * 60000;
}

static double message_time(const cJSON *timestamp)
{
	double value = NAN;
	if (cJSON_IsNumber(timestamp)) value = timestamp->valuedouble;
	else if (cJSON_IsString(timestamp)) value = js_string_to_number(timestamp->valuestring);
	else if (cJSON_IsTrue(timestamp)) value = 1;
	else if (cJSON_IsFalse(timestamp)) value = 0;
	if (isnan(value) && cJSON_IsString(timestamp)) value = js_date_parse(timestamp->valuestring);
	return value;
}

static bool replay_expired(struct table_entry *entry, int64_t now, int64_t window_ms)
{
	return now - entry->seen_at >= window_ms;
}

static bool verify_replay_protection(struct mosquitto *client, const char *topic, const void *payload,
	uint32_t payload_length, const cJSON *data, const struct replay_config *rc)
{
	const char *id = non_empty(mosquitto_client_id(client));
	if (!id) id = non_empty(mosquitto_client_username(client));
	if (!id) id = "unknown";
	int64_t now = now_ms();
	int64_t window_ms = (int64_t)(rc->window_seconds * 1000);

	struct strbuf fingerprint = {0};
	sb_append(&fingerprint, id);
	sb_append(&fingerprint, "|");
	sb_append(&fingerprint, topic);
	sb_append(&fingerprint, "|");

	/* JSON objects and arrays are checked by timestamp + nonce, anything else
	 * by the SHA-256 of the raw payload. */
	if (cJSON_IsObject(data) || cJSON_IsArray(data)) {
		cJSON *timestamp = cJSON_IsObject(data) ? get_item(data, rc->timestamp_field) : NULL;
		cJSON *nonce = cJSON_IsObject(data) ? get_item(data, rc->nonce_field) : NULL;
		if (!timestamp || cJSON_IsNull(timestamp) || !nonce || cJSON_IsNull(nonce)) {
			mosquitto_log_printf(MOSQ_LOG_WARNING,
				PLUGIN_NAME ": replay attack payload missing timestamp or nonce for %s topic %s", id, topic);
			sb_free(&fingerprint);
			return false;
		}
		double time = message_time(timestamp);
		if (isnan(time)) {
			mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": replay attack invalid timestamp for %s topic %s", id, topic);
			sb_free(&fingerprint);
			return false;
		}
		if (fabs((double)now - time) > rc->max_skew_seconds * 1000) {
			mosquitto_log_printf(MOSQ_LOG_WARNING,
				PLUGIN_NAME ": replay attack timestamp out of skew for %s topic %s", id, topic);
			sb_free(&fingerprint);
			return false;
		}
		js_to_string(nonce, &fingerprint);
	} else {
		unsigned char digest[EVP_MAX_MD_SIZE];
		unsigned int length = 0;
		char hex[EVP_MAX_MD_SIZE * 2 + 1] = "";
		static const char empty = '\0';
		EVP_Digest(payload_length ? payload : &empty, payload_length, digest, &length, EVP_sha256(), NULL);
		for (unsigned int i = 0; i < length; i++) snprintf(hex + i * 2, 3, "%02x", digest[i]);
		sb_append(&fingerprint, hex);
	}
	if (fingerprint.failed) {
		sb_free(&fingerprint);
		return false;
	}

	if (now - last_replay_cache_cleanup >= 60000) {
		last_replay_cache_cleanup = now;
		table_prune(&replay_cache, replay_expired, now, window_ms);
	}
	struct table_entry *seen = table_find(&replay_cache, fingerprint.data);
	if (seen && now - seen->seen_at < window_ms) {
		mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": replay attack blocked for %s topic %s", id, topic);
		sb_free(&fingerprint);
		return false;
	}
	if (!array_contains_string(rc->ignore_topics, topic)) {
		struct table_entry *entry = table_get_or_add(&replay_cache, fingerprint.data);
		if (entry) entry->seen_at = now;
	}
	sb_free(&fingerprint);
	return true;
}

/* ------------------------------------------------------------------------ */
/* ACL                                                                       */
/* ------------------------------------------------------------------------ */

static bool authorize_topic(struct mosquitto *client, const char *topic, const char *action)
{
	const char *client_id = non_empty(mosquitto_client_id(client));
	const char *username = non_empty(mosquitto_client_username(client));

	if (!config.enable_acl) {
		if (strcmp(action, "publish") == 0) return username != NULL;
		/* client.user == topic.split('/')[1] */
		const char *slash = topic ? strchr(topic, '/') : NULL;
		if (!username || !slash) return false;
		const char *segment = slash + 1;
		size_t length = strcspn(segment, "/");
		return strlen(username) == length && strncmp(segment, username, length) == 0;
	}

	cJSON *value = read_json_file(config.acl_path, "ACL file");
	if (!value) return false;

	const char *identity = client_id ? client_id : username;
	const cJSON *patterns = NULL;
	cJSON *rules = get_item(value, "rules");
	if (identity && cJSON_IsArray(rules)) {
		/* The last matching rule wins. */
		for (cJSON *rule = rules->child; rule; rule = rule->next) {
			const char *rule_client = get_string(rule, "clientId");
			const char *rule_user = get_string(rule, "username");
			if ((rule_client && strcmp(rule_client, identity) == 0) || (rule_user && strcmp(rule_user, identity) == 0)) {
				cJSON *list = get_item(rule, action);
				patterns = cJSON_IsArray(list) ? list : NULL;
			}
		}
	}
	bool allowed = false;
	if (patterns) {
		for (cJSON *pattern = patterns->child; pattern && !allowed; pattern = pattern->next) {
			allowed = topic_matches(pattern, topic);
		}
	}
	cJSON_Delete(value);
	return allowed;
}

static bool authorize_publish(struct mosquitto *client, const char *topic, const void *payload, uint32_t length)
{
	cJSON *data = NULL;
	bool parsed = false;

	if (config.enable_message_authentication && topic) {
		cJSON *auth = read_json_file(config.auth_path, "Message auth config");
		if (!auth) return false;
		data = parse_payload(payload, length);
		parsed = true;
		bool authenticated = verify_message_authentication(client, topic, data, auth);
		cJSON_Delete(auth);
		if (!authenticated) {
			const char *id = non_empty(mosquitto_client_id(client));
			mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": message authentication failed for %s topic %s",
				id ? id : mosquitto_client_username(client), topic);
			cJSON_Delete(data);
			return false;
		}
	}

	if (config.enable_attack && topic) {
		struct replay_config rc = {0};
		load_replay_config(&rc);
		if (!parsed) data = parse_payload(payload, length);
		bool fresh = verify_replay_protection(client, topic, payload, length, data, &rc);
		cJSON_Delete(rc.root);
		if (!fresh) {
			cJSON_Delete(data);
			return false;
		}
	}
	cJSON_Delete(data);
	return authorize_topic(client, topic, "publish");
}

static int on_acl_check(int event, void *event_data, void *userdata)
{
	struct mosquitto_evt_acl_check *ed = event_data;
	(void)event;
	(void)userdata;

	switch (ed->access) {
		case MOSQ_ACL_SUBSCRIBE:
			/* Refused subscriptions get SUBACK 0x80, the client stays connected. */
			return authorize_topic(ed->client, ed->topic, "subscribe") ? MOSQ_ERR_SUCCESS : MOSQ_ERR_ACL_DENIED;
		case MOSQ_ACL_WRITE:
			if (authorize_publish(ed->client, ed->topic, ed->payload, ed->payloadlen)) return MOSQ_ERR_SUCCESS;
			if (config.disconnect_on_denied_publish) queue_kick(mosquitto_client_id(ed->client));
			return MOSQ_ERR_ACL_DENIED;
		default:
			/* MqttBroker1885.js does not check message delivery or unsubscribe. */
			return MOSQ_ERR_SUCCESS;
	}
}

static int on_tick(int event, void *event_data, void *userdata)
{
	(void)event;
	(void)event_data;
	(void)userdata;
	run_pending_kicks(true);
	return MOSQ_ERR_SUCCESS;
}

/* ------------------------------------------------------------------------ */
/* Plugin entry points                                                       */
/* ------------------------------------------------------------------------ */

static void free_config(void)
{
	char **paths[] = {&config.server_cert_path, &config.device_certs_path, &config.acl_path, &config.client_ids_path,
		&config.auth_path, &config.users_path, &config.brute_force_path, &config.replay_path};
	for (size_t i = 0; i < sizeof(paths) / sizeof(paths[0]); i++) {
		free(*paths[i]);
		*paths[i] = NULL;
	}
}

static bool parse_bool(const char *value, bool *out)
{
	if (ascii_iequals(value, "true")) *out = true;
	else if (ascii_iequals(value, "false")) *out = false;
	else return false;
	return true;
}

/* Refuse to start with a server certificate the devices cannot use. */
static bool check_server_certificate(void)
{
	FILE *file = fopen(config.server_cert_path, "rb");
	if (!file) {
		mosquitto_log_printf(MOSQ_LOG_ERR, PLUGIN_NAME ": cannot open server certificate %s", config.server_cert_path);
		return false;
	}
	X509 *certificate = PEM_read_X509(file, NULL, NULL, NULL);
	fclose(file);
	bool valid = certificate && is_ecdsa_p256(certificate);
	if (certificate) X509_free(certificate);
	if (!valid) {
		mosquitto_log_printf(MOSQ_LOG_ERR,
			PLUGIN_NAME ": enable_ecdsa requires an ECDSA P-256 server certificate at %s (run certs/generate_ecdsa_certs.ps1)",
			config.server_cert_path);
	}
	return valid;
}

int mosquitto_plugin_version(int supported_version_count, const int *supported_versions)
{
	for (int i = 0; i < supported_version_count; i++) {
		if (supported_versions[i] == 5) return 5;
	}
	return -1;
}

int mosquitto_plugin_init(mosquitto_plugin_id_t *identifier, void **userdata, struct mosquitto_opt *options,
	int option_count)
{
	const char *broker_dir = "../mqttBroker";
	const char *server_cert = NULL;
	struct {
		const char *key;
		bool *target;
	} flags[] = {
		{"enable_tls_certificate", &config.enable_tls_certificate},
		{"enable_ecdsa", &config.enable_ecdsa},
		{"enable_acl", &config.enable_acl},
		{"enable_attack", &config.enable_attack},
		{"enable_client_id", &config.enable_client_id},
		{"enable_message_authentication", &config.enable_message_authentication},
		{"enable_brute_force", &config.enable_brute_force},
		{"disconnect_on_denied_publish", &config.disconnect_on_denied_publish},
	};
	(void)userdata;

	memset(&config, 0, sizeof(config));
	config.enable_tls_certificate = true;
	config.enable_ecdsa = true;
	config.enable_acl = true;
	config.enable_attack = true;
	config.disconnect_on_denied_publish = true;

	for (int i = 0; i < option_count; i++) {
		const char *key = options[i].key;
		const char *value = options[i].value ? options[i].value : "";
		bool known = false;
		if (strcmp(key, "broker_dir") == 0) {
			broker_dir = value;
			known = true;
		} else if (strcmp(key, "server_cert") == 0) {
			server_cert = value;
			known = true;
		}
		for (size_t f = 0; f < sizeof(flags) / sizeof(flags[0]) && !known; f++) {
			if (strcmp(key, flags[f].key) == 0) {
				if (!parse_bool(value, flags[f].target)) {
					mosquitto_log_printf(MOSQ_LOG_ERR, PLUGIN_NAME ": plugin_opt_%s must be true or false", key);
					return MOSQ_ERR_INVAL;
				}
				known = true;
			}
		}
		if (!known) mosquitto_log_printf(MOSQ_LOG_WARNING, PLUGIN_NAME ": unknown option plugin_opt_%s", key);
	}

	config.server_cert_path = server_cert ? xstrdup(server_cert) : join_path(broker_dir, "certs/server.crt");
	config.device_certs_path = join_path(broker_dir, "mqtt_device_certs.json");
	config.acl_path = join_path(broker_dir, "mqtt_acl.json");
	config.client_ids_path = join_path(broker_dir, "mqtt_client_ids.json");
	config.auth_path = join_path(broker_dir, "mqtt_message_auth.json");
	config.users_path = join_path(broker_dir, "mqtt_users.json");
	config.brute_force_path = join_path(broker_dir, "mqtt_bruteforce.json");
	config.replay_path = join_path(broker_dir, "mqtt_replay.json");
	if (!config.server_cert_path || !config.device_certs_path || !config.acl_path || !config.client_ids_path ||
		!config.auth_path || !config.users_path || !config.brute_force_path || !config.replay_path) {
		free_config();
		return MOSQ_ERR_NOMEM;
	}

	if (config.enable_ecdsa && !check_server_certificate()) {
		free_config();
		return MOSQ_ERR_INVAL;
	}

	plugin_id = identifier;
	int rc = mosquitto_callback_register(plugin_id, MOSQ_EVT_BASIC_AUTH, on_basic_auth, NULL, NULL);
	if (rc == MOSQ_ERR_SUCCESS) rc = mosquitto_callback_register(plugin_id, MOSQ_EVT_ACL_CHECK, on_acl_check, NULL, NULL);
	if (rc == MOSQ_ERR_SUCCESS) rc = mosquitto_callback_register(plugin_id, MOSQ_EVT_TICK, on_tick, NULL, NULL);
	if (rc != MOSQ_ERR_SUCCESS) {
		free_config();
		return rc;
	}

	mosquitto_log_printf(MOSQ_LOG_INFO,
		PLUGIN_NAME ": loaded (broker_dir=%s, mTLS=%d, ECDSA=%d, ACL=%d, replay=%d, clientId=%d, HMAC=%d, bruteForce=%d)",
		broker_dir, config.enable_tls_certificate, config.enable_ecdsa, config.enable_acl, config.enable_attack,
		config.enable_client_id, config.enable_message_authentication, config.enable_brute_force);
	return MOSQ_ERR_SUCCESS;
}

int mosquitto_plugin_cleanup(void *userdata, struct mosquitto_opt *options, int option_count)
{
	(void)userdata;
	(void)options;
	(void)option_count;
	if (plugin_id) {
		mosquitto_callback_unregister(plugin_id, MOSQ_EVT_BASIC_AUTH, on_basic_auth, NULL);
		mosquitto_callback_unregister(plugin_id, MOSQ_EVT_ACL_CHECK, on_acl_check, NULL);
		mosquitto_callback_unregister(plugin_id, MOSQ_EVT_TICK, on_tick, NULL);
	}
	run_pending_kicks(false);
	table_clear(&brute_force_state);
	table_clear(&replay_cache);
	free_config();
	return MOSQ_ERR_SUCCESS;
}
