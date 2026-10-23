function addAuditColumns(table, knex) {
  table.timestamp('created_at').defaultTo(knex.fn.now());
  table.timestamp('updated_at').nullable();
  table.integer('id_created').unsigned().nullable().index();
  table.integer('id_updated').unsigned().nullable();
  table.integer('deleteflag').notNullable().defaultTo(0).index();
  table.integer('oldid').unsigned().nullable();
}

async function addColumnIfMissing(knex, tableName, columnName, addColumn) {
  if (await knex.schema.hasTable(tableName) && !(await knex.schema.hasColumn(tableName, columnName))) {
    await knex.schema.alterTable(tableName, addColumn);
  }
}

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('customer_documents'))) {
    await knex.schema.createTable('customer_documents', (table) => {
      table.increments('customer_documents_id').primary();
      table.integer('customer_id').unsigned().notNullable().index();
      table.string('document_type', 32).notNullable();
      table.string('document_number', 100).nullable();
      table.string('document_name', 255).nullable();
      table.string('image_front', 255).nullable();
      table.string('image_back', 255).nullable();
      table.string('status', 16).notNullable().defaultTo('PENDING').index();
      table.string('reject_reason', 255).nullable();
      addAuditColumns(table, knex);
    });
  } else {
    await addColumnIfMissing(knex, 'customer_documents', 'customer_id', (table) => table.integer('customer_id').unsigned().nullable().index());
  }

  if (!(await knex.schema.hasTable('service_product_cost'))) {
    await knex.schema.createTable('service_product_cost', (table) => {
      table.increments('service_product_cost_id').primary();
      table.integer('type').notNullable().defaultTo(1).index();
      table.bigInteger('cost').notNullable().defaultTo(0);
      table.integer('limit').notNullable().defaultTo(0);
      table.string('title', 128).notNullable();
      table.string('content', 1024).notNullable();
      table.string('cost_info', 512).notNullable();
      table.text('detail').nullable();
      table.integer('expried_day').notNullable().defaultTo(0);
      addAuditColumns(table, knex);
    });
  }

  if (!(await knex.schema.hasTable('service_product_bill'))) {
    await knex.schema.createTable('service_product_bill', (table) => {
      table.increments('service_product_bill_id').primary();
      table.integer('service_product_cost_id').unsigned().notNullable().index();
      table.text('detail_bill').nullable();
      table.integer('type').notNullable().defaultTo(1);
      table.bigInteger('cost').notNullable().defaultTo(0);
      table.integer('limit').notNullable().defaultTo(0);
      table.integer('km').notNullable().defaultTo(0);
      table.dateTime('expires_at').nullable().index();
      table.string('provider_order_id', 64).nullable().unique();
      table.string('payment_status', 16).notNullable().defaultTo('PENDING').index();
      table.string('payment_transaction_no', 64).nullable();
      table.text('payment_payload').nullable();
      table.dateTime('paid_at').nullable();
      addAuditColumns(table, knex);
    });
  } else {
    await addColumnIfMissing(knex, 'service_product_bill', 'provider_order_id', (table) => table.string('provider_order_id', 64).nullable().unique());
    await addColumnIfMissing(knex, 'service_product_bill', 'payment_status', (table) => table.string('payment_status', 16).notNullable().defaultTo('PENDING').index());
    await addColumnIfMissing(knex, 'service_product_bill', 'payment_transaction_no', (table) => table.string('payment_transaction_no', 64).nullable());
    await addColumnIfMissing(knex, 'service_product_bill', 'payment_payload', (table) => table.text('payment_payload').nullable());
    await addColumnIfMissing(knex, 'service_product_bill', 'paid_at', (table) => table.dateTime('paid_at').nullable());
    await addColumnIfMissing(knex, 'service_product_bill', 'expires_at', (table) => table.dateTime('expires_at').nullable().index());
  }

  if (!(await knex.schema.hasTable('service_product_limit'))) {
    await knex.schema.createTable('service_product_limit', (table) => {
      table.increments('service_product_limit_id').primary();
      table.integer('service_product_cost_id').unsigned().notNullable().index();
      table.integer('customer_id').unsigned().notNullable().index();
      table.integer('type').notNullable().defaultTo(1);
      table.bigInteger('cost').notNullable().defaultTo(0);
      table.integer('limit').notNullable().defaultTo(0);
      addAuditColumns(table, knex);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('service_product_limit');
  await knex.schema.dropTableIfExists('service_product_bill');
  await knex.schema.dropTableIfExists('service_product_cost');
  await knex.schema.dropTableIfExists('customer_documents');
};
