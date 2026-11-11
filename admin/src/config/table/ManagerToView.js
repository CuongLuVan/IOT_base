
import User_View from './user.table.js';

import Adress from './Adress.table';
import DecentralizationAccess from './DecentralizationAccess.table';
import GroupContent from './GroupContent.table';
import MqttMicroservice from './MqttMicroservice.table';
import MqttUser from './MqttUser.table';
import PagesContent from './PagesContent.table';
import AdvertisementContent from './AdvertisementContent.table';
import ProductBack from './ProductBack.table';
import ServiceBill from './ServiceBill.table';
import ProductLost from './ProductLost.table';
import Enterprise from './Enterprise.table';
import DetailBank from './DetailBank.table';
import Customer from './Customer.table';
import Company from './Company.table';
import ProductStore from './ProductStore.table';
import Product from './Product.table';
import ProductBuyDetail from './ProductBuyDetail.table';
import ProductBuy from './ProductBuy.table';
import ReturnService from './ReturnService.table';
import ServiceCharging from './ServiceCharging.table';
import Service from './Service.table';
import GroupContentSub from './GroupContentSub.table';
import ServiceGroup from './ServiceGroup.table';
import ProductPages from './ProductPages.table';
import ServicePages from './ServicePages.table';
import ProductImage from './ProductImage.table';
import CostTransport from './CostTransport.table';
import PaymentInternal from './PaymentInternal.table';
import PaymentType from './PaymentType.table';
import PaymentTransport from './PaymentTransport.table';
import AdvertisementProduct from './AdvertisementProduct.table';
import SocialUser from './SocialUser.table';
import SocialType from './SocialType.table';
import GroupCompanyDetail from './GroupCompanyDetail.table';
import GroupCompany from './GroupCompany.table';

import {validateEmail,validatePhone,validateDate } from '../../utils/commonUtil';


const classesFactory = {User_View ,Adress,DecentralizationAccess,GroupContent,
    MqttMicroservice,MqttUser,PagesContent ,AdvertisementContent ,ServiceBill
    ,ProductLost,Enterprise ,DetailBank ,Customer ,Company ,ProductStore ,Product
    ,ProductBuyDetail,ProductBuy,ProductBack,ReturnService ,ServiceCharging ,Service
    ,GroupContentSub,ServiceGroup,ProductPages,ServicePages,ProductImage
    ,CostTransport,PaymentInternal ,PaymentType ,PaymentTransport,AdvertisementProduct
    ,SocialUser,SocialType,GroupCompany,GroupCompanyDetail
    };
const classesFactorryMapping = {  users:"User_View", adress:"Adress" ,
                                decentralization_access:"DecentralizationAccess",group_content:"GroupContent" ,mqtt_microservice:"MqttMicroservice",
                                mqtt_user:"MqttUser" , gro_pages_content:"PagesContent",
                                advertisement_content:"AdvertisementContent", product_back:"ProductBack",
                                service_bill:"ServiceBill" ,product_lost:"ProductLost" ,enterprise:"Enterprise",
                                detailbank:"DetailBank", customer:"Customer",company:"Company" ,
                                product_store:"ProductStore" ,product:"Product",product_buy_detail:"ProductBuyDetail",
                                product_buy:"ProductBuy",return_service:"ReturnService",service_charging:"ServiceCharging",
                                service:"Service",group_content_sub:"GroupContentSub",service_group:"ServiceGroup",
                                product_pages:"ProductPages",service_pages:"ServicePages",product_image:"ProductImage" ,
                                cost_transport:"CostTransport",payment_transport:"PaymentTransport",
                                payment_type:"PaymentType",payment_internal:"PaymentInternal",advertisement_product:"AdvertisementProduct",
                                social_user:"SocialUser",social_type:"SocialType",group_company_detail:"GroupCompanyDetail",
                                group_company:"GroupCompany"
                            };   

// Table view object of a table name, or null for an unknown table.
const createView = (table) => {
    const nameConvert = classesFactorryMapping[table];
    return nameConvert ? new classesFactory[nameConvert]() : null;
};

export const exportColumeData = (table,callback=null) =>{
    const tableSelect = createView(table);
    return tableSelect ? tableSelect.getColumeShow(callback) : [];
};

// Searchable columns (in getJsonTofind), each with id = column position + 1.
export const getLstInfoToSearch = (table) =>{
    const tableSelect = createView(table);
    if (!tableSelect) return [];
    const name = tableSelect.getJsonTofind();
    const fieldToShow = [];
    tableSelect.getColumeShow(null).forEach((element,index) => {
        if (element.field && element.field!='id' && element.field!='action' && name.includes(element.field)) {
            fieldToShow.push(Object.assign({}, element, { id: index+1 }));
        }
    });
    return fieldToShow;
};

export const exportColumeEdit = (table) =>{
    const tableSelect = createView(table);
    return tableSelect ? tableSelect.getInfoToEdit() : {};
};

// Parallel arrays describing the add / edit form fields of the table.
export const exportColumeAdd = (table) =>{
    const tableSelect = createView(table);
    if (!tableSelect) return {};
    return {
        view: tableSelect.getInfoToAdd(),
        title: tableSelect.getTitleToAdd(),
        html: tableSelect.getHtmlAdd(),
        typeSelect: tableSelect.getTypeSelectToAdd(),
        selectTabble: tableSelect.getTypeSelectTabbleToAdd(),
        selectValidate: tableSelect.getColumeValidate(),
    };
};

const textLength = (value) => (value == null ? 0 : String(value).length);

// selectValidate rule -> [check(value), message]. Dates come from the form as
// "YYYY-MM-DDT..." strings, so they are parsed before validateDate.
const VALIDATE_RULES = {
    email: [(v) => validateEmail(v), "Xin vui lòng check email"],
    phone: [(v) => validatePhone(v), "Xin vui lòng kiểm tra định dạng phone"],
    password: [(v) => textLength(v) >= 6, "Độ dài mật khẩu <6"],
    leng3: [(v) => textLength(v) >= 3, "Độ dài ký tự không hợp lệ , độ dài >3"],
    leng6: [(v) => textLength(v) >= 6, "Độ dài ký tự không hợp lệ , độ dài >6"],
    number: [(v) => !isNaN(v), "Định dạng phải là số"],
    date: [(v) => validateDate(v instanceof Date ? v : new Date(v)), "Không đúng định dạng ngày tháng năm"],
};

// { validate, err }: err names the first invalid field and why.
export const checkValidateValue = (infoTitle,value) =>{
    var validate = {validate:true ,err:" "};
    for (const field of infoTitle) {
        const accessValue = value[field.view];
        validate.err = field.title +"= " +accessValue +" ! ";
        const rule = VALIDATE_RULES[field.selectValidate];
        if (rule && !rule[0](accessValue)) {
            validate.validate = false;
            validate.err += rule[1];
            break;
        }
    }
    return validate;
}

export const getValueDetail = (infoTitle,value) =>{
    var validate = JSON.parse(JSON.stringify(value)); 
    for(var i=0;i<infoTitle.length;i++){
        let detail=infoTitle[i].view;
        let accessValue = validate[detail];
        let checkValidate =infoTitle[i].selectValidate;
        if(checkValidate=="date"){
            const date = new Date(accessValue);
            const offset = date.getTimezoneOffset();
            var cd=new Date(date.getTime() - offset*60000);
            validate[detail]=cd;
        }
    }
    return validate;
}

