const HttpStatus = require('http-status-codes');

var groupCtrl={};

 groupCtrl.destroy = function (req, res) {
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: true,
    data: { message: err.message },
  });
}

module.exports = groupCtrl;
