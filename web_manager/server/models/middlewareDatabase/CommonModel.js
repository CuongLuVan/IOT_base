const bookshelf = require('../../config/bookshelf.js');

const TypeModel= require('./TypeModel.js');
var squel = require("squel");
const TableManifest= require('./TableManifest.js');
const knex = require('../../config/knex.js');
const CustomerAcess= require('./CustomerAcess.js');
const bcrypt = require('bcrypt');

const lstCompanyAcess =["company","product_lost","product","product_store"];
const lstInCompany = ["product_buy_detail","product_back"];

const { QueryBuilder } = require('objection');

class CustomQueryBuilder extends QueryBuilder {
  
    async fetch() {
      return this.first();
    }
  
    async fetchAll() {
      return this;
    }
    
}
class BaseModelBookshelf extends bookshelf {
    static get QueryBuilder() {
      return CustomQueryBuilder;
    }
  
    static get tableName() {
      throw new Error('TableName is missing');
    }
  
    async save() {
      if (this.id) {
        return this.$query().patchAndFetch();
      } else {
        return this.$query().insert();
      }
    }
  
    async destroy() {
      return this.$query().delete();
    }
  
    async related(relationName) {
      return this.$relatedQuery(relationName);
    }
  }

class CommonModel extends  BaseModelBookshelf {
    getFieldLinkShort(){
        return null;
    }
    async queryDatabase(sql, params=[]){
        try
        {
            var data= await  knex.raw(sql, params || []);
            if(data==null) return false;
            return data[0];
        }
        catch(ie){
            return false;
        }
    }
    async queryDatabaseDetail(sql, params=[]){
        try
        {
            var data= await  knex.raw(sql, params || []);
            if(data==null) return false;
            return {error:false,data: data[0]};
        }
        catch(ie){
            return {error:true,data:ie};
        }
    }

    checkAcessGetDatabase(permission_id,type){
        if(permission_id==TableManifest.MASTER){
            return true;
        } else if(permission_id==TableManifest.MANAGER){
            return true;
        } else if(permission_id==TableManifest.SUPPORT){
            return true;
        }  else if(permission_id==TableManifest.ACCOUNT){
            return true;
        }  else if(permission_id==TableManifest.ADMIN){
            return true;
        }  
        return false;
    }
    
    checkDataAddDatabase(permission_id,type){
        if(permission_id==TableManifest.MASTER){
            return true;
        } else if(permission_id==TableManifest.MANAGER){
            return true;
        } else if(permission_id==TableManifest.SUPPORT){
            return true;
        }  else if(permission_id==TableManifest.ACCOUNT){
            return false;
        }  else if(permission_id==TableManifest.ADMIN){
            return true;
        }  
        return false;
    }

    checkDataEditDatabase(permission_id,type){
        if(permission_id==TableManifest.MASTER){
            return true;
        } else if(permission_id==TableManifest.MANAGER){
            return true;
        }  else if(permission_id==TableManifest.ADMIN){
            if(TypeModel.NEWS==type) return true;
            else if(TypeModel.TEST==type) return true;
        }  
        return false;
    }

    checkDataDeleteDatabase(permission_id,type){
        if(permission_id==TableManifest.MASTER){
            return true;
        }  else if(permission_id==TableManifest.MANAGER){
            return true;
        }  else if(permission_id==TableManifest.ACCOUNT){
            return false;
        }  else if(permission_id==TableManifest.ADMIN){
            return false;
        }  
        return false;
    }


    checkDataAddDatabaseCustomer(permission_id){
        if(permission_id==TableManifest.MANAGER){
            return true;
        } 
        return false;
    }

    checkDataEditDatabaseCustomer(permission_id){
        if(permission_id==TableManifest.MANAGER){
            return true;
        }
        return false;
    }

    checkDataDeleteDatabaseCustomer(permission_id){
        if(permission_id==TableManifest.MANAGER){
            return true;
        } 
        return false;
    }

