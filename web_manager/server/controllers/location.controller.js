const knex = require('../config/knex.js');

const { writeAudit } = require('../services/roomIotAudit.js');

function owner(req) { return { id: Number(req.currentUser.users_id), type: req.auth.type }; }
function locationController(table, key, codeKey) {
  return {
    list: async (req, res) => {
      try {
        const query = knex(table).where({ deleteflag: 0 }).orderBy(key, 'desc');
        const who = owner(req);
        query.andWhere(function () {
          if (req.currentUser.enterprise_id != null) this.where('enterprise_id', req.currentUser.enterprise_id);
          else this.whereNull('enterprise_id');
          this.andWhere('created_by', who.id).andWhere('created_by_type', who.type);
        });
        if (table === 'floors' && req.query.building_id) query.where('building_id', Number(req.query.building_id));
        return res.json({ result: await query.limit(250) });
      } catch (error) { return res.status(500).json({ error: 'Unable to list locations.' }); }
    },
    create: async (req, res) => {
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const code = String(body[codeKey] || '').trim();
      const buildingId = table === 'floors' ? Number(body.building_id) : null;
      if (!name || name.length > 160 || !code || code.length > 64 || (table === 'floors' && !Number.isInteger(buildingId))) {
        return res.status(400).json({ error: 'Valid name, code, and building_id are required.' });
      }
      try {
        const who = owner(req);
        const row = { name, [codeKey]: code, enterprise_id: req.currentUser.enterprise_id || null,
          created_by: who.id, created_by_type: who.type, created_at: knex.fn.now(),
          id_created: who.id, deleteflag: 0, oldid: null };
        if (body.description != null) row.description = String(body.description).trim();
        if (table === 'buildings') {
          if (body.address != null) row.address = String(body.address).trim();
        } else {
          const buildingQuery = knex('buildings').where({ building_id: buildingId, deleteflag: 0 });
          if (req.currentUser.enterprise_id != null) buildingQuery.where('enterprise_id', req.currentUser.enterprise_id);
          else buildingQuery.whereNull('enterprise_id').where({ created_by: who.id, created_by_type: who.type });
          const building = await buildingQuery.first();
          if (!building) return res.status(400).json({ error: 'Building not found.' });
          row.building_id = buildingId;
          if (body.level_number != null) row.level_number = Number(body.level_number);
        }
        const [id] = await knex(table).insert(row);
        await writeAudit(req, 'CREATE', table === 'buildings' ? 'building' : 'floor', id, null, row);
        return res.status(201).json({ [key]: id });
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Code already exists.' });
        return res.status(500).json({ error: 'Unable to create location.' });
      }
    }
  };
}
module.exports = {
  buildings: locationController('buildings', 'building_id', 'building_code'),
  floors: locationController('floors', 'floor_id', 'floor_code')
};
