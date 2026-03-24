
const HttpStatus = require('http-status-codes');
const bcrypt = require('bcrypt');
const knex = require('../config/knex.js');
var squel = require("squel");
const {mangerModelAdmin} = require('../models/database/managerAll.model.js');
const Customer = require('../models/database/customer.model.js');
const TableManifest= require('../models/middlewareDatabase/TableManifest.js');
const {mangerModelUser} = require('../models/database/managerAll.model.js');
const {returnOK,returnOKCustom,returnFalse,returnNotFound,returnInfoQuery } = require('../utils/returnResponse.js');
const urlStaticLink=  require('../config/urlSetting.js');
const {uploadFileS3} = require('../models/S3UploadFile.js');
const WarningInfo = require("../config/warningInfo.js");
var mesageBox = require("../models/manager/messageBox.js");
const {getLanggue} = require('../utils/Validate.js');


var customerCtrl={};

customerCtrl.importDataInfo  =async  function(req, res) {
  res.send(JSON.stringify({path:req.file.path,
    file:req.file,
    url:urlStaticLink+ '/uploads/datas/'+ req.file.filename})
  );

 /* var url= await uploadFileS3(req.file.path,req.file.filename);
  if(url!=null) returnOKCustom(res,{url:url});
  else returnNotFound(res,"Not upload file",WarningInfo.NOT_UPLOAD_FILE);*/
}
customerCtrl.importData = function(req, res) {
  returnFalse(res,"");
}
                          
customerCtrl.getTableData = async function (req, res) {
    var startPage=0;
    if(!!req.body.startPage) startPage=req.body.startPage;
    var tableSelect=mangerModelUser(req.body.table);
    if(tableSelect==false) return returnNotFound(res,{ message: "Database Not Acess 2"},WarningInfo.NOT_ACESS_DATABASE); 
    var checkInaval = tableSelect.checkManifestSpecialCustomer("view");
    if(!checkInaval) return returnNotFound(res,{ message: "Database Not Acess 2"},WarningInfo.NOT_ACESS_DATABASE);     
    startPage =startPage*1000;
    var infoData = await tableSelect.getAllDataInTableCustomer(req,startPage);
    return returnInfoQuery(res,infoData);
}


                      
customerCtrl.getTableDataByGroup = async function (req, res) {
    var table =req.body.table;
    var startPage=0;
    if(!!req.body.startPage) startPage=req.body.startPage;
    var tableSelect=mangerModelUser(table);
    var checkInaval = tableSelect.checkManifestSpecialCustomer("view");
    if(!checkInaval)  return returnNotFound(res,{ message: "Database Not Acess 2"},WarningInfo.NOT_ACESS_DATABASE);
    startPage =startPage*1000;
    var infoData = await tableSelect.getAllDataInTableCustomer(req,startPage);
    return returnInfoQuery(res,infoData);
}
                       
customerCtrl.getNumberPages = async function (req, res) {
    var table =req.body.table;
    var tableSelect=mangerModelUser(table);
    var checkInaval = tableSelect.checkManifestSpecialCustomer("view");
    if(!checkInaval)  return returnNotFound(res,{ message: "Database Not Acess 2"},WarningInfo.NOT_ACESS_DATABASE);
    var itemSelect=tableSelect.getValueToSelectToFind(req.body.dataFind);
    var dataTableSQL= "SELECT COUNT(*) FROM " + tableSelect.getNameTable() + " where deleteflag=0 "+itemSelect;
    var infoData = await tableSelect.queryDatabaseDetail(dataTableSQL);
    return returnInfoQuery(res,infoData)
}

customerCtrl.addDataToTable= async  function (req, res) {
    var table =req.body.table;
    var tableSelect=mangerModelUser(table);
    let data=req.body;
    if(!tableSelect.checkDataAddDatabaseCustomer(req.currentUser.permission_id)){
      return returnNotFound(res,{ message: "Database inval" });
    }
    var checkInaval = tableSelect.checkManifestSpecialCustomer("add");
    if(!checkInaval){
      return returnNotFound(res,{ message: "Database Not Acess 2"},WarningInfo.NOT_ACESS_DATABASE);
    }      
    let infoShortName = tableSelect.getFieldLinkShort();
    if(infoShortName!=null){
      req.body[infoShortName.data] = await tableSelect.getTagName(tableSelect.getNameTable(),infoShortName.data,req.body[infoShortName.valueSetup]);
    }

    var infoData = await tableSelect.checkSqlAddAdmin(req,data);   
    return returnInfoQuery(res,infoData);
}

customerCtrl.deleteData= async function (req, res) {
  var tableSelect=mangerModelUser(req.body.table);
  if(!tableSelect.checkDataDeleteDatabaseCustomer(req.currentUser.permission_id))  
  {
    return returnFalse(res,{ message: "Database not access lv1" },WarningInfo.NOT_ACESS_DATABASE);
  }
  var checkInaval = tableSelect.checkManifestSpecialCustomer("edit");
  if(checkInaval==false) return returnNotFound(res,{ message: "Database Not Acess 2"},WarningInfo.NOT_ACESS_DATABASE);
  if(!await tableSelect.checkDataToEdit(req)){
    return returnFalse(res,{ message: "Database not access lv2" },WarningInfo.NOT_ACESS_DATABASE);
  }
  let data=req.body;
  var infoData = await tableSelect.deleteOneRecord(req,data);   
  return returnInfoQuery(res,infoData)
}



