const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const knex = require('../../config/knex.js');

/**
 * Delivers the device configuration created by saveCertificateMqtt to the MQTT
 * broker, and its revocation when the device is deleted. The mqtt_microservice
 * table is the source of truth (outbox); the broker files are a copy that is
 * (re)written until the row reaches a final state.
 *
 * broker_sync_status:
 *   NULL            row not managed here (devices registered without certificate)
 *   pending         to add/update on the broker
 *   synced          broker has the device
 *   revoke_pending  device deleted, to remove from the broker
 *   revoked         broker no longer knows the device
 *
 * Transports:
 *  - remote: MQTT_BROKER_ADMIN_URL set -> mqttBroker/BrokerAdminApi.js over
 *    HTTPS + mTLS (web_manager client certificate). Broker on another server.
 *  - local:  MQTT_BROKER_ADMIN_URL empty -> write the JSON files in
 *    MQTT_BROKER_DIR (default: parent of MQTT_PKI_DIR), as before.
 *
 * Environment: see web_manager/.env.sample (section "MQTT broker provisioning").
 */

const TABLE = 'mqtt_microservice';
const STATUS = {
    PENDING: 'pending',
    SYNCED: 'synced',
    REVOKE_PENDING: 'revoke_pending',
    REVOKED: 'revoked',
};
const MANAGED_STATUSES = [STATUS.PENDING, STATUS.SYNCED];

function getPkiDirectory() {
    const dir = process.env.MQTT_PKI_DIR || process.env.MQTT_CERTS;
    if (!dir) {
        throw new Error('MQTT_PKI_DIR / MQTT_CERTS is not configured.');
    }
    return path.resolve(dir);
}

function isRemote() {
    return Boolean((process.env.MQTT_BROKER_ADMIN_URL || '').trim());
}

/** True when the row's device was provisioned on the broker by this service. */
function isManaged(row) {
    return Boolean(row) && MANAGED_STATUSES.indexOf(row.broker_sync_status) !== -1;
}

function topics(value) {
    return value ? [String(value)] : [];
}

function buildClient(row) {
    const certificate = fs.readFileSync(path.join(getPkiDirectory(), row.mqtt_id + '.crt'), 'utf8');
    return {
        clientId: row.mqtt_id,
        username: row.mqtt_user,
        password: row.mqtt_pass,
        label: row.content || '',
        publish: topics(row.mqtt_pub),
        subscribe: topics(row.mqtt_sub),
        messageAuthKey: row.message_auth_key,
        certificate,
        fingerprint256: new crypto.X509Certificate(certificate).fingerprint256,
    };
}

/* ---------------------------- remote transport --------------------------- */

function readCredential(envName, fileName) {
    const file = process.env[envName] ||
        (process.env.MQTT_CERTS ? path.join(process.env.MQTT_CERTS, fileName) : '');
    if (!file || !fs.existsSync(file)) {
        throw new Error('Missing broker admin TLS file: set ' + envName + ' or MQTT_CERTS.');
    }
    return fs.readFileSync(file);
}

let agent = null;
function getAgent() {
    if (!agent) {
        const clientId = process.env.MQTT_CLIENT_ID || 'web_manager';
        agent = new https.Agent({
            keepAlive: true,
            maxSockets: 4,
            ca: readCredential('MQTT_CA_CERT', 'ca.crt'),
            cert: readCredential('MQTT_CLIENT_CERT', clientId + '.crt'),
            key: readCredential('MQTT_CLIENT_KEY', clientId + '.key'),
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2',
        });
    }
    return agent;
}

