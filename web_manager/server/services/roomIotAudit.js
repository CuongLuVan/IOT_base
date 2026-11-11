const knex = require('../config/knex.js');

async function writeAudit(req, action, entityType, entityId, beforeData, afterData) {
  const actorId = req.currentUser && Number(req.currentUser.users_id);
  const actorType = req.auth && req.auth.type;
  await knex('audit_logs').insert({
    actor_id: Number.isInteger(actorId) ? actorId : null,
    actor_type: actorType || null,
    action,
    entity_type: entityType,
    entity_id: entityId != null && Number.isInteger(Number(entityId)) ? Number(entityId) : null,
    before_data: beforeData == null ? null : JSON.stringify(beforeData),
    after_data: afterData == null ? null : JSON.stringify(afterData),
    request_id: req.id == null ? null : String(req.id).slice(0, 64),
    ip_address: req.ip == null ? null : String(req.ip).slice(0, 64),
    created_at: knex.fn.now(),
    id_created: Number.isInteger(actorId) ? actorId : null,
    created_by: Number.isInteger(actorId) ? actorId : null,
    created_by_type: actorType || null,
    deleteflag: 0,
    oldid: null
  });
}

module.exports = { writeAudit };