customerCtrl.updateData= async  function (req, res) {
  var tableSelect=mangerModelUser(req.body.table);  
  if(tableSelect==false) return returnNotFound(res,{ message: "Database Not Acess . Not exsitting table"},WarningInfo.NOT_ACESS_DATABASE);
  var checkInaval = tableSelect.checkManifestSpecialCustomer("edit");
  if(!checkInaval){
    return returnNotFound(res,{ message: "Database Not Acess "},WarningInfo.NOT_ACESS_DATABASE);
  }
  if(!tableSelect.checkDataEditDatabaseCustomer(req.currentUser.permission_id)){
    return returnNotFound(res,{ message: "Database not Acess" },WarningInfo.NOT_ACESS_DATABASE);
  }
  if(!await tableSelect.checkDataToEdit(req)){
    return returnNotFound(res,{ message: "Database not Acess" },WarningInfo.NOT_ACESS_DATABASE);
  }
  let data=req.body;
  var dataAdd= await knex.raw(tableSelect.addRecordIsExisting(req));
  if((dataAdd==null)||(dataAdd.length<1)) return returnNotFound(res,"Không tồn tại bản ghi dữ liệu này",WarningInfo.DATA_NOT_EXSITING);     
  var deleteAdd= await knex.raw(tableSelect.deleteFlagToRecord(req,dataAdd[0].insertId));
  if((deleteAdd==null)||(deleteAdd.length<1)) return returnFalse(res,"Lỗi cập nhật dữ liệu",WarningInfo.ERROR_SERVER);
  let infoShortName = tableSelect.getFieldLinkShort();
    if(infoShortName!=null){
      req.body[infoShortName.data] = await tableSelect.getTagName(tableSelect.getNameTable(),infoShortName.data,req.body[infoShortName.valueSetup]);
  }
  var infoData = await tableSelect.checkSqlUpdateAdmin(req,data);   
  return returnInfoQuery(res,infoData)     
}

customerCtrl.registerUser = async function (req, res) {
    var table ='customer';
    var tableSelect=mangerModelUser(table);
    checkDatataBaseInval=true;
    var userToget = squel.select().from('customer').
                        where( squel.expr()
                                    .and("phone='"+req.body["phone"]+"'")
                                    .or("email='"+req.body["email"]+"'")
                        ).where("deleteflag=0");
    var result = await knex.raw(userToget.toString());
    if(result!=null&&result[0].length>0) 
        return returnFalse(res,{ message: "phone and email is existing" } ,WarningInfo.ACCAO_EXSITING);
    let data=req.body;
    let dataUser=  tableSelect.getFieldToAdd();//  DataTableFieldAdd[table];
    var authen = squel.insert().into(tableSelect.getNameTable());
    for(var i=0;i<dataUser.valueSetup.length;i++){
        let item=dataUser.valueSetup[i];
        if(!!!data[item]) authen.set(item,null);
        else
        authen.set(item,data[item]);
    }
    const salt = await bcrypt.genSalt(12);
              // now we set user password to hashed password
    var passwordData = await bcrypt.hash(data["password"], salt);
    authen.set("password",passwordData);

    authen.set("id_created",0).set("id_updated",0)
          .set("created_at","NOW()",{dontQuote: true}) 
          .set("updated_at","NOW()",{dontQuote: true})
          .set("deleteflag",0);
    result = await  knex.raw(authen.toString());
    if(result==null||result[0].length<1)   return returnFalse(res,error,WarningInfo.DATA_WORNG);
    return returnOK(res,{result:"Please waitting admin comfirm"});
}

customerCtrl.resetPass= async function  (req, res) {
  //var acount="SELECT * FROM users " +request.body;
  var authen = squel.select().from('customer')
                        .where("email='"+data["email"]+"'")
                        .where("forgot_pass_token='"+data["forgot_pass_token"]+"'")
                        .where("deleteflag=0");
   var result= await knex.raw(authen.toString());
   if ((result==null)||(result.length==0)) {
    return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.ACOUNT_NOT_EXIST);
   }
   ////mailBoxSupport.sendEmailNomal(result[0]["add_table"].email,"please comfirm email "+result[0]["add_table"].forgot_pass_token)
}

customerCtrl.changePassword= async function(req, res) {
  //var acount="SELECT * FROM users " +request.body;
  var authen = squel.select().from('customer')
                        .where("email='"+data["email"]+"'")
                        .where("forgot_pass_token='"+data["forgot_pass_token"]+"'")
                        .where("deleteflag=0");
   var result= await knex.raw(authen.toString());
   if ((result==null)||(result.length==0)) {
      return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.ACOUNT_NOT_EXIST);
   }
   result[0][0].currentUser={users_id:0};
   result[0][0].table='customer';
  //mailBoxSupport.sendEmailNomal(result[0]["add_table"].email,"đổi mat khau thanh cong")
   updateData(result[0][0],res);
}

customerCtrl.getAllAdvertisementContent  = async function(req, res) {
  var sql= "SELECT group_content_sub_id,group_file,filesave,title,content,content_img FROM advertisement_content WHERE deleteflag =0 ORDER BY set_to_fist ,advertisement_id DESC LIMIT 10 ";
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
      return x[0];
  }
  return returnOK(res,[]);
}

function getAllInfoProductInList(product_group,start,end){
  var sql = '';
  if(start==end) {
    sql = ` SELECT  COUNT(product_store.store_product_id)  as number_store `;
  } 
  else{
    sql = 'SELECT product_store.*,product.product_group_id,product_image.cost_real,product.store,'
  +' product_image.promotion , product.name,product.detail,product.image , product.name_short, '
  +' product_image.name_image_detail ,product_image.image_info_detail ,'
  +' product_image.cost_detail '
  }
  sql= sql +' FROM product ' 
  +' LEFT  JOIN product_store on  product_store.product_id= product.product_id '
  +' LEFT JOIN product_image on product_image.image_id=product_store.image_id '
  +' WHERE product.deleteflag =0  '
  +' AND product_store.store_product_id=( SELECT MIN(product_store.store_product_id) testID '
  +' FROM product_store WHERE  product_store.product_id= product.product_id )';

  if(product_group==0){
    if(start!=end){
      sql = sql +' LIMIT '+start+','+end+';';
    }
    return sql;
  }else{
    sql = sql+'AND product.product_group_id in ('+product_group+') ';
  }
  if(start==end){
    return sql;
  }
  sql = sql +'LIMIT '+start+','+end+';';
  return sql;
}


function getAllInfoProductDetailCompany(company_id,start,end,product_group = -1){
  var sql = '	SELECT product_store.*,product.product_group_id,product_image.cost_real,product.store,'
  +' product_image.promotion , product.name,product.detail,product.image,product.name_short ,'
  +' product_image.name_image_detail ,product_image.image_info_detail ,'
  +' product_image.cost_detail  FROM product '
  +' LEFT  JOIN product_store on  product_store.product_id= product.product_id '
  +' LEFT JOIN product_image on product_image.image_id=product_store.image_id '
  +' WHERE product.deleteflag =0  '
  +' AND product_store.store_product_id=( SELECT MIN(product_store.store_product_id) testID '
  +' FROM product_store WHERE  product_store.product_id= product.product_id ) AND';
  if(product_group!=undefined &&product_group>0) 
          sql = sql + ` product.product_group_id = ${product_group} AND `; 

  sql = sql +'  product.company_id = '+company_id+' LIMIT '+start+','+end+';';
  return sql;
}


