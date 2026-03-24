const HttpStatus = require('http-status-codes');

var squel = require("squel");
var enterpriseCtrl={}; 



enterpriseCtrl.getAllDataTemplate = function (req, res) {
  res.status(HttpStatus.OK).json({
    result:1,
  });
}

module.exports =enterpriseCtrl;


