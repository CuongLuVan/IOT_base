
const knex = require('../config/knex.js');
var squel = require("squel");
const {mangerModelAdmin} = require('../models/database/managerAll.model.js');
const {returnOK,returnFalse,returnNotFound ,returnInfoQuery } = require('../utils/returnResponse.js');
const WarningInfo = require("../config/warningInfo.js");
const report_sale = require("../models/report_sale.js");
var userCtrl={};
 
          
userCtrl.getTableData = async function (req, res) {
  var startPage=0;
  var endPage=1000;
  if(!!req.body.startPage) startPage=req.body.startPage; 
  if(!!req.body.endPage) endPage=req.body.endPage; 
  var tableSelect=mangerModelAdmin(req.body.table);
  var infoData = await tableSelect.getAllDataInTable(req,startPage,endPage);
  return returnInfoQuery(res,infoData);
}
                          
userCtrl.getTableDataByGroup = async function (req, res) {
  var table =req.body.table;
  var startPage=0;
  if(!!req.body.startPage) startPage=req.body.startPage;
  var tableSelect=mangerModelAdmin(table);
  startPage =startPage*1000;
  var infoData = await tableSelect.getAllDataInTableByGroupsId(req,startPage);
  return returnInfoQuery(res,infoData)
}

                          
userCtrl.getNumberPages = async function (req, res) {
  var table =req.body.table;
  var tableSelect=mangerModelAdmin(table);
  var itemSelect= tableSelect.getConditionManisfest(req.currentUser) +tableSelect.getValueToSelectToFind(req.body.dataFind); 
  var dataTableSQL= "SELECT COUNT(*) FROM " + tableSelect.getNameTable() +" WHERE " +itemSelect;
  var infoData = await tableSelect.queryDatabaseDetail(dataTableSQL);
  return returnInfoQuery(res,infoData)
}

userCtrl.addDataToTable= async  function (req, res) {
    var table =req.body.table;
    var tableSelect=mangerModelAdmin(table);
    let data=req.body;
    if(!tableSelect.checkDataAddDatabase(req.currentUser.permission_id,tableSelect.getTypeTable())){
      return returnNotFound(res,{ message: "Database inval" },WarningInfo.DATA_NOT_EXSITING);
    }
    var checkInaval =await tableSelect.checkManifestSpecialTable(table,req);
    if(!checkInaval){
      return returnNotFound(res,
          { message: "Tài khoản đã tồn tại hoặc chưa được cấp quyền cao hơn"},
            WarningInfo.NOT_ACESS_DATABASE);
    } 

    let infoShortName = tableSelect.getFieldLinkShort();
    if(infoShortName!=null){
      req.body[infoShortName.data] = await tableSelect.getTagName(tableSelect.getNameTable(),infoShortName.data,req.body[infoShortName.valueSetup]);
    }

    var infoData = await tableSelect.checkSqlAddAdmin(req,data);   
    return returnInfoQuery(res,infoData)
}



userCtrl.deleteData= async function (req, res) {
    var tableSelect=mangerModelAdmin(req.body.table);
    if(!tableSelect.checkDataDeleteDatabase(req.currentUser.permission_id,tableSelect.getTypeTable()))  
    {
      return returnFalse(res,{ message: "Database not access lv1" }, WarningInfo.NOT_ACESS_DATABASE);
    }
    if(!await tableSelect.checkDataToEdit(req)){
      return returnFalse(res,{ message: "Database not access lv2" }, WarningInfo.NOT_ACESS_DATABASE);
    }
    var infoData = await tableSelect.deleteOneRecord(req,req.body);   
    return returnInfoQuery(res,infoData)
}


userCtrl.updateData= async  function (req, res) {
    var tableSelect=mangerModelAdmin(req.body.table);  
    if(!tableSelect.checkDataEditDatabase(req.currentUser.permission_id,tableSelect.getTypeTable())){
      return returnNotFound(res,{ message: "Database not Acess 1" }, WarningInfo.NOT_ACESS_DATABASE);
    }
    if(!await tableSelect.checkDataToEdit(req)){
      return returnNotFound(res,{ message: "Database not Acess 2" }, WarningInfo.NOT_ACESS_DATABASE);
    }

    let data=req.body;
    var dataAdd= await knex.raw(tableSelect.addRecordIsExisting(req));
    if((dataAdd==null)||(dataAdd.length<1)) 
        return returnNotFound(res,"Không tồn tại bản ghi dữ liệu này", WarningInfo.DATA_NOT_EXSITING);     
    var deleteAdd= await knex.raw(tableSelect.deleteFlagToRecord(req,dataAdd[0].insertId));
    if((deleteAdd==null)||(deleteAdd.length<1)) 
        return returnFalse(res,"Lỗi cập nhật dữ liệu", WarningInfo.DATA_NOT_EXSITING); 
    let infoShortName = tableSelect.getFieldLinkShort();
    if(infoShortName!=null){
      req.body[infoShortName.data] = await tableSelect.getTagName(tableSelect.getNameTable(),infoShortName.data,req.body[infoShortName.valueSetup]);
    }
    var infoData = await tableSelect.checkSqlUpdateAdmin(req,data);   
    return returnInfoQuery(res,infoData)    
}