customerCtrl.getAllInfoProduct  = async function(req, res) {
  var sql =  getAllInfoProductInList(req.query.type,0,3);

  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}

customerCtrl.getAllInfoAdvertisementProduct  = async function(req, res) {
  var sql= "SELECT advertisement_content.*,product_store.product_id,product.name_short, product.name,product.detail,product.image,product_image.cost_real, product_image.promotion ,product_image.name_image_detail ,product_image.image_info_detail ,product_image.cost_detail FROM advertisement_content LEFT JOIN product_store on product_store.store_product_id=advertisement_content.store_product_id LEFT JOIN product on product_store.product_id=product.product_id LEFT JOIN product_image on product_image.image_id=product_store.image_id WHERE advertisement_content.deleteflag =0 ORDER BY advertisement_content.set_to_fist ,advertisement_content.advertisement_id DESC LIMIT 10";
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}

customerCtrl.getAllInfoAdvertisementFromID  = async function(req, res) {
  var sql= "SELECT advertisement_content.*,product_store.product_id, product.name,product.detail,product.image,product_image.cost_real, product_image.promotion ,product_image.name_image_detail ,product_image.image_info_detail ,product_image.cost_detail FROM advertisement_content LEFT JOIN product_store on product_store.store_product_id=advertisement_content.store_product_id LEFT JOIN product on product_store.product_id=product.product_id LEFT JOIN product_image on product_image.image_id=product_store.image_id WHERE advertisement_content.deleteflag =0 ORDER BY advertisement_content.set_to_fist ,advertisement_content.advertisement_id DESC LIMIT 10";
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}
customerCtrl.getAllInfoAdvertisementProductFromID  = async function(req, res) {
  var sql= "SELECT advertisement_product.*,product_group.product_group_content FROM advertisement_product LEFT JOIN product_group on product_group.product_group_id=advertisement_product.group_product_id  WHERE advertisement_product.deleteflag=0 AND group_product_id in ("+
      req.body.data.toString() +")  LIMIT 0,1000";
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}



customerCtrl.getInfoProduct  = async function(req, res) {
  var sql= "SELECT product_store.*,product.name,product.detail,product.image FROM product_store LEFT JOIN product on product_store.product_id=product.product_id WHERE product_store.deleteflag =0  AND product.store="+ req.body["type"];
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}

customerCtrl.getInfoProductStore = async function(req, res) {
  var sql = getAllInfoProductInList(req.body["product_group"],req.body["start"],req.body["end"]); 
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}


customerCtrl.getDetailProduct  = async function(req, res) {
  
  var sql= `SELECT product_image.*,product.name,product.company_id,company.companyname,product.detail,product.store,
            product_store.store_product_id,product_store.number,product_store.contain,
            product.image,product_store.content,product_store.number ,product_store.contain 
            FROM product_image LEFT JOIN product on product_image.product_id=product.product_id 
            LEFT JOIN product_store on product_image.image_id=product_store.image_id 
            LEFT JOIN company on company.company_id=product.company_id 
            WHERE product_image.deleteflag =0 AND product_image.product_id=`
          + req.query.type +"   AND product_store.deleteflag =0";
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}


customerCtrl.getDetailShop  = async function(req, res) {
  var sql= "SELECT social_shop.* FROM social_shop  WHERE social_shop.deleteflag =0 AND social_shop.product_id="
          + req.query.type;
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}



customerCtrl.getAllInfoServices  = async function(req, res) {
  var sql= "SELECT * FROM service WHERE deleteflag =0 ORDER BY  service_id DESC LIMIT 10 ";
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
      return x[0];
  }
  return returnOK(res,[]);
}


customerCtrl.setDataInBill = async (req, res) => {
  try{
      let data = req.body;
      let userid = req.currentUser.users_id;
      var tableSelect=mangerModelUser('product_buy');
      var sqlBuyproduct =tableSelect.buyProductSQL(userid,0,data);
      var x= await knex.raw(sqlBuyproduct);
      // if ((customerSql==null)||(customerSql.length==0)) {
      //   return returnNotFound(res,{ message: "Not find Sql "});
      // }
      if ((x==null)||(x.length==0)) {
        return returnNotFound(res,{ message: "Not find Sql "},WarningInfo.NOT_ACESS_DATABASE);
      }
      var sqlStringProduct= "INSERT INTO product_buy_detail (buyproduct_id,image_id, quantity, KM, created_at, updated_at, id_created, id_updated, deleteflag, oldid) VALUES ";
      var thefist=false;
      data.value.forEach(element => { 
        if(thefist) sqlStringProduct =sqlStringProduct +",";
        var addCustomer = '('+x[0].insertId+','+element.imageInfo.image_id+','+element.number+
                            ',0,NOW(),NOW(),'+userid+','+userid+',0,0)';
        sqlStringProduct = sqlStringProduct + addCustomer;
        thefist=true;
    });
    var databuyProduct= await knex.raw(sqlStringProduct);
    if ((databuyProduct!=null)&&(databuyProduct.length>0)) {
        return returnOK(res,x[0].insertId);
    }
  }
  catch(ie){
    return returnNotFound(res,{ message: ie.toString()},WarningInfo.ERROR_SERVER);
  }
  return returnNotFound(res,{ message: "Not find Sql "},WarningInfo.DATA_NOT_EXSITING);
}
  


