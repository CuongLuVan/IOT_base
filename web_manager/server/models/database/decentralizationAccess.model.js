const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * Enterprise model.
 */
class DecentralizationAccess extends CommonModel  {
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  get tableName() {  return "decentralization_access";}
  getNameTable(){ return 'decentralization_access';}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
    getFieldToAdd(){
        return {
            valueSetup: ["name","id_admin","id_member","enterprise_id","note"]
        };
    }
    getFieldToDelete(){
        return {
            arrayCoppy:["name","id_admin","id_member","enterprise_id","note","created_at","id_created"],
            locationSelect:"decentralization_access_id",
            valueSelect:"deleteflag",
            userUpdate:"id_updated"
        };
    }

    getSQLReport(currentUser){
        return 'SELECT decentralization_access.*,db.username As name_create, dc.username As name_update,vdh_enterprise.enterprise_name,de.username As name_admin,df.username As name_member FROM decentralization_access LEFT JOIN users db ON db.users_id=decentralization_access.id_created LEFT JOIN users dc ON dc.users_id=decentralization_access.id_updated LEFT JOIN vdh_enterprise ON vdh_enterprise.enterprise_id=decentralization_access.enterprise_id LEFT JOIN users de ON de.users_id=decentralization_access.id_admin LEFT JOIN users df ON df.users_id=decentralization_access.id_member ';
       // +defineManifest.checkManifestTableNomal(TABLE_NAME,currentUser.permission_id,currentUser.users_id,currentUser.value_manifest) +" and vdh_enterprise.deleteflag =0 ";
    }


    getJsonTofind(){
        return ["name","note"];
    }
    
    

}

module.exports =  DecentralizationAccess;