    addFormToTableSQL(data){
        var userid=0;
        let dataUser=  this.getFieldToAdd();
        var authenSql = squel.insert().into(this.getNameTable());
        for(var i=0;i<dataUser.valueSetup.length;i++){
            let item=dataUser.valueSetup[i];
            if(!!!data[item]) authenSql.set(item,null);
            else
            authenSql.set(item,data[item]);
        }
        authenSql.set("id_created",userid).set("id_updated",userid)
        .set("created_at","NOW()",{dontQuote: true}) 
        .set("updated_at","NOW()",{dontQuote: true})
        .set("deleteflag",0);
        return authenSql.toParam();
    }

    checkDataInform(){
        let dataUser=  this.getFieldToAdd();
        var dataInfo={};
        for(var i=0;i<dataUser.valueSetup.length;i++){
            let item=dataUser.valueSetup[i];
            dataInfo[item]="";
        }
        return dataInfo;
    }

    async checkManifestSpecialTable(table,request){
        if(table=='users'){
            if(request.currentUser.permission_id<=TableManifest.NEW_REGISTER)
            {
                var checkUsser = squel.select().from('users')
                              .where('email = ?', request.body["email"])
                              .where("deleteflag=0");
                var p = checkUsser.toParam();
                var result= await knex.raw(p.text, p.values);
                if ((result==null)||(result[0].length==0)) {
                    if(request.currentUser.permission_id<=request.body.permission_id){
                        return true;
                    }
                }
            }
            
            return false;
        }
        return true;
    }

    async checkSqlAddAdmin(req,data){
        var userid=req.currentUser.users_id;
        let dataUser=  this.getFieldToAdd();
        var sqlQuery = squel.insert().into(this.getNameTable());
        if(this.getNameTable()=='users' || this.getNameTable()=='customer'){
            for(var i=0;i<dataUser.valueSetup.length;i++){
                let item=dataUser.valueSetup[i];
                if(!!!data[item]) sqlQuery.set(item,null);
                else {
                    if(item=="password"){
                        const salt = await bcrypt.genSalt(12);
                        var passwordData = await bcrypt.hash(data[item], salt);
                        sqlQuery.set(item,passwordData);
                    }else if(item=="expridate"){
                        sqlQuery.set(item,data[item].replace("Z","").replace("z",""));
                    }
                    else {
                        sqlQuery.set(item,data[item]);
                    }
                }
                   
            }
        }
        else
        {
            for(var i=0;i<dataUser.valueSetup.length;i++){
                let item=dataUser.valueSetup[i];
                if(!!!data[item]) sqlQuery.set(item,null);
                else if(item=="expridate"){
                    sqlQuery.set(item, data[item].replace("Z","").replace("z",""));
                }
                else {
                    sqlQuery.set(item,data[item]);
                }
                   
            }
        }
        
        sqlQuery.set("id_created",userid).set("id_updated",userid)
            .set("created_at","NOW()",{dontQuote: true}) 
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0);

