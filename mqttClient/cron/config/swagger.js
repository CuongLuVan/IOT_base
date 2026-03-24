const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

/**
 * Swagger definition.
 */
const swaggerDefinition = {
  info: {
    title: 'Express React',
    version: '1.0.0',
    description: 'RESTful API description with Swagger',
  },
  basePath: '/api',
};

/**
 * Options for the swagger docs.
 */
const swaggerOptions = {
  // const swaggerDefinitions
  swaggerDefinition: swaggerDefinition,
  // path to the API docs
  apis: [path.join(__dirname, '/../routes/*.js')],
};

/**
 * Initialize swagger-jsdoc.
 */
const swagger = swaggerJSDoc(swaggerOptions);

module.exports =  swagger;
