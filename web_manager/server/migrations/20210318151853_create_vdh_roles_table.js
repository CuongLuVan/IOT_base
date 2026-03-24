/**
 * Create permission table.
 *
 * @param   {object} knex
 * @returns {Promise}
 */
exports.up = function (knex) {
  return knex.schema.createTable('permission', (table) => {
    table.increments('id').primary().unsigned();
    table.string('name').notNullable();
    table.string('permission').notNullable();
    table.string('gate').nullable();
    table.string('description').nullable();
    table.bool('status').default(false).notNullable();
    table.string('avatar').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * Drop permission table.
 *
 * @param   {object} knex
 * @returns {Promise}
 */
exports.down = function (knex) {
  return knex.schema.dropTable('permission');
};
