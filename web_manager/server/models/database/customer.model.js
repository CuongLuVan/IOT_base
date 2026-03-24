const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class Customer extends CommonModel {
    get tableName() {  return "customer";}
  getNameTable(){ return 'customer';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["username","email","password","token_reset","phone","avatar","fullname","permission_id","address","note"]
      };
  }
  
  getFieldToDelete(){
      return {
          arrayCoppy:["username","email","password","phone","token_reset","avatar","fullname","permission_id","address","note","created_at","id_created"],
          locationSelect:"customer_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }

  getValidate(){
    return {
        username:{type:"nospace" ,length:5,name :" Tên tài khoản "},
        email:{type:"email" ,length:5,name :"email "},
        password:{type:"password" ,length:7,name :" Mật khẩu "},
        phone:{type:"phone" ,length:5,name :" số điện thoại "},
        avatar:{type:"string" ,length:10,name :" ảnh đại diện "},
        fullname:{type:"string" ,length:5,name :" Tên người dùng "},
        address:{type:"string" ,length:5,name :" Địa chỉ "}
    };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT customer.customer_id,customer.username,customer.email,customer.token_reset,customer.phone,customer.avatar,customer.fullname,customer.permission_id,customer.address,customer.note FROM customer ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["username","email","phone","avatar","fullname","address","note"];
  }

  getAllInfoToComment(){
    return ('SELECT customer_id AS users_id, username, email, phone, avatar, fullname, permission_id, address, note FROM customer WHERE deleteflag =0;');
}


  

}

module.exports =  Customer;