customerCtrl.setTheBillData  = async function(req, res) {
  try{
      let data=req.body;
      var dataBill=[];
      var userid=req.currentUser.users_id;
      let tableSelect=mangerModelUser('product_buy');
      var lstCompany = [];
      for(var i=0;i<data.value.length;i++){
          let item =data.value[i].imageInfo;
          if(!lstCompany.includes(item.company_id)){
            lstCompany.push(item.company_id);
          }
      }
      for(var i=0;i<lstCompany.length;i++){
        let saleId= await tableSelect.getSaleInfo(lstCompany[i]);
        var dataInTheBill ={KM:data.KM,Total:data.Total,address:data.address,avatar:data.avatar
                            ,customer_id:data.customer_id,email:data.email,fullname:data.fullname
                            ,name:data.name,permission_id:data.permission_id,phone:data.phone,
                            username:data.username};
        dataInTheBill.value = [];
        var Total =0;
        for(var j=0;j<data.value.length;j++){
            let item = data.value[j];
            if(lstCompany[i]==item.imageInfo.company_id){
                Total = Total+item.number*item.imageInfo.cost_detail;
                dataInTheBill.value.push(item);
            }
        }
        dataInTheBill.Total = Total;
        var sqlBuyproduct =tableSelect.buyProductSQL(userid,saleId,dataInTheBill);
        var x= await knex.raw(sqlBuyproduct);
        var sqlStringProduct= "INSERT INTO product_buy_detail (buyproduct_id,image_id, quantity, KM, created_at, updated_at, id_created, id_updated, deleteflag, oldid) VALUES ";
        var thefist=false;
        dataInTheBill.value.forEach(element => { 
            if(thefist) sqlStringProduct =sqlStringProduct +",";
            var addCustomer = '('+x[0].insertId+','+element.imageInfo.image_id+','+element.number+
                                ',0,NOW(),NOW(),'+userid+','+userid+',0,0)';
            sqlStringProduct = sqlStringProduct + addCustomer;
            thefist=true;
        });
        var databuyProduct= await knex.raw(sqlStringProduct);
        dataBill.push({bill:x[0].insertId});
        if ((databuyProduct!=null)&&(databuyProduct.length>0)) {
          await mesageBox.sendTheWarningThebill(saleId,"Có đơn hàng",
          "Đã có đơn hàng đến xin vui lòng kiểm tra trên admin (https://www.choxanh4mua.com/cong-ty/#/) . Mã đơn hàng "+ x[0].insertId);
        }
        else
        {
          return returnNotFound(res,{ message: "Not find Sql "},WarningInfo.DATA_NOT_EXSITING);
        }
      }
      return returnOK(res,dataBill);
  }
  catch(ie){
    return returnNotFound(res,{ message: ie.toString()},WarningInfo.ERROR_SERVER);
  }
  return returnNotFound(res,{ message: "Not find Sql "},WarningInfo.DATA_NOT_EXSITING);
}

customerCtrl.registerNewCustomer = async function(req, res) {
  var table =req.body.table;
    var tableSelect=mangerModelAdmin(table);
    let data=req.body;
    if(!tableSelect.checkDataAddDatabase(req.currentUser.permission_id,tableSelect.getTypeTable())){
      return returnNotFound(res,{ message: "Database inval" },WarningInfo.NOT_ACESS_DATABASE);
    }
    var checkInaval =await tableSelect.checkManifestSpecialTable(table,req);
    if(!checkInaval){
      return returnNotFound(res,
                { message: "Tài khoản đã tồn tại hoặc chưa được cấp quyền cao hơn"}
                  ,WarningInfo.NOT_ACESS_DATABASE);
    } 
    var infoData = await tableSelect.checkSqlAddAdmin(req,data);   
    return returnInfoQuery(res,infoData)
  

}