        var p = sqlQuery.toParam();
        return  await this.queryDatabaseDetail(p.text, p.values);  
    }
    
    async checkSqlUpdateAdmin(req,data){
        var userid=req.currentUser.users_id;
        let dataUser=  this.getFieldToDelete();
        var sqlQuery = squel.update().table(this.getNameTable());
        
        const index = dataUser.arrayCoppy.indexOf('created_at');
        if (index > -1) {
            dataUser.arrayCoppy.splice(index, 1);
        }

        dataUser.arrayCoppy =  this.getFieldToAdd().valueSetup;

        if(this.getNameTable()=='users'){
            for(var i=0;i<dataUser.arrayCoppy.length;i++){
                let item=dataUser.arrayCoppy[i];
                if(!data.hasOwnProperty(item)) sqlQuery.set(item,null);
                else {
                    if(item=="password"){
                        const salt = await bcrypt.genSalt(12);
                        var passwordData = await bcrypt.hash(data[item], salt);
                        sqlQuery.set(item,passwordData);
                    }
                    else if(item=="email"){
                    }
                    else {
                        sqlQuery.set(item,data[item]);
                    }
                }
                   
            }
        }
        else
        {

            for(var i=0;i<dataUser.arrayCoppy.length;i++){
                let item=dataUser.arrayCoppy[i];
                if(!data.hasOwnProperty(item)) sqlQuery.set(item,null);
                else {
                    sqlQuery.set(item,data[item]);
                }
                   
            }
        }
        var locationField = dataUser.locationSelect;
        var locationValue = data[locationField];
        sqlQuery.set("id_updated",userid)
                    .set("created_at","NOW()",{dontQuote: true})
                    .set("updated_at","NOW()",{dontQuote: true})
                    .set("deleteflag",0)
                    .where(locationField+'= ?', locationValue);

        var p = sqlQuery.toParam();
        return  await this.queryDatabaseDetail(p.text, p.values);  
    } 


    checkManifestSpecialCustomer(action){
        var acess = this.customerAcess();
        var detail = acess[action];
        switch(detail){
            case CustomerAcess.NOT_ACESS:{
                return false;
            }
            case CustomerAcess.ONLY_USER:{
                return true;
            }
            case CustomerAcess.ALL:{
                return true;
            }
            default:{
                return false;
            }
            return false;
        }
        return false;
    }

    
    async  checkDataToEdit(req){
        let data=req.body;
        let dataUser= this.getFieldToDelete();
        var fieldName = dataUser.locationSelect;
        var fieldValue = data[fieldName];
        
        var getInfoData = squel.select().from(req.body.table).where("deleteflag=0");
        getInfoData.where(fieldName+" = ?", fieldValue);
        
        var p = getInfoData.toParam();
        var result= await knex.raw(p.text, p.values);
        if ((result==null)||(result[0].length==0)) {
            return false
        }
        if(req.body.table=='users'){
            if(result[0][0].permission_id==req.currentUser.permission_id){
                if(result[0][0].users_id==req.currentUser.users_id)  return true;
            }
            else if(result[0][0].permission_id <req.currentUser.permission_id){
                return false;
            } else if(result[0][0].permission_id >req.currentUser.permission_id){
                return true;
            }

            if((req.currentUser.permission_id==TableManifest.MASTER)){
                return true;
            }
            else
            {
                if(!this.checkDataToManifest(result[0][0].id_created,req.currentUser.value_manifest)){
                    return false;
                }
            }
            return false;
        }
        else
        {
            if((req.currentUser.permission_id==TableManifest.MASTER)||
                    (req.currentUser.permission_id==TableManifest.MANAGER )){
                return true;
            }
            else
            {
                if(!this.checkDataToManifest(result[0][0].id_created,req.currentUser.value_manifest)){
                return false;
                }
            }
        }
        return true;
    }

    checkDataToManifest=(id, select)=>{
        var dataArray= select.split(",");
        for(var u=0;u<dataArray.length;u++){
          if(dataArray[u]==id){
            return true;
          }
        }
        return false;
      
    }
    
    getValueToSelectToFind=(data)=>{
        var stringData="";
        var params = [];
        var arrayTofind = this.getJsonTofind();
        var tableSelect = this.getNameTable();
        var field_update = this.getFieldToDelete();
        if(!!data){
          for(var i=0;i<arrayTofind.length;i++){
              if(data[arrayTofind[i]]!=undefined){
                    if(Array.isArray(data[arrayTofind[i]])){
                        var placeholders = data[arrayTofind[i]].map(() => '?').join(',');
                        stringData += " AND "+ tableSelect+"."+arrayTofind[i]+" IN (" +placeholders+") ";
                        params = params.concat(data[arrayTofind[i]]);
                    }else if(Number.isInteger(data[arrayTofind[i]])){
                        stringData += " AND "+ tableSelect+"."+arrayTofind[i]+" = ? ";
                        params.push(data[arrayTofind[i]]);
                    }
                    else if(data[arrayTofind[i]]!=null)
                    {
                        stringData += " AND "+ tableSelect+"."+arrayTofind[i]+"  LIKE ? ";
                        params.push("% " +data[arrayTofind[i]]+"%");
                    }
              }
          }
        }
        return { sql: stringData + ` ORDER BY ${tableSelect}.${field_update.locationSelect} DESC `, params: params };
    }

    getConditionManisfest(info){
        return { sql: this.getNameTable()  +".deleteflag=0 ", params: [] };
    }

    async getAllInfoValueInTable(req,mode){
        var dataObject ={};
        var sql= "";
        var params = [];
        if(mode==1){
            sql = `SELECT COUNT(*) AS total_table FROM ${this.getNameTable()} 
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND deleteflag=0;`;
            dataObject["last7day"] = await this.queryDatabaseDetail(sql); 
            sql =`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total_table 
                        FROM ${this.getNameTable()} WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)  AND deleteflag=0 
                            GROUP BY month ORDER BY month ASC`;
            dataObject["last1year"] = await this.queryDatabaseDetail(sql); 
            sql = `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,COUNT(*) AS total_table
                         FROM ${this.getNameTable()} WHERE deleteflag=0 
                            GROUP BY month ORDER BY month ASC;`;
            dataObject["all_year"] = await this.queryDatabaseDetail(sql); 

        } else if(mode==2){
            var dataValue = req.body.data_value.replace(/[^a-zA-Z0-9_]/g, '');
            sql = `SELECT SUM(\`${dataValue}\`) AS total_value FROM ${this.getNameTable()} WHERE 
                        created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND deleteflag=0;`;
            dataObject["value7day"] = await this.queryDatabaseDetail(sql); 
            sql = `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(\`${dataValue}\`) AS total_value 
                        FROM ${this.getNameTable()} WHERE deleteflag=0 GROUP BY month ORDER BY month ASC;`;
            dataObject["value_mounth"] = await this.queryDatabaseDetail(sql); 
        }
        console.log("dataObject  ",dataObject);
        return dataObject; 
    }

    async getAllDataInTable(req,start,end){
        var itemSelect=this.getValueToSelectToFind(req.body.dataFind);
        var condition=this.getConditionManisfest(req.currentUser);
        var dataTableSQL=this.getSQLReport(req.currentUser) 
                       +" WHERE "+ 
                       condition.sql
                       + itemSelect.sql
                       + " LIMIT ? , ?";
        var allParams = [...condition.params, ...itemSelect.params, start, end];
        return await this.queryDatabaseDetail(dataTableSQL, allParams); 
    }

    async getAllDataInTableByGroupsId(req,start){
        var itemSelect=this.getValueToSelectToFind(req.body.dataFind);
        var condition=this.getConditionManisfest(req.currentUser);
        var dataTableSQL=this.getSQLReport(req.currentUser) 
                          +" WHERE "+ 
                          condition.sql
                          + itemSelect.sql
                          + " LIMIT ? , 1000 ";
        var allParams = [...condition.params, ...itemSelect.params, start];
        if(req.body.groups_id){
            dataTableSQL +=" AND "+ this.getNameTable()+".groups_id = ?";
            allParams.push(req.body.groups_id);
        }
        return await this.queryDatabaseDetail(dataTableSQL, allParams); 
    }


    async getAllDataInTableCustomer(req,start){
        var itemSelect=this.getValueToSelectToFind(req.body.dataFind);
        var tableName = this.getNameTable();
        var sqlParts = [this.getSQLReport(req.currentUser)];
        var params = [...itemSelect.params];
        
        sqlParts.push("WHERE NOT " + tableName + ".deleteflag=1 AND ");
        
        if(req.currentUser.value_manifest.length>1){
            if(lstCompanyAcess.includes(tableName)){
                sqlParts.push('('+ tableName +".id_created= ?");
                params.push(req.currentUser.users_id);
                sqlParts.push(' OR '+tableName+'.company_id IN (');
                var manifestIds = req.currentUser.value_manifest.split(',');
                sqlParts.push(manifestIds.map(() => '?').join(','));
                params = params.concat(manifestIds);
                sqlParts.push(')) ');
            }
            else if(lstInCompany.includes(tableName))
            {
                sqlParts.push('('+ tableName +".id_created= ?");
                params.push(req.currentUser.users_id);
                sqlParts.push(' OR '+tableName+'.product_id IN (SELECT product.product_id FROM product WHERE product.company_id IN (');
                var manifestIds = req.currentUser.value_manifest.split(',');
                sqlParts.push(manifestIds.map(() => '?').join(','));
                params = params.concat(manifestIds);
                sqlParts.push('))) ');
            }
            else if(tableName=="product_buy")  {
                sqlParts = [`SELECT product_buy.*,customer.username as sale_name FROM product_buy LEFT JOIN customer on customer.customer_id=product_buy.selled_id   WHERE product_buy.deleteflag=0 AND product_buy.selled_id = ?`];
                params = [req.currentUser.users_id];
            } else {
                sqlParts.push(tableName +".id_created= ?");
                params.push(req.currentUser.users_id);
            }
        
        }else {
            sqlParts.push(tableName +".id_created= ?");
            params.push(req.currentUser.users_id);
        }
        
        sqlParts.push(itemSelect.sql);
        sqlParts.push(" LIMIT ? , 1000 ");
        params.push(start);
        
        var dataTableSQL = sqlParts.join(' ');
        return await this.queryDatabaseDetail(dataTableSQL, params); 
    }
    
    async getAllDataInTableByGroupsIdCustomer(req,start){
        var itemSelect=this.getValueToSelectToFind(req.body.dataFind);
        var dataTableSQL=this.getSQLReport(req.currentUser) 
                            + itemSelect.sql
                            + " LIMIT ? , 1000 ";
        var params = [...itemSelect.params, start];
        if(req.body.groups_id){
            dataTableSQL +=" AND "+ this.getNameTable()+".groups_id = ?";
            params.push(req.body.groups_id);
        }
        return await this.queryDatabaseDetail(dataTableSQL, params); 
    }
    async deleteOneRecord(req){
        let data=req.body;
        let dataUser= this.getFieldToDelete();
        var locationField = dataUser.locationSelect;
        var locationValue = data[locationField];
        var deleteSQL = squel.update().table(this.getNameTable())
            .set("id_updated",req.currentUser.users_id)
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",1)
            .where(locationField+' = ?', locationValue);
        var p = deleteSQL.toParam();
        return await this.queryDatabaseDetail(p.text, p.values); 
    }

    addRecordIsExisting(req){
        let data=req.body;
        let dataUser=this.getFieldToDelete();
        var squelGet=squel.select().from(this.getNameTable());
        for(var i=0;i<dataUser.arrayCoppy.length;i++){
                let item=dataUser.arrayCoppy[i];
            squelGet.field(item);
        }
        var locationField = dataUser.locationSelect;
        var locationValue = data[locationField];
        squelGet.where(locationField+' = ?', locationValue);
        var addData = squel.insert().into(this.getNameTable())
                      .fromQuery( dataUser.arrayCoppy, squelGet);
        return addData.toParam();
    }

    deleteFlagToRecord(req,id){
        let data=req.body;
        let dataUser=this.getFieldToDelete();
        var editData = squel.update().table(this.getNameTable());
        editData.where(dataUser.locationSelect+' = ?', id)
        .set(dataUser.valueSelect,1) 
        .set("id_updated",req.currentUser.users_id)
        .set("oldid",data[dataUser.locationSelect])
        .set("deleteflag",1)
        .set("updated_at","NOW()",{dontQuote: true});
        return editData.toParam();
    }
    async chechTableExisting(nameTable){
        var sanitizedName = nameTable.replace(/[^a-zA-Z0-9_]/g, '');
        var sqlQuerry= "SHOW TABLES LIKE ?";
        var info= await this.queryDatabaseDetail(sqlQuerry, [sanitizedName]); 
        if(info.error) return false;
        if(info.data.length>0) return true;
        else return false;
    }

    addRecodeData(data,table,idUpdate=0,deleteflag=0){
        var authen = squel.insert().into(table);
        for(var item in data) {
            authen.set(item,data[item]);
        }
        authen.set("id_created",idUpdate)
        .set("id_updated",idUpdate)
        .set("created_at","NOW()",{dontQuote: true}) 
        .set("updated_at","NOW()",{dontQuote: true})
        .set("deleteflag",deleteflag);
        return authen; 
    }

    async  getTagName(table,short,dataInput) {
        let data = dataInput.toLowerCase().replaceAll("đ", "d").normalize("NFD").replace(/\p{Diacritic}/gu, "")
                                            .replace(/[^\w\s]/gi, '').replaceAll(" ", "-");
        if(data.length>40) data =  data.substring(0, 40);
        var authen = squel.select().from(table)
                          .where(short+ "= ?", data)
                          .where("deleteflag=0");
        var p = authen.toParam();
        var result= await knex.raw(p.text, p.values);
        if ((result==null)||(result.length==0)||(result[0].length==0)) {
          return data;
        }
        return (data+Date.now());
    }


  }

  module.exports =  CommonModel;
