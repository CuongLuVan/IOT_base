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
                        .where("email='"+req.body["email"]+"'")
                        .where("deleteflag=0");
    var dataCustomer = await  knex.raw(checkCustomer.toString());
    var empyUser=false;

    if ((dataCustomer==null)||(dataCustomer[0].length==0)) {
        empyUser=true;
        dataCustomer = await  knex.raw(tableSelect.addFormToTableSQL(req.body));
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
        dataCustomer = await  knex.raw(tableSelect.addFormToTableSQL(dataIport));
        returnOK(res,dataIport);
    }
    else
    {
        var chechMQTT = squel.select().from('mqtt_user')
                        .where("user_id="+dataCustomer[0][0].customer_id+"")
                        .where("deleteflag=0");
        var dataMqttUser = await  knex.raw(chechMQTT.toString());                
        if ((dataMqttUser==null)||(dataMqttUser[0].length==0)){
            dataMqttUser = await  knex.raw(tableSelect.addFormToTableSQL(dataIport));
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
    var infoData = await stock.queryDatabaseDetail(stock.getSQLStock(table,startTime,endTime));
    return returnInfoQuery(res,infoData);
}

socialCtrl.stockImport =async function (req, res) {
    var file=req.body.file.path;
    var selectTable=req.body.selectStock;
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
            var stringDataSQL=' INSERT INTO `stock_info_'+selectTable+'` (`date`, `open`, `high`, `low`, `close`, `volume`)  VALUE '
            for(var i=0;i<sheet_name_list.length;i++){
                var first_worksheet = workbook.Sheets[sheet_name_list[0]];
                var data = XLSX.utils.sheet_to_json(first_worksheet,  {raw: false});
                var arrayDelete=[];
                var enableSql=false;
                var newSQLCheck=stringDataSQL;
                data.forEach((row,index)=>{
                    if(index>0){
                        if(arrayDelete.length>0)   newSQLCheck=newSQLCheck+",";
                        var idDate = 'str_to_date("'+row.DATE+'","%m/%d/%y")'
                        arrayDelete.push(idDate);
                        
                        newSQLCheck =newSQLCheck +'('+idDate+','+row.OPEN+','+row.HIGH+','+row.LOW+','+row.CLOSE+','+row.VOLUME+')';
                        enableSql=(arrayDelete.length==100);
                        
                    }
                    if(enableSql){
                        var sqlToDelete ='DELETE FROM `stock_info_'+selectTable+'` WHERE date IN (' +arrayDelete+');';
                        newSQLCheck = newSQLCheck+';'
                        knex.raw(sqlToDelete).transacting(trx).then(trx.commit).catch(trx.rollback);
                        knex.raw(newSQLCheck).transacting(trx).then(trx.commit).catch(trx.rollback);
                        enableSql=false;
                        newSQLCheck=stringDataSQL;
                        arrayDelete=[];
                    }
               });
               if(arrayDelete.length>1) 
               {
                var sqlToDelete ='DELETE FROM `stock_info_'+selectTable+'` WHERE date IN (' +arrayDelete+');';
                knex.raw(sqlToDelete).transacting(trx).then(trx.commit).catch(trx.rollback);
                newSQLCheck = newSQLCheck+';'
                knex.raw(newSQLCheck).transacting(trx).then(trx.commit).catch(trx.rollback);
                enableSql=false;
                newSQLCheck=stringDataSQL;
                arrayDelete=[];
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