customerCtrl.getDetailTheBill  = async function(req, res) {
  var dataThebill = {bill:null,data:[]};
  var sql= "SELECT product_buy_detail.*,product_image.*,product.name FROM product_buy_detail  LEFT JOIN product_image on product_buy_detail.image_id=product_image.image_id LEFT JOIN product on product.product_id=product_image.product_id  WHERE product_buy_detail.deleteflag =0 AND product_buy_detail.buyproduct_id in ("+ req.body['bill'] +")";
  if(req.body.hasOwnProperty("is_s_lock")) return returnOK(res,[]);
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  dataThebill.data = x[0];
  sql= "SELECT product_buy.* FROM product_buy  WHERE buyproduct_id ="+ req.body['bill'] +"  AND deleteflag=0";
  if(req.body.hasOwnProperty("phone_info_lock")){
    sql = sql + ` AND phone LIKE "${req.body.phone_info_lock}" ;` ;
  }
  var x1= await knex.raw(sql);
  if ((x1==null)||(x1.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  dataThebill.bill = x1[0][0];
  return returnOK(res,dataThebill);
}
customerCtrl.getLstProduct  = async function(req, res) {
  var sql= "SELECT product.* FROM product   WHERE deleteflag =0 AND product_id in ("+ req.body['product_id'] +")";
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}

customerCtrl.getDetailAllTheBill  = async function(req, res) {
  var sql= "SELECT product_buy.* FROM product_buy  where deleteflag=0 AND customer_id="+ req.currentUser.users_id;
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}

customerCtrl.getDetailAllTheBillCancel  = async function(req, res) {
  var sql= "SELECT product_buy_return.* FROM product_buy_return  where deleteflag=0 AND customer_id="+ req.currentUser.users_id;
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}


customerCtrl.getDetailAllProductBack  = async function(req, res) {
  var sql= "SELECT product_back.* FROM product_back  where deleteflag=0 AND id_created="+ req.currentUser.users_id;
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}

customerCtrl.getDetailProductPages  = async function(req, res) {
    var product_pages = squel.select().from('product_pages')
                          .where("product_id="+req.query.type)
                          .where("deleteflag=0");
    var result= await knex.raw(product_pages.toString());
    if ((result==null)||(result.length==0)) {
        return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
    }
    return returnOK(res,result[0]);
}

customerCtrl.getAllinfoUserChat  = async function(req, res) {
  if(req.body.info.length==0) return returnOK(res,[]);
  var customer = "SELECT customer.customer_id,customer.username,customer.avatar FROM customer where deleteflag=0 AND customer_id in ("+req.body.info+");";
  var result= await knex.raw(customer);
  if ((result==null)||(result.length==0)) {
      return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.ACCAO_NOT_EXSITING);
  }
  return returnOK(res,result[0]);
}

customerCtrl.getAllinfoNewProduct  = async function(req, res) {

  var sql =  getAllInfoProductInList(req.body["product_group"],0,3);
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}


customerCtrl.customerInCompany = async function (req, res) {
  var sql =`
      SELECT company_of_customer.* FROM  company_of_customer WHERE company_of_customer.company_id in
        (SELECT product.company_id FROM  product WHERE product.product_id in  
            (SELECT product_image.product_id FROM product_image WHERE product_image.image_id in (${req.body.data}) and product_image.deleteflag =0 GROUP BY  product_image.product_id)
          AND product.deleteflag =0  GROUP BY  product.company_id) 
      AND company_of_customer.deleteflag =0;`;


  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
  
}


customerCtrl.getLstCustomerBill  = async function(req, res) {
      var sql= "SELECT product_buy.* FROM product_buy  WHERE customer_id ="+ req.currentUser.users_id +"  AND deleteflag=0";
      var x= await knex.raw(sql);
      if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
      return returnOK(res,x[0]);
}

customerCtrl.cancelCustomerBill  = async function(req, res) {
//status = 40
  var sql= "SELECT product_buy.* FROM product_buy WHERE customer_id="+ req.currentUser.users_id + " AND buyproduct_id = "+req.body.buyproduct_id +"  AND deleteflag=0";
  var x= await knex.raw(sql);
  if ((x==null)||(x[0].length==0))  return returnNotFound(res,{ message: "data Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  var tableSelect=mangerModelUser("product_buy"); 
  req.body = x[0][0];
  req.body.table = "product_buy";
  req.body.status = 40;
  var dataAdd= await knex.raw(tableSelect.addRecordIsExisting(req));
  if((dataAdd==null)||(dataAdd.length<1)) return returnNotFound(res,"Không tồn tại bản ghi dữ liệu này",WarningInfo.DATA_NOT_EXSITING);     
  var deleteAdd= await knex.raw(tableSelect.deleteFlagToRecord(req,dataAdd[0].insertId));
  if((deleteAdd==null)||(deleteAdd.length<1)) return returnFalse(res,"Lỗi cập nhật dữ liệu",WarningInfo.ERROR_SERVER); 
  var infoData = await tableSelect.checkSqlUpdateAdmin(req,req.body);   
  return returnInfoQuery(res,infoData);     
}

customerCtrl.customerBuyAgainBill  = async function(req, res) {

    var sql= "SELECT product_buy.* FROM product_buy  WHERE customer_id="+ req.currentUser.users_id + " AND buyproduct_id = "+req.body.buyproduct_id +"  AND deleteflag=0";
    var x= await knex.raw(sql);
    if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "data Not exitting "},WarningInfo.DATA_NOT_EXSITING);
    sql= "SELECT product_buy_detail.* FROM product_buy_detail  WHERE buyproduct_id = "+req.body.buyproduct_id +"  AND deleteflag=0";
    var detail= await knex.raw(sql);
    if ((detail==null)||(detail.length==0))  return returnNotFound(res,{ message: "Product Not exitting "},WarningInfo.DATA_NOT_EXSITING);
    sql= "SELECT product_store.* FROM product_store  WHERE ";
    detail[0].forEach((element,index) => {
      if(index>0)   sql = sql +" OR "
      sql = sql + " image_id="+ element.image_id ;
    });
    sql =  sql+ " AND deleteflag=0 AND contain<number";
    var detail1= await knex.raw(sql);
    if ((detail1==null)||(detail1.length==0))  return returnNotFound(res,{ message: "Product Not exitting "},WarningInfo.DATA_NOT_EXSITING);

    let data=x[0][0];
    var userid=req.currentUser.users_id;
    let tableSelect=mangerModelUser('product_buy');
    var sqlBuyproduct =tableSelect.buyProductSQL(userid,0,data);
    var xa= await knex.raw(sqlBuyproduct);
    var sqlStringProduct= "INSERT INTO product_buy_detail (buyproduct_id,image_id, quantity, KM, created_at, updated_at, id_created, id_updated, deleteflag, oldid) VALUES ";
    var thefist=false;

    detail[0].forEach(element => { 
        if(thefist) sqlStringProduct =sqlStringProduct +",";
        var addCustomer = '('+xa[0].insertId+','+element.image_id+','+element.quantity+
                            ',0,NOW(),NOW(),'+userid+','+userid+',0,0)';
        sqlStringProduct = sqlStringProduct + addCustomer;
        thefist=true;
    });
    var databuyProduct= await knex.raw(sqlStringProduct);
    if ((databuyProduct!=null)&&(databuyProduct.length>0)) {
        return returnOK(res,xa[0].insertId);
    }
  
    return returnOK(res,xa[0]);
}


customerCtrl.getStatusOrder  = async function(req, res) {
      var sql=  "SELECT product_buy.* FROM product_buy  WHERE customer_id="+ req.currentUser.users_id + " AND buyproduct_id = "+req.body.buyproduct_id +";";
      var x= await knex.raw(sql);
      var infoData = {};
      if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
      infoData.product_buy = x[0];
      sql=  "SELECT product_buy_return.* FROM product_buy_return  WHERE  product_buy_return.buyproduct_id = "+req.body.buyproduct_id +";";
      x= await knex.raw(sql);
      if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
      infoData.product_buy_return = x[0];

      return returnOK(res,infoData);
}

customerCtrl.searchLocation  = async function(req, res) {
      let dataInfo = req.body; //"city_id","province_id","village_id"
      var sql=  ` SELECT product_store.*,product.name as product_name,product.detail as product_detail ,
                        product.image, company.companyname,address.streetaddr `;

      if(dataInfo.hasOwnProperty("count_data")&&dataInfo.count_data==true){
          sql = ` SELECT  COUNT(product_store.store_product_id)  as number_store `;
      }
      sql = sql + ` FROM product_store 
                        LEFT JOIN product on product.product_id = product_store.product_id
                        LEFT JOIN company on company.company_id = product_store.company_id
                        LEFT JOIN address on address.addr_id = product_store.addr_id WHERE 
                        product_store.store_product_id=( SELECT MIN(product_store.store_product_id) 
                        testID  FROM product_store WHERE  product_store.company_id= product.company_id ) AND `;

      var addAnd = false;
      if(dataInfo.village!=0){
          sql= sql +"  village_id = "+dataInfo.village;
          addAnd = true;
      }
      if(dataInfo.province!=0){
          if(addAnd) sql= sql + " AND ";
          sql= sql +" village_id = "+dataInfo.province;
          addAnd = true;
      }
      if(dataInfo.city!=0){
          if(addAnd) sql= sql + " AND ";
          sql= sql +" village_id = "+dataInfo.city;
          addAnd = true;
      }
      if(dataInfo.nameLocation.length>2){
          if(addAnd) sql= sql + " AND ";
          sql = sql + ` ( product_store.content LIKE '%${dataInfo.nameLocation}%'  
                          OR address.streetaddr LIKE  '%${dataInfo.nameLocation}%' 
                          OR company.companyname LIKE  '%${dataInfo.nameLocation}%'
                          OR product.name LIKE '%${dataInfo.nameLocation}%') `;
      }
      sql = sql + ` AND product_store.deleteflag =0  `;

      if(dataInfo.hasOwnProperty("start")&&dataInfo.hasOwnProperty("end")){
        sql = sql + ` LIMIT `+dataInfo.start+","+dataInfo.end+" ";
      } else  {
        if(!dataInfo.hasOwnProperty("count_data"))
        {
          sql = sql + ` LIMIT 0,1000 `;
        }
      }
      sql = sql +";";
      var x= await knex.raw(sql);
      if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
      return returnOK(res,x[0]);
}

customerCtrl.searchProduct  = async function(req, res) {
  var sql=  "SELECT product.* FROM product  LEFT JOIN company on company.company_id = product.company_id  ";
  sql = sql + ` LEFT JOIN product_store on product_store.product_id = product.product_id `;
  sql = sql + ` WHERE product.deleteflag =0 AND product_store.number>product_store.contain AND product.name LIKE '%${req.body.productname}%' ;`;
  
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}

customerCtrl.getProductOfShop  = async function(req, res) {
  let dataInfo = req.body;
  var sql=  `SELECT  product_store.*,product.name as product_name,product.detail as product_detail ,
                product.image, company.companyname,address.streetaddr,product_image.cost_detail ,product_image.cost_real  FROM product_store `
  if(dataInfo.hasOwnProperty("count_data")&&dataInfo.count_data==true){
                  sql = ` SELECT  COUNT(product_store.store_product_id)  as number_store  FROM product_store `;
  }              
  sql= sql+   ` LEFT JOIN product_image on product_image.image_id = product_store.image_id
                LEFT JOIN product on product.product_id = product_store.product_id
                        LEFT JOIN company on company.company_id = product_store.company_id
                        LEFT JOIN address on address.addr_id = product_store.addr_id WHERE  `;

  sql = sql + `(  address.streetaddr LIKE  '%${dataInfo.nameLocation}%'
                OR company.companyname LIKE  '%${dataInfo.nameLocation}%'
                OR product.name LIKE '%${dataInfo.nameLocation}%') AND product_store.deleteflag =0 AND  product_image.image_id= ( SELECT MIN(product_image.image_id) testID	FROM product_image WHERE  product_image.product_id= product_store.product_id) `;
    if(dataInfo.hasOwnProperty("start")&&dataInfo.hasOwnProperty("end")){
      sql = sql + ` LIMIT `+dataInfo.start+","+dataInfo.end+" ";
    } else  {
      if(!dataInfo.hasOwnProperty("count_data"))
      {
        sql = sql + ` LIMIT 0,1000 `; 
      }
    }

  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);

}
customerCtrl.searchGroupCompany  = async function(req, res) {
  let dataInfo = req.body; 
  var SQLSearch = '';
  if(dataInfo.village!=0){
      SQLSearch = ` AND group_company.village_id =${dataInfo.village} `;
  }
  else{
    if(dataInfo.province!=0){
        SQLSearch = ` AND group_company.village_id in (SELECT village.village_id FROM village WHERE village.province_id = ${dataInfo.province})`;
    }
  }
  var sql=  "SELECT group_company.* FROM group_company ";
  sql = sql + ` WHERE group_company.deleteflag =0 ${SQLSearch} `;
  if(dataInfo.nameLocation!=null&&dataInfo.nameLocation.length>2) sql = sql + ` AND group_company.name_group_company LIKE '%${req.body.productname}%' ;`;
  else  sql = sql + ` ;`;
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);

}

