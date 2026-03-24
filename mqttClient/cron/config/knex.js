const knex = require('knex');
const database = require('../config/database.js');
module.exports =  knex(database);
