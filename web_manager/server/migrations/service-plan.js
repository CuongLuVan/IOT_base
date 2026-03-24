/**
 *  Current Service Plan: service by downloads & access to all tools
 *  TODO: service by subscription ?? service by tool
 */

exports.up = async function (knex, Promise) {
  await knex.schema.alterTable("service", function (table) {
    table.integer("downloads").notNullable();
    table.unique("name");
  });
  await knex.schema.alterTable("customer", function (table) {
    table.integer("service_downloads").notNullable().defaultTo(0);
    table.integer("downloaded").notNullable().defaultTo(0);
  });
  await knex.schema.alterTable("service_bill", function (table) {
    table.enum("status", ["Pending", "Charged", "Cancelled"]).notNullable().defaultTo("Pending");
    table.string("bank").nullable();
    table.integer("value").nullable().alter();
    table.string("content").nullable().alter();
    table.boolean("auto_activated").notNullable().defaultTo(false);
  });
};
exports.down = async function (knex, Promise) {
  await knex.schema.alterTable("service", function (table) {
    table.dropColumn("downloads");
    table.dropUnique("name");
  });
  await knex.schema.alterTable("customer", function (table) {
    table.dropColumn("service_downloads");
    table.dropColumn("downloaded");
  });
  await knex.schema.alterTable("service_bill", function (table) {
    table.dropColumn("bank");
    table.dropColumn("status");
    table.integer("value").notNullable().alter();
    table.string("content").notNullable().alter();
    table.dropColumn("auto_activated");
  });
};
