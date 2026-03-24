const Joi = require('joi');

module.exports =  {
  storeUser: Joi.object({
    fullname: Joi.string().min(6).required(),
    phone: Joi.string().pattern(new RegExp('^(09|03|07|08|05)+([0-9]{8})$')).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  updateUser: Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    email: Joi.string().required(),
    password: Joi.string().min(6).required(),
  }),

  storeEnterprise: Joi.object({
    name: Joi.string().required(),
    token: Joi.string().required(),
  }),

  storeGroup: Joi.object({
    name: Joi.string().required(),
    enterprise_id: Joi.required(),
  }),
};
