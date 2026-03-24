  const TableManifest= require('../models/middlewareDatabase/TableManifest.js');

  var defineManifest ={};


  defineManifest.checkManifestTableNomal = function(table, permission_id,userdID,listDataContain) {
    var sqlExtend=" where "+table+".deleteflag=0 ";
    if((permission_id==TableManifest.ADMIN)&&(listDataContain.includes(userdID))){
        sqlExtend+=" and "+table+".id_created  in ("+listDataContain +")"; 
    } else 
    if(permission_id==TableManifest.NEW_REGISTER){
        sqlExtend+=" and "+table+".id_created ="+userdID; 
    }
    return sqlExtend;
  }

  defineManifest.checkManifestFromEnterpriseId = function(table, permission_id,userdID,listDataContain) {
    var sqlExtend=" where "+table+".deleteflag=0 ";
    if((permission_id==TableManifest.ADMIN)&&(listDataContain.length>0)){
        sqlExtend+=" and "+table+".enterprise_id  in ("+listDataContain +")"; 
    } else 
    if(permission_id==TableManifest.NEW_REGISTER){
        sqlExtend+=" and "+table+".id_created ="+userdID; 
    }
    return sqlExtend;
  }

  defineManifest.checkManifestTableUser = function(permission_id,userdID,listDataContain) {
    var sqlExtend=" where users.deleteflag=0 ";
        if(permission_id==TableManifest.MASTER){
        } else
        if(permission_id==TableManifest.ACCOUNT){
            sqlExtend+=" and (users.permission_id >2 or  users.users_id ="+userdID+")"; 
        } else 
        if(permission_id==TableManifest.ADMIN){
            sqlExtend+=" and (users.users_id  in ("+listDataContain +") or  users.users_id ="+userdID +" or  users.id_created ="+userdID+")"; 
        } else 
        if(permission_id==TableManifest.NEW_REGISTER){
            sqlExtend+=" and (users.users_id ="+userdID+")";  
        }
    return sqlExtend;
  }



  
  module.exports = defineManifest;