function requestBroker(method, urlPath, body) {
    return new Promise(function(resolve, reject) {
        const url = new URL(urlPath, process.env.MQTT_BROKER_ADMIN_URL);
        if (url.protocol !== 'https:') {
            reject(new Error('MQTT_BROKER_ADMIN_URL must use https.'));
            return;
        }
        const payload = body ? Buffer.from(JSON.stringify(body)) : null;
        const req = https.request(url, {
            method,
            agent: getAgent(),
            servername: process.env.MQTT_BROKER_ADMIN_SERVERNAME || undefined,
            timeout: Number(process.env.MQTT_BROKER_ADMIN_TIMEOUT_MS || 5000),
            headers: payload ? {
                'Content-Type': 'application/json',
                'Content-Length': payload.length,
            } : {},
        }, function(res) {
            const chunks = [];
            let size = 0;
            res.on('data', function(chunk) {
                size += chunk.length;
                if (size <= 64 * 1024) chunks.push(chunk);
            });
            res.on('end', function() {
                let data = {};
                try { data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { /* not JSON */ }
                if (res.statusCode >= 200 && res.statusCode < 300 && data.ok !== false) {
                    resolve(data);
                } else {
                    const error = new Error('Broker admin API ' + res.statusCode + ': ' + (data.error || 'request failed'));
                    // 4xx: the request itself is wrong, retrying will not help.
                    error.permanent = res.statusCode >= 400 && res.statusCode < 500;
                    reject(error);
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', function() { req.destroy(new Error('Broker admin API timeout.')); });
        req.on('error', function(error) {
            reject(new Error('Broker admin API unreachable: ' + (error.message || error.code || 'network error')));
        });
        req.end(payload);
    });
}

function clientUrl(clientId) {
    return '/v1/clients/' + encodeURIComponent(clientId);
}

async function pushRemote(client) {
    const result = await requestBroker('PUT', clientUrl(client.clientId), {
        username: client.username,
        password: client.password,
        label: client.label,
        publish: client.publish,
        subscribe: client.subscribe,
        messageAuthKey: client.messageAuthKey,
        certificate: client.certificate,
    });
    if (String(result.fingerprint256 || '').toLowerCase() !== client.fingerprint256.toLowerCase()) {
        throw new Error('Broker stored a different certificate fingerprint.');
    }
}

function revokeRemote(clientId) {
    return requestBroker('DELETE', clientUrl(clientId));
}

/* ----------------------------- local transport --------------------------- */

// Same order and rules as mqttBroker/BrokerAdminApi.js.
const LOCAL_FILES = [
    { key: 'acl', file: 'mqtt_acl.json', array: 'rules' },
    { key: 'messageAuth', file: 'mqtt_message_auth.json', object: 'keys' },
    { key: 'users', file: 'mqtt_users.json', array: 'users' },
    { key: 'deviceCerts', file: 'mqtt_device_certs.json', array: 'devices' },
    { key: 'clientIds', file: 'mqtt_client_ids.json', array: 'clients' },
];

function upsert(entries, key, id, value) {
    const index = entries.findIndex(function(entry) { return entry && entry[key] === id; });
    if (index === -1) {
        entries.push(value);
    } else {
        entries[index] = Object.assign({}, entries[index], value);
    }
}

function removeWhere(entries, predicate) {
    for (let index = entries.length - 1; index >= 0; index--) {
        if (entries[index] && predicate(entries[index])) entries.splice(index, 1);
    }
}

function updateLocalFiles(writeOrder, mutate) {
    const brokerDir = path.resolve(process.env.MQTT_BROKER_DIR || path.dirname(getPkiDirectory()));
    const originals = {};
    const settings = {};
    LOCAL_FILES.forEach(function(item) {
        const filePath = path.join(brokerDir, item.file);
        originals[item.key] = fs.readFileSync(filePath, 'utf8');
        const value = JSON.parse(originals[item.key]);
        const container = value && (item.array ? value[item.array] : value[item.object]);
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
            (item.array && !Array.isArray(container)) ||
            (item.object && (!container || typeof container !== 'object' || Array.isArray(container)))) {
            throw new Error('Invalid MQTT broker configuration: ' + item.file);
        }
        settings[item.key] = value;
    });

    mutate(settings);

    const replaced = [];
    try {
        writeOrder.forEach(function(item) {
            const filePath = path.join(brokerDir, item.file);
            const next = JSON.stringify(settings[item.key], null, 2) + '\n';
            if (next === originals[item.key]) return;
            const tempPath = filePath + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
            fs.writeFileSync(tempPath, next, { encoding: 'utf8', mode: 0o600 });
            try {
                fs.renameSync(tempPath, filePath);
            } finally {
                fs.rmSync(tempPath, { force: true });
            }
            replaced.push(item);
        });
    } catch (error) {
        replaced.reverse().forEach(function(item) {
            fs.writeFileSync(path.join(brokerDir, item.file), originals[item.key], { encoding: 'utf8', mode: 0o600 });
        });
        throw error;
    }
}

function writeLocal(client) {
    updateLocalFiles(LOCAL_FILES, function(settings) {
        upsert(settings.acl.rules, 'clientId', client.clientId, {
            clientId: client.clientId, publish: client.publish, subscribe: client.subscribe,
        });
        settings.messageAuth.keys[client.clientId] = client.messageAuthKey;
        upsert(settings.users.users, 'username', client.username, {
            username: client.username, password: client.password,
        });
        upsert(settings.deviceCerts.devices, 'clientId', client.clientId, {
            clientId: client.clientId, fingerprint256: client.fingerprint256,
        });
        upsert(settings.clientIds.clients, 'clientId', client.clientId, {
            clientId: client.clientId, username: client.username, label: client.label,
        });
    });
}

function revokeLocal(clientId) {
    const protectedName = process.env.MQTT_CLIENT_ID || 'web_manager';
    updateLocalFiles(LOCAL_FILES.slice().reverse(), function(settings) {
        const clients = settings.clientIds.clients;
        const usernames = clients
            .filter(function(entry) { return entry && entry.clientId === clientId && entry.username; })
            .map(function(entry) { return entry.username; });
        removeWhere(clients, function(entry) { return entry.clientId === clientId; });
        removeWhere(settings.deviceCerts.devices, function(entry) { return entry.clientId === clientId; });
        removeWhere(settings.acl.rules, function(entry) { return entry.clientId === clientId; });
        delete settings.messageAuth.keys[clientId];
        usernames.forEach(function(username) {
            const stillUsed = username === protectedName ||
                clients.some(function(entry) { return entry && entry.username === username; });
            if (!stillUsed) {
                removeWhere(settings.users.users, function(entry) { return entry.username === username; });
            }
        });
    });
}

/* ------------------------------ revocation ------------------------------- */

/**
 * Moves <id>.crt/.key/.esp.key of a revoked device to <PKI>/revoked/, so the
 * private keys are no longer served by getCertificateMqtt and the mqtt_id can
 * be issued again. Returns the archive folder, or null when nothing was moved.
 */
function archiveCertificates(mqttId) {
    const pkiDir = getPkiDirectory();
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');
    const archiveDir = path.join(pkiDir, 'revoked', mqttId + '-' + stamp);
    let moved = 0;
    ['.crt', '.key', '.esp.key'].forEach(function(extension) {
        const source = path.join(pkiDir, mqttId + extension);
        if (!fs.existsSync(source)) return;
        fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
        fs.renameSync(source, path.join(archiveDir, mqttId + extension));
        moved++;
    });
    return moved ? archiveDir : null;
}

/**
 * Values to merge into the soft-delete UPDATE of a mqtt_microservice row, so
 * the revocation is recorded in the same statement as the deletion.
 */
function revokeUpdateFields(row) {
    return isManaged(row) ? { broker_sync_status: STATUS.REVOKE_PENDING, broker_sync_error: null } : {};
}

/**
 * Call after the row was soft deleted with revokeUpdateFields(): archives the
 * certificate and removes the device from the broker (retried by the worker
 * on failure). Returns { revoked: bool|null, brokerSynced: bool }.
 */
async function afterDelete(row) {
    if (!isManaged(row)) {
        return { revoked: null, brokerSynced: false };
    }
    try {
        archiveCertificates(row.mqtt_id);
    } catch (error) {
        console.error('Failed to archive MQTT certificate of', row.mqtt_id + ':', error.message);
    }
    const synced = await trySyncRow(Object.assign({}, row, { broker_sync_status: STATUS.REVOKE_PENDING }));
    return { revoked: true, brokerSynced: synced };
}

/* ------------------------------ anti-clone ------------------------------- */
// mqttBroker/antiClone.js quarantines an identity used by two devices. The
// broker owns mqtt_anticlone_state.json; a release is requested through
// mqtt_anticlone_reset.json (BrokerAdminApi.js in remote mode).

function localBrokerFile(name) {
    return path.join(path.resolve(process.env.MQTT_BROKER_DIR || path.dirname(getPkiDirectory())), name);
}

function readLocalJson(name) {
    try {
        const value = JSON.parse(fs.readFileSync(localBrokerFile(name), 'utf8'));
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        throw error;
    }
}

/** { enrolled, quarantine: {reason, at, ip, ...} | null, lastIp }. */
async function antiCloneStatus(mqttId) {
    if (isRemote()) {
        const data = await requestBroker('GET', clientUrl(mqttId) + '/anticlone');
        return { enrolled: Boolean(data.enrolled), quarantine: data.quarantine || null, lastIp: data.lastIp || null };
    }
    const record = (readLocalJson('mqtt_anticlone_state.json').clients || {})[mqttId];
    return {
        enrolled: Boolean(record && record.current),
        quarantine: (record && record.quarantine) || null,
        lastIp: (record && record.lastIp) || null,
    };
}

/**
 * Releases a quarantined identity: the broker forgets its tickets and the
 * next device that connects with it is enrolled again. Only do this once the
 * copy is out of service; otherwise issue a new certificate instead
 * (revokeCertificateMqtt + saveCertificateMqtt).
 */
async function resetAntiClone(mqttId) {
    if (isRemote()) {
        await requestBroker('POST', clientUrl(mqttId) + '/anticlone/reset');
        return;
    }
    const value = readLocalJson('mqtt_anticlone_reset.json');
    value.resets = value.resets && typeof value.resets === 'object' ? value.resets : {};
    value.resets[mqttId] = new Date().toISOString();
    const filePath = localBrokerFile('mqtt_anticlone_reset.json');
    const tempPath = filePath + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    try {
        fs.renameSync(tempPath, filePath);
    } finally {
        fs.rmSync(tempPath, { force: true });
    }
}

/* -------------------------------- sync ----------------------------------- */

function rowQuery(row) {
    return knex(TABLE).where({ mqtt_microservice_id: row.mqtt_microservice_id });
}

async function deliver(row) {
    if (row.broker_sync_status === STATUS.REVOKE_PENDING) {
        if (isRemote()) {
            await revokeRemote(row.mqtt_id);
        } else {
            revokeLocal(row.mqtt_id);
        }
        return STATUS.REVOKED;
    }
    if (!row.message_auth_key) {
        throw Object.assign(new Error('Row has no message_auth_key.'), { permanent: true });
    }
    const client = buildClient(row);
    if (isRemote()) {
        await pushRemote(client);
    } else {
        writeLocal(client);
    }
    return STATUS.SYNCED;
}

/** Delivers one mqtt_microservice row to the broker and records the outcome. */
async function syncRow(row) {
    try {
        const finalStatus = await deliver(row);
        // Only advance the status the row had when we started: if the device
        // was deleted meanwhile, this upsert is stale and the revoke must run.
        const updated = await rowQuery(row)
            .where({ broker_sync_status: row.broker_sync_status })
            .update({
                broker_sync_status: finalStatus,
                broker_synced_at: knex.fn.now(),
                broker_sync_error: null,
            });
        if (!updated && finalStatus === STATUS.SYNCED) {
            await rowQuery(row).where({ broker_sync_status: STATUS.REVOKED })
                .update({ broker_sync_status: STATUS.REVOKE_PENDING });
            throw new Error('Device was revoked during the update; revocation queued again.');
        }
        return true;
    } catch (error) {
        await rowQuery(row).update({
            broker_sync_attempts: knex.raw('COALESCE(broker_sync_attempts, 0) + 1'),
            broker_sync_error: String(error.message || error).slice(0, 255),
        }).catch(function(dbError) {
            console.error('Failed to record MQTT broker sync error:', dbError.message);
        });
        throw error;
    }
}

/** Same as syncRow but never throws; returns true when the broker is up to date. */
async function trySyncRow(row) {
    try {
        return await syncRow(row);
    } catch (error) {
        console.warn('MQTT broker sync pending for', row.mqtt_id + ':', error.message);
        return false;
    }
}

let workerTimer = null;
let workerRunning = false;

async function syncPending() {
    if (workerRunning) return;
    workerRunning = true;
    try {
        const rows = await knex(TABLE)
            .where(function() {
                this.where({ broker_sync_status: STATUS.PENDING, deleteflag: 0 })
                    .orWhere({ broker_sync_status: STATUS.REVOKE_PENDING });
            })
            .orderBy('mqtt_microservice_id')
            .limit(50);
        // Revocations first: cutting access matters more than adding devices.
        rows.sort(function(a, b) {
            return (b.broker_sync_status === STATUS.REVOKE_PENDING) - (a.broker_sync_status === STATUS.REVOKE_PENDING);
        });
        for (const row of rows) {
            try {
                await syncRow(row);
                console.log('MQTT broker', row.broker_sync_status === STATUS.REVOKE_PENDING ? 'revoke' : 'sync',
                    'done for', row.mqtt_id);
            } catch (error) {
                console.warn('MQTT broker sync failed for', row.mqtt_id + ':', error.message);
                // Broker unreachable: stop here and retry the batch next period.
                if (!error.permanent) break;
            }
        }
    } catch (error) {
        console.warn('MQTT broker sync worker:', error.message);
    } finally {
        workerRunning = false;
    }
}

/** Retries rows left "pending" / "revoke_pending" (broker down, network error, ...). */
function startSyncWorker() {
    const interval = Number(process.env.MQTT_BROKER_SYNC_INTERVAL_MS || 30000);
    if (workerTimer || !(interval > 0)) return;
    workerTimer = setInterval(syncPending, interval);
    workerTimer.unref();
    setTimeout(syncPending, 5000).unref();
}

module.exports = {
    STATUS,
    getPkiDirectory,
    isManaged,
    revokeUpdateFields,
    afterDelete,
    antiCloneStatus,
    resetAntiClone,
    syncRow,
    trySyncRow,
    syncPending,
    startSyncWorker,
};
