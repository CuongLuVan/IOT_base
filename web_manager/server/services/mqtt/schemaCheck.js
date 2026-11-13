const knex = require('../../config/knex.js');

/**
 * The MQTT provisioning features need the columns added by the migrations
 * 20261113090000 / 120000 / 150000. Without them the workers would fail every
 * period and saveCertificateMqtt would fail on insert; instead they stay off
 * and say what to run.
 */
const REQUIRED_COLUMNS = [
  'message_auth_key', 'broker_sync_status', 'broker_sync_attempts', 'broker_sync_error', 'broker_synced_at',
  'cert_expires_at', 'cert_renew_status', 'cert_renew_sent_at', 'cert_renew_attempts', 'cert_renew_error',
  'ca_fingerprint', 'ca_renew_sent_at',
];
const MESSAGE = 'Database migration required: run "npx knex migrate:latest" in web_manager';

let pending = null;

/** Resolves to the list of missing columns ([] = schema up to date). Cached once OK. */
function missingColumns() {
  if (!pending) {
    pending = (async function() {
      const missing = [];
      for (const column of REQUIRED_COLUMNS) {
        if (!(await knex.schema.hasColumn('mqtt_microservice', column))) missing.push(column);
      }
      if (missing.length) pending = null; // check again after the migration
      return missing;
    })().catch(function(error) {
      pending = null;
      throw error;
    });
  }
  return pending;
}

/** Throws an Error with MESSAGE when columns are missing. */
async function assertSchema() {
  const missing = await missingColumns();
  if (missing.length) {
    const error = new Error(MESSAGE + ' (missing: ' + missing.join(', ') + ')');
    error.code = 'MIGRATION_REQUIRED';
    throw error;
  }
}

/** Starts start() once the schema is up to date; otherwise logs and retries every 10 minutes. */
function whenSchemaReady(name, start) {
  const attempt = function() {
    missingColumns().then(function(missing) {
      if (!missing.length) {
        start();
        return;
      }
      console.error('[' + name + '] not started. ' + MESSAGE + ' (missing: ' + missing.join(', ') + ')');
      setTimeout(attempt, 10 * 60 * 1000).unref();
    }).catch(function(error) {
      console.error('[' + name + '] schema check failed:', error.message);
      setTimeout(attempt, 60 * 1000).unref();
    });
  };
  attempt();
}

module.exports = { REQUIRED_COLUMNS, MESSAGE, missingColumns, assertSchema, whenSchemaReady };
