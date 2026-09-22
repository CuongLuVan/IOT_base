exports.up = function (knex) {
  return knex.schema.createTable('auth_refresh_tokens', (table) => {
    table.bigIncrements('id').primary().unsigned();
    table.string('token_hash', 64).notNullable().unique();
    table.enum('token_type', ['admin', 'customer']).notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.string('session_id', 36).notNullable().index();
    table.integer('permission_id').nullable();
    table.string('enterprise_id').nullable();
    table.text('value_manifest').nullable();
    table.timestamp('expires_at').notNullable().index();
    table.timestamp('revoked_at').nullable().index();
    table.string('replaced_by_hash', 64).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('auth_refresh_tokens');
};
