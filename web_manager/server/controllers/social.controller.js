const bcrypt = require('bcrypt');
const HttpStatus = require('http-status-codes');
const knex = require('../config/knex.js');
var squel = require("squel");
const TableManifest= require('../models/middlewareDatabase/TableManifest.js');
const mangerModel = require('../models/database/managerAll.model.js');
const StockCommon = require('../models/database/stockCommon.model.js');
const {returnOK,returnFalse,returnNotFound ,returnInfoQuery } = require('../utils/returnResponse.js');
const {getRamdomData} = require('../utils/utilsString.js');
const fs = require('fs');
const XLSX = require('xlsx');
const xlsxFile = require('read-excel-file/node');
const WarningInfo = require("../config/warningInfo.js");
var socialCtrl={};
 

                          
socialCtrl.checkEmailRegister =async function (req, res) {
  
  try
  {
    var tableSelect=mangerModel('customer');
    var checkCustomer = squel.select().from('customer')
                        .where("email= ?", req.body["email"])
                        .where("deleteflag=0");
    var p = checkCustomer.toParam();
    var dataCustomer = await  knex.raw(p.text, p.values);
    var empyUser=false;

    if ((dataCustomer==null)||(dataCustomer[0].length==0)) {
        empyUser=true;
    var addParam = tableSelect.addFormToTableSQL(req.body);
    dataCustomer = await  knex.raw(addParam.text, addParam.values);
        if ((dataCustomer==null)||(dataCustomer[0].length==0)){
            returnFalse(res,"Database inval",WarningInfo.ERROR_SERVER);
            return;
        }
    }
    tableSelect=mangerModel('mqtt_user');
    var dataIport = {};
    var nameEmail =req.body["email"].split('@');
    dataIport["mqtt_user_id"]=0;
    dataIport["user_id"]=dataCustomer[0][0].customer_id;
    dataIport["content"]=nameEmail[0];
    dataIport["mqtt_pub"]='p_'+nameEmail[0];
    dataIport["mqtt_sub"]='s_'+nameEmail[0];
    dataIport["mqtt_user"]=nameEmail[0];
    dataIport["mqtt_pass"]=getRamdomData(10);
    dataIport["mqtt_id"]=nameEmail[0];
    if(empyUser){
        var addParam = tableSelect.addFormToTableSQL(dataIport);
        dataCustomer = await  knex.raw(addParam.text, addParam.values);
        returnOK(res,dataIport);
    }
    else
    {
            var chechMQTT = squel.select().from('mqtt_user')
                        .where("user_id= ?", dataCustomer[0][0].customer_id+"")
                        .where("deleteflag=0");
        var p = chechMQTT.toParam();
        var dataMqttUser = await  knex.raw(p.text, p.values);                
        if ((dataMqttUser==null)||(dataMqttUser[0].length==0)){
            var addParam = tableSelect.addFormToTableSQL(dataIport);
            dataMqttUser = await  knex.raw(addParam.text, addParam.values);
            returnOK(res,dataIport);
        }
        else
        {
            returnOK(res,dataMqttUser[0][0]);
        }

    }    
  }
  catch(ie){
    returnFalse(res,ie.toString(),WarningInfo.ERROR_SERVER);
  } 
}

socialCtrl.stockReportValue =async function (req, res) {
    var table=req.body.table;
    var stock= new StockCommon();
    var startTime = !!!req.body.startTime?null:req.body.startTime;
    var endTime = !!!req.body.endTime?null:req.body.endTime;
    var sqlStock = stock.getSQLStock(table,startTime,endTime);
    var infoData = await stock.queryDatabaseDetail(sqlStock.text, sqlStock.values);
    return returnInfoQuery(res,infoData);
}

socialCtrl.stockImport =async function (req, res) {
    var file=req.body.file.path;
    var selectTable=req.body.selectStock.replace(/[^a-zA-Z0-9_]/g, '');
    var stock= new StockCommon();
    if(!await stock.chechTableExisting("stock_info_"+selectTable))
    {
        var createSqlTable='CREATE TABLE `stock_info_'+selectTable+'` ( `date` datetime NOT NULL, `open` float,`high` float, `low` float, `close` float,`volume` int(11)  ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=DYNAMIC;'
        var info= await stock.queryDatabaseDetail(createSqlTable); 
        if(info.error==true) return returnFalse(res,"Not add table",WarningInfo.DATA_NOT_EXSITING);
    }
    try{
        const inserts = await knex.transaction(async function(trx) {
            const workbook  = await XLSX.readFile(file, {});
            var sheet_name_list = workbook.SheetNames;
            for(var i=0;i<sheet_name_list.length;i++){
                var first_worksheet = workbook.Sheets[sheet_name_list[0]];
                var data = XLSX.utils.sheet_to_json(first_worksheet,  {raw: false});
                var arrayDelete=[];
                var enableSql=false;
                var insertValues=[];
                var dateValues=[];
                data.forEach((row,index)=>{
                    if(index>0){
                        dateValues.push(row.DATE);
                        insertValues.push([row.DATE,parseFloat(row.OPEN)||0,parseFloat(row.HIGH)||0,parseFloat(row.LOW)||0,parseFloat(row.CLOSE)||0,parseInt(row.VOLUME)||0]);
                        enableSql=(dateValues.length==100);
                        
                    }
                    if(enableSql){
                        var sqlToDelete ='DELETE FROM `stock_info_'+selectTable+'` WHERE date IN (' +dateValues.map(()=>'?').join(',')+');';
                        knex.raw(sqlToDelete, dateValues).transacting(trx).then(trx.commit).catch(trx.rollback);
                        var insertSql='INSERT INTO `stock_info_'+selectTable+'` (`date`, `open`, `high`, `low`, `close`, `volume`) VALUES ';
                        var insertParams=[];
                        var thefist=false;
                        for(var j=0;j<insertValues.length;j++){
                            if(thefist) insertSql =insertSql +",";
                            insertSql = insertSql +'('+insertValues[j].map(()=>'?').join(',')+')';
                            insertParams = insertParams.concat(insertValues[j]);
                            thefist=true;
                        }
                        insertSql = insertSql+';'
                        knex.raw(insertSql, insertParams).transacting(trx).then(trx.commit).catch(trx.rollback);
                        enableSql=false;
                        insertValues=[];
                        dateValues=[];
                    }
               });
                if(dateValues.length>1) 
                {
                 var sqlToDelete ='DELETE FROM `stock_info_'+selectTable+'` WHERE date IN (' +dateValues.map(()=>'?').join(',')+');';
                 knex.raw(sqlToDelete, dateValues).transacting(trx).then(trx.commit).catch(trx.rollback);
                 var insertSql='INSERT INTO `stock_info_'+selectTable+'` (`date`, `open`, `high`, `low`, `close`, `volume`) VALUES ';
                 var insertParams=[];
                 var thefist=false;
                 for(var j=0;j<insertValues.length;j++){
                     if(thefist) insertSql =insertSql +",";
                     insertSql = insertSql +'('+insertValues[j].map(()=>'?').join(',')+')';
                     insertParams = insertParams.concat(insertValues[j]);
                     thefist=true;
                 }
                 insertSql = insertSql+';'
                 knex.raw(insertSql, insertParams).transacting(trx).then(trx.commit).catch(trx.rollback);
                 enableSql=false;
                 insertValues=[];
                 dateValues=[];
                }
                
            }
            return returnOK(res,"OK");
        });
        
    }
    catch(ie){
        return returnFalse(res,ie.toString(),WarningInfo.DATA_NOT_EXSITING);
    }
}



module.exports = socialCtrl;
