const fs = require('fs');
const path = require('path');
const knex = require('../../config/knex.js');
const mqttService = require('./mqttService.js');
const deviceStatus = require('./deviceStatusService.js');
const brokerProvisioning = require('./brokerProvisioning.js');
const certificateAuthority = require('./certificateAuthority.js');

/**
 * Renews device client certificates before they expire, without a new key:
 * web_manager keeps <id>.key, signs a new certificate for it, and the device
 * only receives the certificate (public data) with command com 16.
 *
 *  1. MQTT_CERT_RENEW_BEFORE_DAYS before expiry: sign <id>.next.crt for the
 *     same key, cert_renew_status = 'issued'.
 *  2. Outbox (brokerProvisioning): the broker accepts the current AND the
 *     renewed certificate (nextFingerprint256).
 *  3. Once the broker has it: {"com":16,"crt":"<PEM>","pa":...} to the device,
 *     'sent'. Sent again every MQTT_CERT_RENEW_RESEND_MS, and as soon as an
 *     offline device publishes again.
 *  4. The device checks the certificate against its key, reconnects with it
 *     and stores it in EEPROM only when the broker accepted it, then replies
 *     {"rc":16,"rs":0,"st":2} -> <id>.next.crt becomes <id>.crt (the old one
 *     goes to <PKI>/expired/), the broker drops the old fingerprint.
 *
 * Environment:
 *  MQTT_CERT_VALID_DAYS          validity of issued certificates (default 3650)
 *  MQTT_CERT_RENEW_BEFORE_DAYS   start renewing this many days before expiry (default 180)
 *  MQTT_CERT_RENEW_CHECK_MS      worker period (default 3600000, 0 = off)
 *  MQTT_CERT_RENEW_RESEND_MS     resend com 16 while unanswered (default 21600000)
 */

const TABLE = 'mqtt_microservice';
const STATUS = { ISSUED: 'issued', SENT: 'sent', FAILED: 'failed' };
const COMMAND_CERTIFICATE_RENEW = 16;
const MTLS_CLIENT_CERT_MAX_LENGTH = 767;   // DeviceIOT eeprom_layout.h
const ONLINE_RESEND_MIN_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 3600 * 1000;
// mqttBroker/MqttBroker1885.js CERT_EXPIRY_GRACE_MS: an expired certificate
// under renewal is still accepted this long, so the device can get com 16.
const GRACE_DAYS = 30;
const GRACE_MS = GRACE_DAYS * DAY_MS;