customerCtrl.getGroupCompany  = async function(req, res) {
  

  var sql=  "SELECT group_company_detail.*,company.companyname  FROM group_company_detail ";
  sql = sql + ` LEFT JOIN company on group_company_detail.company_id = company.company_id `;
  sql = sql + ` WHERE group_company_detail.deleteflag =0 AND group_company_detail.group_company_id=${req.body.group_company_id} LIMIT 0,1000;`;
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  let dataReturn = x[0];
  var dataTosearch =[];
  if(dataReturn.length==0)  return returnOK(res,{company:[],product:[]});
  for(var i=0;i<dataReturn.length;i++) dataTosearch.push(dataReturn[i].company_id);
  var sql = '	SELECT product_store.*,product.product_group_id,product_image.cost_real,'
  +' product_image.promotion , product.name,product.detail,product.image ,'
  +' product_image.name_image_detail ,product_image.image_info_detail ,'
  +' product_image.cost_detail  FROM product '
  +' LEFT  JOIN product_store on  product_store.product_id= product.product_id '
  +' LEFT JOIN product_image on product_image.image_id=product_store.image_id '
  +' WHERE product.deleteflag =0 AND product_store.deleteflag =0  '
  +' AND product_store.store_product_id=( SELECT MIN(product_store.store_product_id) testID '
  +' FROM product_store WHERE  product_store.product_id= product.product_id )'
  +'AND product.company_id in ('+dataTosearch+')  LIMIT '+0+','+1000+';';

  var xa= await knex.raw(sql);
  if ((xa==null)||(xa.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  
  return returnOK(res,{company:dataReturn,product:xa[0]});

}

customerCtrl.getInfoLoactionStore = async function(req, res) {
  var sql =` 	SELECT product_store.*,product.product_group_id,product_image.cost_real,
                    product_image.promotion , product.name,product.detail,product.image ,
                    product_image.name_image_detail ,product_image.image_info_detail ,
                    product_image.cost_detail ,company.companyname  FROM product 
                    LEFT  JOIN product_store on  product_store.product_id= product.product_id 
                    LEFT JOIN product_image on product_image.image_id=product_store.image_id 
                    LEFT JOIN company on company.company_id=product.company_id  
                    WHERE product.deleteflag =0  
                    AND product_store.store_product_id=( SELECT MIN(product_store.store_product_id) testID 
                    FROM product_store WHERE  product_store.company_id= product.company_id )
                    AND product.product_group_id in (${req.body["product_group"]}) LIMIT ${req.body["start"]},${req.body["end"]};`
  
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}


customerCtrl.getAllInfoProductCompany  = async function(req, res) {
      let dataInfo = req.body; //"city_id","province_id","village_id"
      var sql=  "";
      
      if(dataInfo.hasOwnProperty("count_data")&&dataInfo.count_data==true){
          sql = ` SELECT  COUNT(product.product_id)  as number_store `;
          sql = sql +' FROM product WHERE' ;
          if(dataInfo.company_id!=0)
              sql = sql + ` product.company_id = ${dataInfo.company_id} AND `;  
          if(dataInfo.hasOwnProperty("product_group")&&dataInfo.product_group>0)   sql = sql + ` product.product_group_id = ${dataInfo.product_group} AND `;  
          sql = sql +"  product.deleteflag =0;";

      }
      else
      {
        var sql=  getAllInfoProductDetailCompany(dataInfo.company_id,dataInfo.start,dataInfo.end,dataInfo.product_group);
      
      }
      var x= await knex.raw(sql);
      if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
      return returnOK(res,x[0]);
}

customerCtrl.getInfoshortName  = async function(option,addLogic="") {

  var sql=  ` SELECT ${option.type}.*   FROM ${option.type} Where 
              ${option.type}.${option.type_id} =  '${option.name}' AND ${option.type}.deleteflag =0 `+ addLogic;
  var x= await knex.raw(sql);
  if((x==null)||(x.length==0))  return -1;
  if((x[0]==null)||(x[0].length==0))  return -1;
  let data = x[0][0];
  if(option.hasOwnProperty("colume")) return data[option.colume];
  return x[0][0];
}

customerCtrl.getInfoOfCompany  = async function(req, res) {
  var sql=  ` SELECT company.*   FROM company Where 
                company.company_id =  ${req.body.company_id} AND company.deleteflag =0`;

  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}

customerCtrl.getInfoGroupProductCompany  = async function(req, res) {
  var sql=  `SELECT product_group.*   FROM product_group Where 
              product_group.id_created =  (SELECT company.id_created   FROM company Where 
              company.company_id =${req.body.id_group} AND company.deleteflag =0) AND product_group.deleteflag =0`;
            
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}


customerCtrl.getInfoLoactionStore = async function(req, res) {
  var sql =` 	SELECT product_store.*,product.product_group_id,product_image.cost_real,
                    product_image.promotion , product.name,product.detail,product.image ,
                    product_image.name_image_detail ,product_image.image_info_detail ,
                    product_image.cost_detail ,company.companyname  FROM product 
                    LEFT  JOIN product_store on  product_store.product_id= product.product_id 
                    LEFT JOIN product_image on product_image.image_id=product_store.image_id 
                    LEFT JOIN company on company.company_id=product.company_id  
                    WHERE product.deleteflag =0  
                    AND product_store.store_product_id=( SELECT MIN(product_store.store_product_id) testID 
                    FROM product_store WHERE  product_store.company_id= product.company_id )
                    AND product.product_group_id in (${req.body["product_group"]}) LIMIT ${req.body["start"]},${req.body["end"]};`
  
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}

customerCtrl.getInfoCompanyTopStore = async function(req, res) {
  var sql =`SELECT company.* FROM company  WHERE company.deleteflag =0 ORDER BY company.top DESC LIMIT ${req.body["start"]},${req.body["end"]};`
  var x= await knex.raw(sql);
  if ((x!=null)&&(x.length>0)) {
      return returnOK(res,x[0]);
  }
  return returnOK(res,[]);
}


customerCtrl.saveUserInfo = async function(req, res) {
    if(req.body.customer_id!=req.currentUser.users_id) 
        return returnNotFound(res,{ message: "acao Not Manefist "},WarningInfo.NOT_ACESS_DATABASE);
    let data=req.body;
    if(req.body.isUpdatePassWord){
      if(data.old.length<8||data.password.length<8)  returnFalse(res,"Lỗi cập nhật dữ liệu", WarningInfo.WORNG_FORMAT);  
      var user = await Customer.query().where({customer_id:req.currentUser.users_id, deleteflag: 0}).first().fetch({ require: false });
      var resultData =null;
      if (user) {
        resultData= await bcrypt.compare(data.old,  user.password);
      }
      if(resultData==false) return returnNotFound(res,{ message: "acao Not Manefist "}
                                                      ,WarningInfo.NOT_ACESS_DATABASE);
    }

    var table ='customer';
    var tableSelect=mangerModelUser(table);
    var dataAdd= await knex.raw(tableSelect.addRecordIsExisting(req));
    if((dataAdd==null)||(dataAdd.length<1)) 
        return returnNotFound(res,"Không tồn tại bản ghi dữ liệu này", WarningInfo.DATA_NOT_EXSITING);     
    var deleteAdd= await knex.raw(tableSelect.deleteFlagToRecord(req,dataAdd[0].insertId));
    if((deleteAdd==null)||(deleteAdd.length<1)) 
        return returnFalse(res,"Lỗi cập nhật dữ liệu", WarningInfo.DATA_NOT_EXSITING);  
    
    var updateInfo = squel.update().table(table);
    if(req.body.isUpdatePassWord) {  
        const salt = await bcrypt.genSalt(12);
        var passwordData = await bcrypt.hash(data["password"], salt);
        updateInfo.set("password",passwordData).set("id_updated",req.currentUser.users_id)
              .set("updated_at","NOW()",{dontQuote: true})
              .where('customer_id ='+req.currentUser.users_id);
        let result = await  knex.raw(updateInfo.toString());
        if(result==null||result[0].length<1)   return returnFalse(res,error,WarningInfo.DATA_WORNG);
        return returnOK(res,{result:"Data Update"});
    }
    else
    {
      var valueSetup= ["fullname","avatar","username","address","phone"];
      for(var i=0;i<valueSetup.length;i++){
        let item=valueSetup[i];
        updateInfo.set(item,data[item]);
      }
    }
    let result = await  knex.raw(updateInfo.toString());
    if(result==null||result[0].length<1)   return returnFalse(res,error,WarningInfo.DATA_WORNG);
    return returnOK(res,{result:"Data Update"});
}

customerCtrl.registerCustomer = async function(req, res) {
    let {customer,is_sale,company} = req.body;
    var tableSelect=mangerModelUser('customer');
    var userToget = squel.select().from('customer').
                        where( squel.expr()
                                    .and("phone='"+customer["phone"]+"'")
                                    .or("email='"+customer["email"]+"'")
                        );
    var result = await knex.raw(userToget.toString());
    if(result!=null&&result[0].length>0) 
        return returnFalse(res,{ message: "Số điện thoại hoặc email đã đăng ký, xin vui lòng sử dụng tài khoản khác" } ,WarningInfo.ACCAO_EXSITING);
    
    const salt = await bcrypt.genSalt(12);
              // now we set user password to hashed password
    var passwordData = await bcrypt.hash(customer["password"], salt);
    customer.password = passwordData;
    customer.permission_id = 0;
    if(is_sale) customer.permission_id = 1;
    var authen=  tableSelect.addRecodeData(customer,"customer",0,0);
    result = await  knex.raw(authen.toString());
    if(result==null||result[0].length<1)   return returnFalse(res,error,WarningInfo.DATA_WORNG);
    if(!is_sale)  return returnOK(res,{result:"Đăng ký thành công!"});
    company.top=0;
    authen=  tableSelect.addRecodeData(company,"company",result[0].insertId,2);
    var resultCompany = await  knex.raw(authen.toString());
    if(resultCompany==null||resultCompany[0].length<1)   return returnFalse(res,error,WarningInfo.DATA_WORNG);
    return returnOK(res,{result:"Xin vui lòng đợi Quản lý trang phản hồi lại."});
}


customerCtrl.regisisterCompany = async function(req, res) {
  let {company} = req.body;
  var editCus = squel.update().table("customer");
  editCus.where('customer_id='+req.currentUser.users_id)
  editCus.set("id_updated",req.currentUser.users_id)
  .set("updated_at","NOW()",{dontQuote: true})
  .set("permission_id",2);
  var x = await knex.raw(editCus.toString());

  var tableSelect=mangerModelUser('company');
  let infoShortName = tableSelect.getFieldLinkShort();
    if(infoShortName!=null){
      company["company_short"] = await tableSelect.getTagName(tableSelect.getNameTable(),"company_short",company["companyname"]);
    }
  company.top=0;
  authen=  tableSelect.addRecodeData(company,"company",req.currentUser.users_id,2);
  var resultCompany = await  knex.raw(authen.toString());
  if(resultCompany==null||resultCompany[0].length<1)   return returnFalse(res,error,WarningInfo.DATA_WORNG);
  return returnOK(res,{result:"Xin vui lòng đợi Quản lý trang phản hồi lại."});
}

customerCtrl.getAllBillInfoValue = async function(req, res) {
  var sql = `SELECT product_buy.*,product_buy_detail.* ,product_image.*,customer.fullname as customer_name
  ,customer.address as customer_address,customer.phone as customer_phone
  FROM product_buy 
  LEFT JOIN product_buy_detail ON  product_buy_detail.buyproduct_id = product_buy.buyproduct_id
  LEFT JOIN product_image on product_buy_detail.image_id=product_image.image_id
  LEFT JOIN customer on customer.customer_id=product_buy.customer_id
  WHERE product_buy.deleteflag=0 AND `;
  if(req.body.hasOwnProperty("status")) sql +=` product_buy.status= ${req.body.status} AND `;
  sql +=` product_buy.selled_id= ${req.currentUser.users_id} LIMIT 0,1000`;
  
  var resultCompany = await  knex.raw(sql);
  if(resultCompany==null||resultCompany[0].length<1)   return returnFalse(res,error,WarningInfo.DATA_WORNG);
  return returnOK(res,resultCompany[0]);
}

customerCtrl.getLastdayProductBuy  = async function(req, res) {
  var sql=  "select extract(YEAR from updated_at) as month,sum(Total) as total_value,COUNT(*) as total from product_buy  WHERE updated_at  >= now() - INTERVAL "+req.body.time
              +" day AND deleteflag = 0 AND selled_id= "+req.currentUser.users_id +" group by month ;";
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}

customerCtrl.getAllDataYearProductBuy  = async function(req, res) {
  var sql=  "select extract(YEAR from updated_at) as month,sum(Total) as total_value,COUNT(*) as total from product_buy WHERE deleteflag = 0 AND selled_id= "
            +req.currentUser.users_id +" group by month;";
  var x= await knex.raw(sql);
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "acao Not exitting "},WarningInfo.DATA_NOT_EXSITING);
  return returnOK(res,x[0]);
}


