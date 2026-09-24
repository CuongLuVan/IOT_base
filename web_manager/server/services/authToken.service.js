const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const knex = require('../config/knex.js');

const accessSecret = process.env.JWT_ACCESS_SECRET;
const accessTtl = process.env.JWT_ACCESS_TTL || '15m';
const refreshDays = Number(process.env.JWT_REFRESH_DAYS || 30);

function requireSecret() {
  if (!accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }
  return accessSecret;
}

function createRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(claims) {
  return jwt.sign(claims, requireSecret(), {
    algorithm: 'HS256',
    expiresIn: accessTtl,
    issuer: process.env.JWT_ISSUER || 'iot-manager'
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, requireSecret(), {
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER || 'iot-manager'
  });
}

async function createRefreshSession(data, trx = knex) {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await trx('auth_refresh_tokens').insert({
    token_hash: refreshTokenHash,
    token_type: data.tokenType,
    user_id: data.userId,
    session_id: data.sessionId,
    permission_id: data.permissionId,
    enterprise_id: data.enterpriseId || null,
    value_manifest: data.valueManifest || null,
    expires_at: trx.raw('DATE_ADD(NOW(), INTERVAL ? DAY)', [refreshDays]),
    created_at: trx.fn.now(),
    updated_at: trx.fn.now()
  });
  return { refreshToken, refreshTokenHash };
}

async function createAccessSession(data, trx = knex) {
  const sessionId = data.sessionId || crypto.randomUUID();
  const accessToken = signAccessToken({
    sub: String(data.userId),
    type: data.tokenType,
    jti: sessionId,
    permission_id: data.permissionId,
    enterprise_id: data.enterpriseId || null,
    value_manifest: data.valueManifest || ''
  });
  const tableName = data.tokenType === 'customer' ? 'oauthen2customer' : 'oauthen2';
  const userColumn = data.tokenType === 'customer' ? 'customeid' : 'userid';
  await trx(tableName).insert({
    permission_id: data.permissionId,
    [userColumn]: data.userId,
    tocken: sessionId,
    value_manifest: data.valueManifest || '',
    enterprise_id: data.enterpriseId || null,
    id_updated: data.userId,
    id_created: data.userId,
    deleteflag: 0,
    created_at: trx.fn.now(),
    updated_at: trx.fn.now(),
    time_relase: trx.raw('DATE_ADD(NOW(), INTERVAL 15 MINUTE)')
  });
  return { accessToken, sessionId };
}

module.exports = {
  accessTtl,
  createAccessSession,
  createRefreshSession,
  hashToken,
  revokeAccessSession: async (tokenType, sessionId, trx = knex) => {
    const tableName = tokenType === 'customer' ? 'oauthen2customer' : 'oauthen2';
    await trx(tableName).where({ tocken: sessionId }).update({
      deleteflag: 1,
      updated_at: trx.fn.now()
    });
  },
  signAccessToken,
  verifyAccessToken
};
