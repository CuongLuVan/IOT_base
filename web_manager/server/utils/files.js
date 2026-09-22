'use strict';

const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto');

const uploadFolder = pathModule.resolve(process.cwd(), 'public/uploads/datas');
const uploadLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 1,
  fields: 10,
  parts: 12,
  headerPairs: 100
};

const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
const excelExtensions = new Set(['.csv', '.xls', '.xlsx']);

function hasAllowedExtension(file, extensions) {
  const extension = pathModule.extname(file.originalname || '').toLowerCase();
  return extensions.has(extension);
}

function safeFileFilter(extensions, mimeTypes, message) {
  return function (req, file, cb) {
    const mimeAllowed = mimeTypes.has((file.mimetype || '').toLowerCase());
    if (!hasAllowedExtension(file, extensions) || !mimeAllowed) {
      req.fileValidationError = message;
      return cb(new Error(message), false);
    }

    cb(null, true);
  };
}

exports.storage = require('multer').diskStorage({
  destination: function (req, file, cb) {
    fs.mkdir(uploadFolder, { recursive: true }, (err) => cb(err, uploadFolder));
  },
  filename: function (req, file, cb) {
    cb(null, crypto.randomUUID() + pathModule.extname(file.originalname || '').toLowerCase());
  }
});

exports.uploadLimits = uploadLimits;
exports.handleUpload = function (uploadMiddleware) {
  return function (req, res, next) {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid upload' });
      }
      next();
    });
  };
};

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

  const extension = pathModule.extname(file.originalname || '').toLowerCase();
  const fileName = crypto.randomUUID() + extension;
  const filePath = pathModule.join(folder, fileName);

  await fs.promises.writeFile(filePath, file);

  return filePath;
};

exports.excelFilter = function (req, file, cb) {
  return safeFileFilter(
    excelExtensions,
    new Set([
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]),
    'Only excel files are allowed!'
  )(req, file, cb);
};

exports.imageFilter = function (req, file, cb) {
  return safeFileFilter(
    imageExtensions,
    new Set(['image/jpeg', 'image/png']),
    'Only jpg|jpeg|png files are allowed!'
  )(req, file, cb);
};


