
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
        data: { message: "NOT_FOUND "},
    });
}
exports.returnNotAuthen =  (res, error,error_code=104) => {
    return res.status(HttpStatus.UNAUTHORIZED).json({
        error: error,
        error_code:error_code,
        data: { message: "UNAUTHORIZED "},
    });
}

exports.returnInfoQuery =  (res,infoData,error_code=204) => {
    if(infoData.error)
    {
        return  res.status(HttpStatus.NOT_FOUND).json({
            error: { message: "Database error",error:infoData },
            error_code:error_code,
            data: { message: "NOT_FOUND "},
        });
    }
    else
    {
        return res.status(HttpStatus.OK).json({ result:infoData.data});
    }     
}