userCtrl.updateFistPages= async  function (req, res) {
  var tableSelect=mangerModelAdmin('gro_pages_content');  
  if(!tableSelect.checkDataEditDatabase(req.currentUser.permission_id,tableSelect.getTypeTable())){
    return returnNotFound(res,{ message: "Database inval" }, WarningInfo.DATA_NOT_EXSITING);
  }
  var sqlUpdate = 'UPDATE gro_pages_content SET set_to_fist = ( SELECT MAX(set_to_fist) + 1 ) WHERE deleteflag =0 and pages_content_id='+
          req.body['pages_content_id']+';'; 
  var result = await tableSelect.queryDatabaseDetail(sqlUpdate);
  return returnInfoQuery(res,result)   
}


userCtrl.registerUser = async function (req, res) {
    var tableSelect=mangerModelAdmin('users');
    if(!tableSelect.checkDataAddDatabase(req.currentUser.permission_id,tableSelect.getTypeTable())){
      return returnNotFound(res,{ message: "Database inval" }, WarningInfo.DATA_NOT_EXSITING);
    }  
    checkDatataBaseInval=true;
    let data=req.body;
    var result = await tableSelect.checkUserExistingSql(data);
    if(result==false){
      return returnFalse(res,{ message: "phone and email is existing" } , WarningInfo.ACOUNT_NOT_EXIST);
    }
    var result = await tableSelect.registerToUserSql(data);
    return returnInfoQuery(res,result)   
}

userCtrl.resetPass= async function  (req, res) {
  //var acount="SELECT * FROM users " +request.body;
  var authen = squel.select().from('users')
                        .where("email='"+data["email"]+"'")
                        .where("forgot_pass_token='"+data["forgot_pass_token"]+"'")
                        .where("deleteflag=0");
   var result= await knex.raw(authen.toString());
   if ((result==null)||(result.length==0)) {
    return returnNotFound(res,{ message: "acao Not exitting "}, WarningInfo.ACOUNT_NOT_EXIST);
   }
   ////mailBoxSupport.sendEmailNomal(result[0]["add_table"].email,"please comfirm email "+result[0]["add_table"].forgot_pass_token)
}

userCtrl.changePassword= async function(req, res) {
  //var acount="SELECT * FROM users " +request.body;
  var authen = squel.select().from('users')
                        .where("email='"+data["email"]+"'")
                        .where("forgot_pass_token='"+data["forgot_pass_token"]+"'")
                        .where("deleteflag=0");
   var result= await knex.raw(authen.toString());
   if ((result==null)||(result.length==0)) {
      return returnNotFound(res,{ message: "acao Not exitting "}, WarningInfo.ACOUNT_NOT_EXIST);
   }
   result[0][0].currentUser={users_id:0};
   result[0][0].table='users';
  //mailBoxSupport.sendEmailNomal(result[0]["add_table"].email,"đổi mat khau thanh cong")
   updateData(result[0][0],res);
}


userCtrl.getAllUserTochat = async function (req, res) {
  var table ='users';
  var tableSelect=mangerModelAdmin(table);
  var dataInfo = await tableSelect.queryDatabase(tableSelect.getAllInfoToChat());
  if(dataInfo){
    return returnOK(res,dataInfo);
  }
  else{
    return returnFalse(res,{ message: "phone and email is existing" }, WarningInfo.ACOUNT_NOT_EXIST );
  }
}

userCtrl.getAllUserToComment = async function (req, res) {
  var table ='customer';
  var tableSelect=mangerModelAdmin(table);
  var dataInfo = await tableSelect.queryDatabase(tableSelect.getAllInfoToComment());
  if(dataInfo){
    return returnOK(res,dataInfo);
  }
  else{
    return returnFalse(res,{ message: "phone and email is existing" } , WarningInfo.ACOUNT_NOT_EXIST);
  }
}


userCtrl.getInfoImageInfoId = async function (req, res) {
    var sql=  "SELECT product_image.*,company.companyname FROM product_image  LEFT JOIN company on company.company_id=product_lost.company_id WHERE ";

    sql= sql + " AND image_id="+ req.body.image_id + " AND deleteflag = 0;";

    var x= await knex.raw(sql);
    if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
    return returnOK(res,x[0]);
}


userCtrl.getProductByCompany  = async function(req, res) {
      var sql=  "SELECT product.* FROM product  WHERE company_id="+ req.body.company_id + " AND deleteflag = 0 ;";
      var x= await knex.raw(sql);
      if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
      return returnOK(res,x[0]);
}

