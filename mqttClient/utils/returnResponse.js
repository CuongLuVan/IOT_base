
const HttpStatus = require('http-status-codes');
 
exports.returnOK =  (res, data) => {
    return res.status(HttpStatus.OK).json({
        result:data,
      });
}  

exports.returnOKCustom =  (res, data) => {
    return res.status(HttpStatus.OK).json(data);
}  
exports.returnFalse =  (res, error,error_code=404) => {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error,
        error_code:error_code,
        data: { message: "acao Not exitting "},
    });
}

exports.returnNotFound =  (res, error,error_code=404) => {
    return res.status(HttpStatus.NOT_FOUND).json({
        error: error,
        error_code:error_code,
        data: { message: "NotFound "},
    });
}
exports.returnNotAuthen =  (res, error) => {
    return res.status(HttpStatus.UNAUTHORIZED).json({
        error: error,
        error_code:101,
        data: { message: "UNAUTHORIZED "},
    });
}