customerCtrl.setStatusProduct = async function(req, res) {
  let {product,status} = req.body;
  var editCus = squel.update().table("product")
                .where('product_id='+product);
  if(status==-1){
    editCus.set("deleteflag",0)
            .set("store",1)
            .set("updated_at","NOW()",{dontQuote: true});
  }
  else
  {
    editCus.set("deleteflag",status)
            .set("store",0)
            .set("updated_at","NOW()",{dontQuote: true});
  }
               
  var x = await knex.raw(editCus.toString());
  if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "Data eror "},WarningInfo.DATA_WORNG);
  return returnOK(res,x[0]);
}

customerCtrl.getPageDetail = async function(req, res) {
  let option ={name:req.body.data, type:"gro_pages_content",type_id:"name_short", colume:"filesave"};
  var  id = await  customerCtrl.getInfoshortName(option,'AND gro_pages_content.type_langue='+ getLanggue(req));
  return returnOK(res,id);
}


customerCtrl.getAdsProduct = async function(req, res) {
    var sql=  ` SELECT gro_pages_content.*   FROM gro_pages_content Where gro_pages_content.support_product and gro_pages_content.type_langue =`+getLanggue(req) + ` `;
    if(req.body.support_product_lst)
      sql = sql +  `in ( ${req.body.support_product.toString()}) AND gro_pages_content.deleteflag =0`;
    else  sql = sql +  `=  ${req.body.support_product} AND gro_pages_content.deleteflag =0`;

    var x= await knex.raw(sql);
    if ((x==null)||(x.length==0))  return returnNotFound(res,{ message: "Data Not exitting "},WarningInfo.DATA_NOT_EXSITING);
    return returnOK(res,x[0]);

}



module.exports =customerCtrl;