function envNumber(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function renewBeforeMs() {
    return envNumber('MQTT_CERT_RENEW_BEFORE_DAYS', 180) * DAY_MS;
}

function resendMs() {
    return envNumber('MQTT_CERT_RENEW_RESEND_MS', 6 * 3600 * 1000);
}

function certPath(mqttId, suffix) {
    return path.join(brokerProvisioning.getPkiDirectory(), mqttId + suffix);
}

function readPem(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

// One renewal step at a time per device (worker, device replies, API).
const locks = new Map();
function withLock(mqttId, task) {
    const previous = locks.get(mqttId) || Promise.resolve();
    const run = previous.then(task, task);
    const tail = run.catch(function() {});
    locks.set(mqttId, tail);
    tail.then(function() { if (locks.get(mqttId) === tail) locks.delete(mqttId); });
    return run;
}

function rowQuery(row) {
    return knex(TABLE).where({ mqtt_microservice_id: row.mqtt_microservice_id });
}

async function recordError(row, message, status) {
    console.warn('[cert-renewal]', row.mqtt_id + ':', message);
    const update = { cert_renew_error: String(message).slice(0, 255) };
    if (status !== undefined) update.cert_renew_status = status;
    await rowQuery(row).update(update);
}

// A crash between the two file steps of complete() leaves only the renewed
// certificate: finish the promotion.
function repairFiles(mqttId) {
    const current = certPath(mqttId, '.crt');
    const next = certPath(mqttId, '.next.crt');
    if (!fs.existsSync(current) && fs.existsSync(next)) {
        fs.renameSync(next, current);
    }
}

/** Signs <id>.next.crt for the stored key. force: renew now, whatever the expiry date. */
async function issue(row, force) {
    const mqttId = row.mqtt_id;
    const currentPem = readPem(certPath(mqttId, '.crt'));
    const keyPath = certPath(mqttId, '.key');
    if (!currentPem || !fs.existsSync(keyPath)) {
        throw new Error('Certificate or private key of ' + mqttId + ' is missing in MQTT_PKI_DIR.');
    }
    if (fs.existsSync(certPath(mqttId, '.next.crt'))) {
        return false; // already in progress
    }
    const current = certificateAuthority.describeCertificate(currentPem);
    if (!force && current.validTo.getTime() - Date.now() > renewBeforeMs()) {
        return false;
    }
    const pem = certificateAuthority.signDeviceCertificate(brokerProvisioning.getPkiDirectory(), mqttId, keyPath,
        certificateAuthority.validDays());
    if (Buffer.byteLength(pem) > MTLS_CLIENT_CERT_MAX_LENGTH) {
        throw new Error('Renewed certificate is ' + Buffer.byteLength(pem) + ' B; the device region holds ' +
            MTLS_CLIENT_CERT_MAX_LENGTH + ' B.');
    }
    fs.writeFileSync(certPath(mqttId, '.next.crt'), pem, { encoding: 'ascii', flag: 'wx', mode: 0o600 });
    const pending = brokerProvisioning.STATUS.PENDING;
    await rowQuery(row).update({
        cert_renew_status: STATUS.ISSUED,
        cert_renew_sent_at: null,
        cert_renew_attempts: 0,
        cert_renew_error: null,
        broker_sync_status: pending,
    });
    console.log('[cert-renewal]', mqttId + ': renewed certificate issued, valid until',
        certificateAuthority.describeCertificate(pem).validTo.toISOString());
    // The broker must accept the renewed certificate before the device uses it.
    await brokerProvisioning.trySyncRow(Object.assign({}, row, { broker_sync_status: pending }));
    return true;
}

/** com 16 to the device; only once the broker accepts the renewed certificate. */
async function send(row) {
    const pem = readPem(certPath(row.mqtt_id, '.next.crt'));
    if (!pem) {
        throw new Error('No renewed certificate to send.');
    }
    if (row.broker_sync_status !== brokerProvisioning.STATUS.SYNCED) {
        return false;
    }
    await deviceStatus.ensureConnected();
    const watchError = await deviceStatus.watch(row.mqtt_pub);
    if (watchError) {
        throw new Error(watchError);
    }
    await deviceStatus.publishCommand(row, { com: COMMAND_CERTIFICATE_RENEW, crt: pem });
    await rowQuery(row).update({
        cert_renew_status: STATUS.SENT,
        cert_renew_sent_at: new Date(),
        cert_renew_attempts: knex.raw('COALESCE(cert_renew_attempts, 0) + 1'),
    });
    pendingTopics.set(row.mqtt_pub, { mqttId: row.mqtt_id, sentAt: Date.now() });
    console.log('[cert-renewal]', row.mqtt_id + ': renewed certificate sent to the device');
    return true;
}

/** The device stored the renewed certificate: it becomes the current one. */
async function complete(row) {
    const mqttId = row.mqtt_id;
    const current = certPath(mqttId, '.crt');
    const next = certPath(mqttId, '.next.crt');
    if (!fs.existsSync(next)) {
        return false;
    }
    const pki = brokerProvisioning.getPkiDirectory();
    const archiveDir = path.join(pki, 'expired');
    fs.mkdirSync(archiveDir, { recursive: true, mode: 0o700 });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');
    // Copy then replace: there is always a <id>.crt on disk.
    if (fs.existsSync(current)) {
        fs.copyFileSync(current, path.join(archiveDir, mqttId + '-' + stamp + '.crt'));
    }
    fs.renameSync(next, current);
    const renewed = certificateAuthority.describeCertificate(fs.readFileSync(current, 'utf8'));
    const pending = brokerProvisioning.STATUS.PENDING;
    await rowQuery(row).update({
        cert_renew_status: null,
        cert_renew_error: null,
        cert_expires_at: renewed.validTo,
        broker_sync_status: pending,
    });
    pendingTopics.delete(row.mqtt_pub);
    console.log('[cert-renewal]', mqttId + ': renewal complete, certificate valid until', renewed.validTo.toISOString());
    // The broker drops the old fingerprint (retried by the outbox worker).
    await brokerProvisioning.trySyncRow(Object.assign({}, row, { broker_sync_status: pending }));
    return true;
}

function activeRow(where) {
    return knex(TABLE).where(Object.assign({ deleteflag: 0 }, where)).first();
}

/** Runs the next due step of one device. */
async function step(row, options) {
    const force = Boolean(options && options.force);
    repairFiles(row.mqtt_id);
    const currentPem = readPem(certPath(row.mqtt_id, '.crt'));
    if (currentPem && !row.cert_expires_at) {
        await rowQuery(row).update({ cert_expires_at: certificateAuthority.describeCertificate(currentPem).validTo });
    }
    if (!row.cert_renew_status || (force && row.cert_renew_status === STATUS.FAILED)) {
        if (row.cert_renew_status === STATUS.FAILED) {
            // A forced retry starts from a fresh certificate.
            fs.rmSync(certPath(row.mqtt_id, '.next.crt'), { force: true });
        }
        if (!(await issue(row, force))) {
            return 'not-due';
        }
        row = await activeRow({ mqtt_microservice_id: row.mqtt_microservice_id });
    }
    if (row.cert_renew_status === STATUS.ISSUED || row.cert_renew_status === STATUS.SENT) {
        const sentAt = row.cert_renew_sent_at ? new Date(row.cert_renew_sent_at).getTime() : 0;
        if (force || !sentAt || Date.now() - sentAt >= resendMs()) {
            try {
                if (!(await send(row))) return 'waiting-broker';
            } catch (error) {
                await recordError(row, 'Cannot send the renewed certificate: ' + error.message);
                return 'send-failed';
            }
            return 'sent';
        }
        pendingTopics.set(row.mqtt_pub, { mqttId: row.mqtt_id, sentAt: sentAt });
        return 'waiting-device';
    }
    return row.cert_renew_status || 'idle';
}

/**
 * Manual renewal (renewCertificateMqtt): issues now if nothing is in progress
 * and sends com 16 at once. Returns the renewal state of the device.
 */
async function renewNow(mqttId) {
    return withLock(mqttId, async function() {
        const row = await activeRow({ mqtt_id: mqttId });
        if (!row || !brokerProvisioning.isManaged(row)) {
            throw new Error('No active certificate-managed MQTT record for ' + mqttId + '.');
        }
        const result = await step(row, { force: true });
        return Object.assign({ result }, await renewalStatus(mqttId));
    });
}

async function renewalStatus(mqttId) {
    const row = await activeRow({ mqtt_id: mqttId });
    if (!row) return null;
    const next = readPem(certPath(mqttId, '.next.crt'));
    return {
        certificateExpiresAt: row.cert_expires_at || null,
        renewStatus: row.cert_renew_status || null,
        renewSentAt: row.cert_renew_sent_at || null,
        renewAttempts: row.cert_renew_attempts || 0,
        renewError: row.cert_renew_error || null,
        nextCertificateExpiresAt: next ? certificateAuthority.describeCertificate(next).validTo : null,
    };
}

/* ------------------------------ device replies ---------------------------- */

// mqtt_pub -> { mqttId, sentAt } of devices waiting for a renewal answer.
const pendingTopics = new Map();

async function onDeviceReply(row, data) {
    const rs = Number(data.rs);
    const st = Number(data.st);
    if (rs === 0 && st === 2) {
        await complete(row);
    } else if (rs === 0 && st === 1) {
        console.log('[cert-renewal]', row.mqtt_id + ': device is testing the renewed certificate');
        await rowQuery(row).update({ cert_renew_error: null });
    } else if (st === 3) {
        // Broker refused it or the flash write failed: the device kept the
        // old certificate; send again later.
        await recordError(row, 'Device went back to its old certificate (rs ' + rs + ').');
    } else if (rs === 2 || rs === 5) {
        await recordError(row, rs === 2 ? 'Device refused the certificate: it does not match its private key.' :
            'Device does not use a client certificate (mTLS off).', STATUS.FAILED);
        pendingTopics.delete(row.mqtt_pub);
    } else if (rs === 7) {
        await recordError(row, 'Device is still testing a previous renewal.');
    } else {
        await recordError(row, 'Unexpected renewal reply rs ' + rs + ' st ' + st + '.');
    }
}

mqttService.on('message', function(item) {
    const pending = pendingTopics.get(item.topic);
    if (!pending) return;
    let data;
    try { data = JSON.parse(item.payload); } catch (error) { return; }
    if (!data || typeof data !== 'object') return;
    withLock(pending.mqttId, async function() {
        const row = await activeRow({ mqtt_id: pending.mqttId, mqtt_pub: item.topic });
        if (!row || !row.cert_renew_status || row.cert_renew_status === STATUS.FAILED) {
            pendingTopics.delete(item.topic);
            return;
        }
        if (data.rc === COMMAND_CERTIFICATE_RENEW) {
            await onDeviceReply(row, data);
        } else if (Date.now() - pending.sentAt >= ONLINE_RESEND_MIN_MS) {
            // The device is online again (it published): resend now instead of
            // waiting for the resend period; a QoS 0 command sent while it
            // was offline is lost.
            await step(Object.assign({}, row, { cert_renew_sent_at: null }));
        }
    }).catch(function(error) {
        console.warn('[cert-renewal] reply handling failed:', error.message);
    });
});

/* -------------------------------- worker --------------------------------- */

let workerTimer = null;
let workerRunning = false;

async function checkAll() {
    if (workerRunning) return;
    workerRunning = true;
    try {
        const horizon = new Date(Date.now() + renewBeforeMs());
        const rows = await knex(TABLE)
            .where({ deleteflag: 0 })
            .whereIn('broker_sync_status', [brokerProvisioning.STATUS.SYNCED, brokerProvisioning.STATUS.PENDING])
            .where(function() {
                this.whereIn('cert_renew_status', [STATUS.ISSUED, STATUS.SENT])
                    .orWhere(function() {
                        this.whereNull('cert_renew_status').where(function() {
                            this.whereNull('cert_expires_at').orWhere('cert_expires_at', '<=', horizon);
                        });
                    });
            })
            .orderBy('cert_expires_at')
            .limit(100);
        for (const row of rows) {
            try {
                await withLock(row.mqtt_id, function() { return step(row); });
                const expiredMs = row.cert_expires_at ? Date.now() - new Date(row.cert_expires_at).getTime() : -1;
                if (expiredMs > GRACE_MS) {
                    console.error('[cert-renewal]', row.mqtt_id + ': certificate expired more than', GRACE_DAYS,
                        'days ago and the device never took the renewal; provision it again through /setup.');
                } else if (expiredMs > 0) {
                    console.warn('[cert-renewal]', row.mqtt_id + ': certificate expired; the broker still accepts it',
                        'for the renewal during its', GRACE_DAYS, 'day grace period.');
                }
            } catch (error) {
                await recordError(row, error.message).catch(function() {});
            }
        }
    } catch (error) {
        console.warn('[cert-renewal] worker:', error.message);
    } finally {
        workerRunning = false;
    }
}

function startRenewalWorker() {
    const interval = envNumber('MQTT_CERT_RENEW_CHECK_MS', 3600 * 1000);
    if (workerTimer || !(interval > 0)) return;
    workerTimer = setInterval(checkAll, interval);
    workerTimer.unref();
    setTimeout(checkAll, 15000).unref();
}

module.exports = {
    STATUS,
    renewNow,
    renewalStatus,
    checkAll,
    startRenewalWorker,
    // tests
    _step: step,
    _onDeviceReply: onDeviceReply,
    _pendingTopics: pendingTopics,
};
