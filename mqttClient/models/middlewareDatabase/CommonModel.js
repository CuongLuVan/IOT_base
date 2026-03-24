
const TableView= require('./TableView.js');
const TypeModel= require('./TypeModel.js');
var squel = require("squel");
const TableManifest= require('./TableManifest.js');
const TABLE_NAME = 'address';
const  defineManifest  = require('../../middlewares/CheckManifest.js');
const knex = require('../../config/knex.js');
const CustomerAcess= require('./CustomerAcess.js');
const bcrypt = require('bcrypt');
const { QueryBuilder } = require('objection');
class CustomQueryBuilder extends QueryBuilder {
  
    async fetch() {
      // Nếu có điều kiện `.where`, lấy 1 record đầu tiên
      return this.first();
    }
  
    async fetchAll() {
      // Trả về tất cả records theo query
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


class CommonModel extends  BaseModelBookshelf  {

    checkAcessGetDatabase(permission_id,type){
        //console.log("dataTableSQL   ",permission_id,type);
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
            //if(TypeModel.SELL_PRODUCT==type) return true;
            return false;
        }  
        return false;
    }

    addFormToTableSQL(data){
        var userid=0;
        let dataUser=  this.getFieldToAdd();//  DataTableFieldAdd[table];
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
        return authenSql.toString();
    }

    checkDataInform(){
        let dataUser=  this.getFieldToAdd();//  DataTableFieldAdd[table];
        var dataInfo={};
        for(var i=0;i<dataUser.valueSetup.length;i++){
            let item=dataUser.valueSetup[i];
            dataInfo[item]="";
        }
        return dataInfo;
    }
    // this function to check special info
    async checkManifestSpecialTable(table,request){
        //console.log("checkManifestSpecialTable",table);
        if(table=='users'){
            if(request.currentUser.permission_id<=TableManifest.NEW_REGISTER)
            {
                var checkUsser = squel.select().from('users')
                              .where("email='"+request.body["email"]+"'")
                              .where("deleteflag=0");
                var result= await knex.raw(checkUsser.toString());
                //console.log("checkManifestSpecialTable result",result[0]);
                if ((result==null)||(result[0].length==0)) {
                    //console.log("checkManifestSpecialTable result s",request.currentUser.permission_id,request.body.permission_id);
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
        let dataUser=  this.getFieldToAdd();//  DataTableFieldAdd[table];
        var sqlQuery = squel.insert().into(this.getNameTable());
        if(this.getNameTable()=='users'){
            for(var i=0;i<dataUser.valueSetup.length;i++){
                let item=dataUser.valueSetup[i];
                if(!!!data[item]) sqlQuery.set(item,null);
                else {
                    if(item=="password"){
                        const salt = await bcrypt.genSalt(12);
                        // now we set user password to hashed password
                        var passwordData = await bcrypt.hash(data[item], salt);
                        sqlQuery.set(item,passwordData);
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
                else {
                    sqlQuery.set(item,data[item]);
                }
                   
            }
        }
        
        sqlQuery.set("id_created",userid).set("id_updated",userid)
            .set("created_at","NOW()",{dontQuote: true}) 
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0);

        return sqlQuery.toString();
    }
    
    checkSqlUpdateAdmin(req,data){
        var userid=req.currentUser.users_id;
        let dataUser=  this.getFieldToDelete();//  DataTableFieldAdd[table];
        var sqlQuery = squel.update().table(this.getNameTable());
        for(var i=0;i<dataUser.arrayCoppy.length;i++){
            let item=dataUser.arrayCoppy[i];
            if(!!!data[item]) sqlQuery.set(item,null);
            else {
                sqlQuery.set(item,data[item]);
            }    
        }
        sqlQuery.set("id_updated",userid)
                    .set("created_at","NOW()",{dontQuote: true})
                    .set("updated_at","NOW()",{dontQuote: true})
                    .set("deleteflag",0)
                    .where(dataUser.locationSelect+'='+data[dataUser.locationSelect]);

        return sqlQuery.toString();
    } 

    async createDataToSql(req){
        var sqlData = await this.checkSqlAddAdmin(req,req.body);  
        //console.log("getRoomChatFriend..createDataToSql",sqlData);      
        var x= await knex.raw(sqlData);
        //console.log("getRoomChatFriend.......x",x,x[0]);
        //console.log("getRoomChatFriend.... x.insertId...x", x[0].insertId);
        if(x!=null) return x.insertId;
        return 0;
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
        var getInfoData = squel.select().from(req.body.table).where("deleteflag=0");
        if(Number.isInteger(data[dataUser.locationSelect]))
            getInfoData.where(dataUser.locationSelect+"="+data[dataUser.locationSelect]+"");
        else
            getInfoData.where(dataUser.locationSelect+"='"+data[dataUser.locationSelect]+"'");
            //console.log(" req.currentUser req.currentUser getInfoData.toString()",getInfoData.toString());
        var result= await knex.raw(getInfoData.toString());
        //console.log(" req.currentUser req.currentUser 1 ",req.currentUser,result[0][0]);
        if ((result==null)||(result[0].length==0)) {
            return false
        }
        if(req.body.table=='users'){
        ////console.log(" req.currentUser req.currentUser  2",req.currentUser,result[0][0]);
        //console.log(" req.currentUser req.currentUser 2",result[0][0].permission_id,req.currentUser.permission_id);
            if(result[0][0].permission_id==req.currentUser.permission_id){
                //console.log(" req.currentUser req.currentUser 1");
                if(result[0][0].users_id==req.currentUser.users_id)  return true;
                //console.log(" req.currentUser req.currentUser 1 a");
            }
            else if(result[0][0].permission_id <req.currentUser.permission_id){
                //console.log(" req.currentUser req.currentUser 2");
                return false;
            } else if(result[0][0].permission_id >req.currentUser.permission_id){
                //console.log(" req.currentUser req.currentUser 2");
                return true;
            }
            //console.log(" req.currentUser req.currentUser 3a",req.currentUser);
            if((req.currentUser.permission_id==TableManifest.MASTER)){
                return true;
            }
            else
            {
                //console.log(" req.currentUser req.currentUser 3a x",req.currentUser);
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
    getValueToSelectToFind(data){
        var stringData="";
        var arrayTofind = this.getJsonTofind();
        var tableSelect = this.getNameTable();
        //console.log("getValueToSelectToFind .........",data,arrayTofind,tableSelect);
        if(!!data){
            //console.log("getValueToSelectToFind ......... enable");
          for(var i=0;i<arrayTofind.length;i++){
            //console.log("getValueToSelectToFind ......... ==",arrayTofind[i]
           // ,data[arrayTofind[i]],!!data[arrayTofind[i]]);
              if(!!data[arrayTofind[i]]){
                  if(data[arrayTofind[i]]!=null){
                      if(Number.isInteger(data[arrayTofind[i]])){
                        stringData += " AND "+ tableSelect+"."+arrayTofind[i]+" = " +data[arrayTofind[i]]+" ";
                      }
                      else
                      {
                        stringData += " AND "+ tableSelect+"."+arrayTofind[i]+"  LIKE '% " +data[arrayTofind[i]]+"%' ";
                      }
                  }
              }
          }
        }
        //console.log("getValue stringData",stringData);
        return stringData;
    }
    getConditionManisfest(info){
        return this.getNameTable()  +".deleteflag=0 ";
    }

  }

  module.exports =  CommonModel;