'use strict';

const fs = require('fs');

exports.saveFile = async (file, folder, oldUrl = '') => {
  if (!fs.existsSync(folder)) {
    await fs.mkdirSync(folder, { recursive: true }, (err) => {
      if (err) throw err;
    });
  }

  if (oldUrl !== '' && fs.existsSync(folder + oldUrl)) {
    await fs.unlink(folder + oldUrl, (err) => {
      if (err) throw err;
    });
  }

  const fileName = Date.now() + '-' + file.originalname;
  const path = folder + fileName;

  await fs.writeFile(path, file, function (err) {
    if (err) throw err;
  });

  return path;
};

exports.excelFilter = function (req, file, cb) {
  // Accept excel only
  if (!file.originalname.match(/\.(csv|xls|xlsx)$/)) {
    req.fileValidationError = 'Only excel files are allowed!';
    return cb(new Error('Only excel files are allowed!'), false);
  }

  cb(null, true);
};

exports.imageFilter = function (req, file, cb) {
  // Accept excel only
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
    req.fileValidationError = 'Only jpg|jpeg|png files are allowed!';
    return cb(new Error('Only jpg|jpeg|png files are allowed!'), false);
  }

  cb(null, true);
};


