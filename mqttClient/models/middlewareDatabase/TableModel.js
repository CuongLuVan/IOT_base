

class TableModel{
    constructor() {
        
    }



    checkAcessManagerDatabase(permission_id){
        if(permission_id<1)  return false;
        if(permission_id<TableManifest.NEW_REGISTER) return true;
        return false;
    }

    checkDatabaseInval(permission_id,userdID,data,listDataContain=null){
        var checkDataInal=false;
        if(permission_id==TableManifest.MASTER){
            checkDataInal=true;
        } else if((permission_id==TableManifest.ACCOUNT)&&(parseInt(data["id_created"])==userdID)){
            checkDataInal=true; 
        }  else
        if((permission_id==TableManifest.ADMIN)){
            //&&(listDataContain.includes(data["id_created"])
            checkDataInal=true; 
        } else 
        if((permission_id==TableManifest.NEW_REGISTER)&&(parseInt(data["id_created"])==userdID)){
            checkDataInal=true; 
        } 
        var roleData=data["permission_id"];
        if(checkDataInal){
            for(var i=0;i<CheckManifestID.length;i++){
                if(CheckManifestID[i]==roleData){
                    return true;
                }
            }
        }
        ////console.log("checkDatabaseInval false",permission_id,userdID,data,listDataContain);
        return false;
    }
}