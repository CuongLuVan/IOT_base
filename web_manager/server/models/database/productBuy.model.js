const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
var squel = require("squel");
/**
 * User model.
 */
class ProductBuy extends CommonModel {
  get tableName() {  return "product_buy";}
  getNameTable(){ return  'product_buy';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["customer_id","selled_id","KM","status","Total","note","phone","name","address"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["customer_id","selled_id","KM","status","Total","note","phone","name","address","created_at","id_created"],
          locationSelect:"buyproduct_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT product_buy.*,customer.username as sale_name FROM product_buy LEFT JOIN customer on customer.customer_id=product_buy.selled_id  ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["KM","Total","note","phone","name","address"];
  }

  buyProductSQL(customer_id,selled_id,dataInfo){
    var checkInfoTheBill =['address','name','note',"phone","Total","KM"];
    var thebill = squel.insert().into('product_buy');
    thebill.set("customer_id",customer_id);
    thebill.set("selled_id",selled_id);
    thebill.set("KM",0);
    checkInfoTheBill.forEach(element => {
        if(dataInfo[element]!==undefined)
            thebill.set(element, dataInfo[element]);
        else 
            thebill.set(element, " ");
    });
    thebill.set("id_created",customer_id).set("id_updated",customer_id)
            .set("created_at","NOW()",{dontQuote: true}) 
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0)
            .set("oldid",0);
    return thebill.toString();
  }

  async getSaleInfo(company_id){
    var thebill = squel.select().from('company')
    .where('deleteflag=0')
    .where('company_id = '+company_id);
    var infoData = await this.queryDatabase(thebill.toString());
    return infoData[0].id_created;

  }


  
}

module.exports =  ProductBuy;
