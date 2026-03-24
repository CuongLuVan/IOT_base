const express = require('express');
const enterpriseCtrl = require('../controllers/enterprise.controller.js');
const isAuthenticated = require('../middlewares/authenticate.js');
const validate = require('../config/joi.validate.js');
const schema = require('../utils/validator.js');

const router = express.Router();

router.route('/sample').post(isAuthenticated,(req, res) => {
  res.send(JSON.stringify({sample:false}));
})

module.exports =  router;
