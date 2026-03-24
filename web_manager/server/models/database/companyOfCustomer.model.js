const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');


class CompanyOfCustomer extends CommonModel {
    get tableName() {  return "company_of_customer";}
    getNameTable(){ return 'company_of_customer';}
    getTypeTable(){ return TypeModel.SELL_PRODUCT;}
    customerAcess(){ 
        return  {edit:CustomerAcess.ONLY_USER,
                add:CustomerAcess.ONLY_USER,
                view:CustomerAcess.ONLY_USER  }; 
    }
    getFieldToAdd(){
        return {
            valueSetup: ["customer_id","permission_id","company_id","name"]
        };
    }

    getFieldToDelete(){
        return {
            arrayCoppy:["customer_id","permission_id","company_id","name","created_at","id_created"],
            locationSelect:"id",
            valueSelect:"deleteflag",
            userUpdate:"id_updated"
        };
    }
    
    
    getSQLReport(currentUser){
        return ('SELECT company_of_customer.* FROM company_of_customer ');
            // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
    }
    getJsonTofind(){
        return ["company_id"];
    }



}

module.exports =  CompanyOfCustomer;