userCtrl.getProductImageByCompany  = async function(req, res) {
      var sql=  "SELECT product_image.* FROM product_image  WHERE product_id="+ req.body.product_id + " AND deleteflag = 0 ;";
      var x= await knex.raw(sql);
      if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
      return returnOK(res,x[0]);
}

userCtrl.getLastdayProductBuy  = async function(req, res) {
  var sql=  "select extract(YEAR from updated_at) as month,sum(Total) as total_value,COUNT(*) as total from product_buy  WHERE updated_at  >= now() - INTERVAL "+req.body.time+" day AND deleteflag = 0 group by month;";
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}

userCtrl.getAllDataYearProductBuy  = async function(req, res) {
  var sql=  "select extract(YEAR from updated_at) as month,sum(Total) as total_value,COUNT(*) as total from product_buy WHERE deleteflag = 0  group by month;";
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}




userCtrl.getAllDataProductLostYear  = async function(req, res) {
  var sql=  "select extract(MONTH from updated_at) as month,sum(Total) as total_value ,COUNT(*) as total from product_buy WHERE deleteflag = 0  group by month;";
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}

userCtrl.getAllDataApprovedInfo  = async function(req, res) {
  var sql=  `select  customer.customer_id as customer_id,customer.username as username,
  customer.email as email,customer.phone as phone,
  customer.avatar as avatar,customer.fullname as fullname,
  customer.address as address,customer.note as note,
  company.company_id as company_id,company.companyname as companyname,
  company.adresss as company_adresss,company.phone as company_phone,
  company.icon_company as icon_company,company.fax as fax ,company.deleteflag as deleteflag
  from customer LEFT JOIN company ON company.id_created =customer.customer_id  
  WHERE customer.deleteflag = 0 AND customer.permission_id = 1;`;
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "Không tồn tại dữ liệu"},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}

userCtrl.setDataApprovedInfo  = async function(req, res) {
    var editCus = squel.update().table("customer");
    editCus.where('customer_id='+req.body.customer_id)
    editCus.set("id_updated",req.currentUser.users_id)
    .set("updated_at","NOW()",{dontQuote: true})
    .set("permission_id",2);
    var x = await knex.raw(editCus.toString());
    if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "Không tồn tại dữ liệu"},WarningInfo.DATA_NOT_EXSITING);
    var y = [];
    if(req.body.companyname!=null){
        var editCom = squel.update().table("company");
          editCom.where('company_id='+req.body.company_id)
          editCom.set("id_updated",req.currentUser.users_id)
          .set("updated_at","NOW()",{dontQuote: true})
          .set("deleteflag",0);
        y = await knex.raw(editCom.toString());
    }
    if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "Không tồn tại dữ liệu"},WarningInfo.DATA_NOT_EXSITING);
    return returnOK(res,{customer:x[0],company:y[0]});
}
userCtrl.setApprovedCompany  = async function(req, res) {
  var y = [];
  if(req.body.companyname!=null){
      var editCom = squel.update().table("company");
        editCom.where('company_id='+req.body.company_id)
        editCom.set("id_updated",req.currentUser.users_id)
        .set("updated_at","NOW()",{dontQuote: true})
        .set("deleteflag",0);
      y = await knex.raw(editCom.toString());
      if ((y==null)||(y.length==0))  return returnNotFound(res,{ message: "Không tồn tại dữ liệu"},WarningInfo.DATA_NOT_EXSITING);
      return returnOK(res,{company:y[0]});
  }
  return returnNotFound(res,{ message: "Dữ liệu không hợp lệ"},WarningInfo.WORNG_FORMAT);
}
userCtrl.getTagName = async  function(req, res) {
  let data = req.body.data.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll(" ", "-");
  if(data.length>40) data =  data.substring(0, 40);
  var authen = squel.select().from(req.body.table)
                    .where(req.body.short+ "='"+data+"'")
                    .where("deleteflag=0");
  var result= await knex.raw(authen.toString());
  if ((result==null)||(result.length==0)) {
    return returnOK(res,data);
  }
  return returnOK(res,data+Date.now());
}

userCtrl.getTableDetailInfo = async function (req, res) {
  var tableSelect=mangerModelAdmin(req.body.table);
  var infoData = await tableSelect.getAllInfoValueInTable(req,req.body.mode);
  return returnOK(res,infoData);
}

userCtrl.getReportSpecial = async function (req, res) {
  var dataSql=report_sale[req.body.info][req.body.select];
  if(dataSql){
    var infoData = await knex.raw(dataSql);
    return returnOK(res,infoData[0]);
  }
  else{
    return returnNotFound(res,{ message: "Không tồn tại dữ liệu"},WarningInfo.DATA_NOT_EXSITING);
  }
}


module.exports = userCtrl;
