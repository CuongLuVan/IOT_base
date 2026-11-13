const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * Device certificates signed with the CA in MQTT_PKI_DIR (ca.crt + ca.key),
 * shared by saveCertificateMqtt (new device) and certRenewal.js (same key,
 * new validity period).
 *
 * Environment:
 *  MQTT_CERT_VALID_DAYS   validity of issued device certificates (default 3650)
 */

const DEFAULT_VALID_DAYS = 3650;

function validDays() {
    const days = Number(process.env.MQTT_CERT_VALID_DAYS || DEFAULT_VALID_DAYS);
    return Number.isInteger(days) && days >= 1 && days <= 36500 ? days : DEFAULT_VALID_DAYS;
}

function runOpenSSL(args) {
    return execFileSync('openssl', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 1024 * 1024,
    });
}

// Keeps only the requested PEM block, so files and API responses hold no
// openssl text such as "Bag Attributes" or EC PARAMETERS.
function cleanPem(text, label) {
    const pattern = new RegExp('-----BEGIN ' + label + '-----[\\s\\S]+?-----END ' + label + '-----');
    const block = String(text).match(pattern);
    if (!block) {
        throw new Error('No ' + label + ' PEM block found.');
    }
    return block[0].split(/\r?\n/).map(function(line) { return line.trim(); })
        .filter(Boolean).join('\n') + '\n';
}

/**
 * Signs a client certificate (CN = mqttId, clientAuth) for the private key in
 * keyPath and returns the PEM. Temporary CSR / extension files are removed.
 */
function signDeviceCertificate(pkiDir, mqttId, keyPath, days) {
    const stamp = process.pid + '.' + crypto.randomBytes(6).toString('hex');
    const csrPath = path.join(pkiDir, mqttId + '.' + stamp + '.csr');
    const extPath = path.join(pkiDir, mqttId + '.' + stamp + '.ext');
    try {
        fs.writeFileSync(extPath, [
            'basicConstraints=critical,CA:FALSE',
            'keyUsage=critical,digitalSignature',
            'extendedKeyUsage=clientAuth',
            'subjectKeyIdentifier=hash',
            'authorityKeyIdentifier=keyid,issuer',
            '',
        ].join('\n'), { encoding: 'ascii', mode: 0o600 });
        runOpenSSL(['req', '-new', '-key', keyPath, '-out', csrPath, '-subj', '/CN=' + mqttId]);
        return cleanPem(runOpenSSL([
            'x509', '-req', '-in', csrPath,
            '-CA', path.join(pkiDir, 'ca.crt'), '-CAkey', path.join(pkiDir, 'ca.key'),
            '-set_serial', '0x' + crypto.randomBytes(16).toString('hex'),
            '-days', String(days || validDays()), '-sha256', '-extfile', extPath,
        ]), 'CERTIFICATE');
    } finally {
        fs.rmSync(csrPath, { force: true });
        fs.rmSync(extPath, { force: true });
    }
}

// "CN=Local MQTT CA\nO=..." (Node X509Certificate.subject) -> "/CN=Local MQTT CA/O=..."
function subjectArgument(subject) {
    return String(subject).split('\n').filter(Boolean)
        .map(function(part) { return '/' + part.replace(/\\/g, '\\\\').replace(/\//g, '\\/'); }).join('');
}

// "DNS:localhost, IP Address:127.0.0.1" (Node) -> "DNS:localhost,IP:127.0.0.1" (openssl).
function subjectAltNameArgument(subjectAltName) {
    return String(subjectAltName || '').split(',').map(function(item) { return item.trim(); }).filter(Boolean)
        .map(function(item) { return item.replace(/^IP Address:/, 'IP:'); }).join(',');
}

function withTempFiles(pkiDir, files, task) {
    const stamp = process.pid + '.' + crypto.randomBytes(6).toString('hex');
    const paths = {};
    try {
        Object.keys(files).forEach(function(name) {
            paths[name] = path.join(pkiDir, 'tmp-' + stamp + '-' + name);
            fs.writeFileSync(paths[name], files[name], { encoding: 'utf8', mode: 0o600 });
        });
        return task(paths);
    } finally {
        Object.keys(paths).forEach(function(name) { fs.rmSync(paths[name], { force: true }); });
    }
}

/**
 * Re-issues ca.crt with the SAME key and subject (same subjectKeyIdentifier):
 * every certificate signed before stays valid under it, so devices and the
 * broker can switch to it at any time. Returns the PEM.
 */
function renewCaCertificate(pkiDir, days) {
    const current = new crypto.X509Certificate(fs.readFileSync(path.join(pkiDir, 'ca.crt')));
    const config = [
        '[req]', 'distinguished_name = dn', 'x509_extensions = v3_ca', 'prompt = no', '[dn]', 'CN = placeholder',
        '[v3_ca]', 'basicConstraints = critical,CA:TRUE', 'keyUsage = critical,keyCertSign,cRLSign',
        'subjectKeyIdentifier = hash', '',
    ].join('\n');
    const pem = withTempFiles(pkiDir, { cnf: config }, function(paths) {
        return cleanPem(runOpenSSL([
            'req', '-x509', '-new', '-config', paths.cnf, '-key', path.join(pkiDir, 'ca.key'),
            '-subj', subjectArgument(current.subject), '-days', String(days), '-sha256',
            '-set_serial', '0x' + crypto.randomBytes(16).toString('hex'),
        ]), 'CERTIFICATE');
    });
    const renewed = new crypto.X509Certificate(pem);
    const der = function(certificate) { return certificate.publicKey.export({ type: 'spki', format: 'der' }); };
    if (!der(renewed).equals(der(current)) || renewed.subject !== current.subject || !renewed.ca) {
        throw new Error('Renewed CA does not keep the CA key / subject.');
    }
    return pem;
}

/**
 * Signs a new broker certificate for the public key of currentPem, with the
 * same subject and subjectAltName (OpenSSL 3: x509 -new -force_pubkey, so the
 * broker's private key never leaves the broker). Returns the PEM.
 */
function renewServerCertificate(pkiDir, currentPem, days) {
    const current = new crypto.X509Certificate(currentPem);
    const ext = [
        'basicConstraints = critical,CA:FALSE',
        'keyUsage = critical,digitalSignature',
        'extendedKeyUsage = serverAuth',
        'subjectKeyIdentifier = hash',
        'authorityKeyIdentifier = keyid,issuer',
    ];
    const san = subjectAltNameArgument(current.subjectAltName);
    if (san) ext.push('subjectAltName = ' + san);
    return withTempFiles(pkiDir, {
        pub: current.publicKey.export({ type: 'spki', format: 'pem' }),
        ext: ext.join('\n') + '\n',
    }, function(paths) {
        return cleanPem(runOpenSSL([
            'x509', '-new', '-force_pubkey', paths.pub, '-subj', subjectArgument(current.subject),
            '-CA', path.join(pkiDir, 'ca.crt'), '-CAkey', path.join(pkiDir, 'ca.key'),
            '-set_serial', '0x' + crypto.randomBytes(16).toString('hex'),
            '-days', String(days), '-sha256', '-extfile', paths.ext,
        ]), 'CERTIFICATE');
    });
}

/** { validTo: Date, fingerprint256 } of a PEM certificate. */
function describeCertificate(pem) {
    const certificate = new crypto.X509Certificate(pem);
    return { validTo: new Date(certificate.validTo), fingerprint256: certificate.fingerprint256 };
}

module.exports = {
    validDays,
    runOpenSSL,
    cleanPem,
    signDeviceCertificate,
    renewCaCertificate,
    renewServerCertificate,
    describeCertificate,
};
