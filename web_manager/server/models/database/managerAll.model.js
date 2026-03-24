
const Adress = require('./adress.model.js');
const DecentralizationAccess = require('./decentralizationAccess.model.js');
const GroupContent = require('./groupContent.model.js');
const MqttMicroservice = require('./MqttMicroservice.model.js');
const MqttUser = require('./MqttUser.model.js');
const PagesContent = require('./PagesContent.model.js');
const GroupContentSub = require('./groupContentSub.model.js');
const Permission = require('./permission.model.js');
const User = require('./user.model.js');
const ProductBack = require('./productBack.model.js');
const ServiceBill = require('./serviceBill.model.js');
const ProductBuy = require('./productBuy.model.js');
const ProductBuyDetail = require('./productBuyDetail.model.js');
const ServiceCharging = require('./serviceCharging.model.js');
const Company = require('./company.model.js');
const Customer = require('./customer.model.js');
const DetailBank = require('./detailBank.model.js');
const Enterprise = require('./enterprise.model.js');
const ProductLost = require('./productLost.model.js');
const Product = require('./product.model.js');
const ProductImage = require('./productImage.model.js');

const ReturnService = require('./returnService.model.js');
const Service = require('./service.model.js');
const ProductStore = require('./productStore.model.js');
const AdvertisementContent = require('./advertisementContent.model.js');
const ServiceGroup = require('./serviceGroup.model.js');
const StockName = require('./stockName.model.js');
const StockSale = require('./stockSale.model.js');
const StockBuy = require('./stockBuy.model.js');
const ProductPages = require('./productPages.model.js');
const ProductGroup = require('./productGroup.model.js');
const ServicePages = require('./servicePages.model');
const CompanyOfCustomer = require('./companyOfCustomer.model');
const CostTransport = require('./costTransport.model');
const PaymentType = require('./paymentType.model');
const PaymentInternal = require('./paymentInternal.model');
const PaymentTransport = require('./paymentTransport.model');
const AdvertisementProduct = require('./advertisementProduct.model');
const SocialUser = require('./socialUser.model');
const SocialType = require('./socialType.model');
const GroupCompany = require('./groupCompany.model');
const GroupCompanyDetail = require('./groupCompanyDetail.model');
const SocialShop = require('./socialShop.model');




const classesFactory = {User,Permission ,Adress,DecentralizationAccess,GroupContent,
                        MqttMicroservice,MqttUser,PagesContent,GroupContentSub,ProductBack,
                        ServiceBill,ProductBuy,ProductBuyDetail,ServiceCharging,Company,Customer,
                        DetailBank,Enterprise,ProductLost,Product,ReturnService,Service ,
                        ProductStore,AdvertisementContent,ProductImage,ServiceGroup,StockName,
                        StockSale,StockBuy,ProductPages,ServicePages,ProductGroup,CompanyOfCustomer,
                        CostTransport,PaymentType,PaymentInternal,PaymentTransport,
                        AdvertisementProduct,SocialUser,SocialType,GroupCompany,GroupCompanyDetail,
                        SocialShop };
const classesFactorryMapping = {  users:"User" , permission:"Permission",adress:"Adress" ,
                            decentralization_access:"DecentralizationAccess",group_content:"GroupContent" 
                            , mqtt_microservice:"MqttMicroservice", 
                            mqtt_user:"MqttUser" , gro_pages_content:"PagesContent",group_content_sub:"GroupContentSub",
                            product_back:"ProductBack",service_bill:"ServiceBill", product_buy:"ProductBuy",
                            product_buy_detail:"ProductBuyDetail",service_charging:"ServiceCharging",
                            company:"Company",customer:"Customer",detailbank:"DetailBank",
                            enterprise:"Enterprise",product_lost:"ProductLost",
                            product:"Product",return_service:"ReturnService",
                            service:"Service" ,product_store:"ProductStore",
                            advertisement_content:'AdvertisementContent',
                            product_image:"ProductImage",service_group:"ServiceGroup",
                            stock_name:"StockName",stock_sale:"StockSale",stock_buy:"StockBuy",
                            product_pages:"ProductPages",service_pages:"ServicePages",
                            product_group:"ProductGroup",company_of_customer:"CompanyOfCustomer",
                            cost_transport:"CostTransport",payment_type:"PaymentType",
                            payment_internal:"PaymentInternal",payment_transport:"PaymentTransport",
                            advertisement_product:"AdvertisementProduct" , social_user:"SocialUser",
                            social_type:"SocialType",group_company:"GroupCompany",
                            group_company_detail:"GroupCompanyDetail",social_shop:"SocialShop"
                        };
                        
const classesFactorryMappingCustomer = {  adress:"Adress" ,
                        decentralization_access:"DecentralizationAccess",group_content:"GroupContent" ,
                        mqtt_user:"MqttUser" , gro_pages_content:"PagesContent",group_content_sub:"GroupContentSub",
                        product_back:"ProductBack",service_bill:"ServiceBill", product_buy:"ProductBuy",
                        product_buy_detail:"ProductBuyDetail",service_charging:"ServiceCharging",
                        company:"Company",customer:"Customer",detailbank:"DetailBank",
                        enterprise:"Enterprise",product_lost:"ProductLost",
                        product:"Product",return_service:"ReturnService",
                        service:"Service" ,product_store:"ProductStore",
                        advertisement_content:'AdvertisementContent',
                        product_image:"ProductImage",service_group:"ServiceGroup",stock_name:"StockName",
                        stock_sale:"StockSale",stock_buy:"StockBuy",company_of_customer:"CompanyOfCustomer",
                        social_user:"SocialUser",social_type:"SocialType",group_company:"GroupCompany",
                        group_company_detail:"GroupCompanyDetail",product_pages:"ProductPages"
                        ,social_shop:"SocialShop",product_group:"ProductGroup"
                    };      


exports.mangerModelAdmin = function  (table) {
    var nameConvert=classesFactorryMapping[table];
    if(!!nameConvert){
        var tableSelect=new classesFactory[nameConvert]();
        if(!!tableSelect) return tableSelect;
    }
    return false;
};

exports.mangerModelUser = function  (table) {
    var nameConvert=classesFactorryMappingCustomer[table];
    if(!!nameConvert){
        var tableSelect=new classesFactory[nameConvert]();
        if(!!tableSelect) return tableSelect;
    }
    return false;
};