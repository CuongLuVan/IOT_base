const History = require('../models/history.model');
const {returnOK,returnOKCustom,returnNotFound} = require('../utils/returnResponse.js');

exports.create = async function(req, res){
    let obj = req.body;
    if(obj.thietbi_id===undefined || obj.thietbi_id===null || obj.thietbi_id===''){
        returnNotFound(res,"error",201);
    }else{
        let history = new History(req.body);
        history.save(function(err){
            if(err){
                return next(err);
            }
            returnOKCustom(res,"Create successfully");
        })
    }
    
}

exports.findAll = async function(req, res){
    History.find({}).sort({time:-1}).exec(function(err, results){
        returnOKCustom(res,results);
    });
    
}
exports.findById = async function(req, res){
    const id = req.params.id;
    if(id===undefined || id===null || id===''){
        returnNotFound(res,"error",201);
    }else{
        Status.find({thietbi_id: id}).sort({time: -1}).exec(function(err, result){
            returnOKCustom(res,results);
        })
    }
    
}