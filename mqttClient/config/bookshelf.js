const bookshelf = require('bookshelf');
const knex = require('./knex.js');

module.exports =  bookshelf(knex);
