const knex = require('../config/knex.js');
const { returnNotAuthen, returnOKCustom } = require('../utils/returnResponse.js');
const WarningInfo = require('../config/warningInfo.js');
const {
  createAccessSession,
  createRefreshSession,
  hashToken,
  revokeAccessSession
} = require('../services/authToken.service.js');

function sendAuthError(res, message) {
  return returnNotAuthen(res, { success: false, message }, WarningInfo.EXPRIED_LOGIN);
}

exports.refresh = async function (req, res) {
  const refreshToken = req.body && req.body.refreshToken;
  if (typeof refreshToken !== 'string' || refreshToken.length < 64) {
    return sendAuthError(res, 'Refresh token is required');
  }
  try {
    const result = await knex.transaction(async (trx) => {
      const oldSession = await trx('auth_refresh_tokens')
        .where({ token_hash: hashToken(refreshToken) })
        .whereNull('revoked_at')
        .where('expires_at', '>', trx.fn.now())
        .first()
        .forUpdate();
      if (!oldSession) throw new Error('INVALID_REFRESH_TOKEN');

      const access = await createAccessSession({
        tokenType: oldSession.token_type,
        userId: oldSession.user_id,
        permissionId: oldSession.permission_id,
        enterpriseId: oldSession.enterprise_id,
        valueManifest: oldSession.value_manifest
      }, trx);
      const nextRefresh = await createRefreshSession({
        tokenType: oldSession.token_type,
        userId: oldSession.user_id,
        permissionId: oldSession.permission_id,
        enterpriseId: oldSession.enterprise_id,
        valueManifest: oldSession.value_manifest,
        sessionId: access.sessionId
      }, trx);
      await trx('auth_refresh_tokens').where({ id: oldSession.id }).update({
        revoked_at: trx.fn.now(),
        replaced_by_hash: nextRefresh.refreshTokenHash,
        last_used_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });
      await revokeAccessSession(oldSession.token_type, oldSession.session_id, trx);
      return { access, refresh: nextRefresh };
    });
    return returnOKCustom(res, {
      success: true,
      token: result.access.accessToken,
      accessToken: result.access.accessToken,
      refreshToken: result.refresh.refreshToken,
      expiresIn: '15m'
    });
  } catch (err) {
    return sendAuthError(res, 'Invalid, expired, or already used refresh token');
  }
};

exports.logout = async function (req, res) {
  try {
    await knex.transaction(async (trx) => {
      const tokenType = req.auth.type;
      await revokeAccessSession(tokenType, req.auth.jti, trx);
      await trx('auth_refresh_tokens').where({
        session_id: req.auth.jti,
        user_id: Number(req.auth.sub),
        token_type: tokenType
      }).whereNull('revoked_at').update({
        revoked_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });
      if (req.body && typeof req.body.refreshToken === 'string') {
        await trx('auth_refresh_tokens').where({
          token_hash: hashToken(req.body.refreshToken),
          user_id: Number(req.auth.sub),
          token_type: tokenType
        }).update({ revoked_at: trx.fn.now(), updated_at: trx.fn.now() });
      }
    });
    return returnOKCustom(res, { success: true });
  } catch (err) {
    return sendAuthError(res, 'Unable to revoke session');
  }
};

exports.logoutAll = async function (req, res) {
  try {
    await knex.transaction(async (trx) => {
      const tokenType = req.auth.type;
      const userId = Number(req.auth.sub);
      await trx('auth_refresh_tokens').where({ user_id: userId, token_type: tokenType })
        .whereNull('revoked_at')
        .update({ revoked_at: trx.fn.now(), updated_at: trx.fn.now() });
      const accessTable = tokenType === 'customer' ? 'oauthen2customer' : 'oauthen2';
      const userColumn = tokenType === 'customer' ? 'customeid' : 'userid';
      await trx(accessTable).where(userColumn, userId).where({ deleteflag: 0 })
        .update({ deleteflag: 1, updated_at: trx.fn.now() });
    });
    return returnOKCustom(res, { success: true });
  } catch (err) {
    return sendAuthError(res, 'Unable to revoke sessions');
  }
};