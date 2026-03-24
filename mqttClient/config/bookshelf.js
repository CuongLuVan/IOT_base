const { Model } = require('objection');
const knex = require('./knex.js');

Model.knex(knex);
module.exports =  Model;
