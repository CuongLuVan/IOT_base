
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

import {validateEmail,validatePhone,isNumeric,validateDate } from '../../utils/commonUtil';


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

export const exportColumeData = (table,callback=null) =>{
    var nameConvert=classesFactorryMapping[table];
    if(!!nameConvert){
        var tableSelect=new classesFactory[nameConvert]();
        if(!!tableSelect) return tableSelect.getColumeShow(callback);
    }
    return [];
};

export const getLstInfoToSearch = (table) =>{
    var nameConvert=classesFactorryMapping[table];
    var fieldToShow = [];
    if(!!nameConvert){
        var tableSelect=new classesFactory[nameConvert]();
        if(!!tableSelect) {
            var name =tableSelect.getJsonTofind();
            var info  =tableSelect.getColumeShow(null);
            info.forEach((element,index) => {
                if(!!element.field){
                    if((element.field!='id')&&(element.field!='action'))
                    {
                        if(!!name.includes(element.field)){
                            var infoData= JSON.parse(JSON.stringify(element));
                            infoData.id=index+1;
                            fieldToShow.push(infoData);
                        }
                    }
                }
            });
        }
    }
    return fieldToShow;
};

export const exportColumeEdit = (table) =>{
    var nameConvert=classesFactorryMapping[table];
    if(!!nameConvert){
        var tableSelect=new classesFactory[nameConvert]();
        if(!!tableSelect) return tableSelect.getInfoToEdit();
    }
    return {};
};

export const exportColumeAdd = (table) =>{
    var nameConvert=classesFactorryMapping[table];
    if(!!nameConvert){
        var tableSelect=new classesFactory[nameConvert]();
        if(!!tableSelect)
        {
            var dataValue = {};
            dataValue.view= tableSelect.getInfoToAdd();
            dataValue.title= tableSelect.getTitleToAdd();
            dataValue.html= tableSelect.getHtmlAdd();
            dataValue.typeSelect= tableSelect.getTypeSelectToAdd();
            dataValue.selectTabble= tableSelect.getTypeSelectTabbleToAdd();
            dataValue.selectValidate= tableSelect.getColumeValidate();
            return dataValue;
        }  
    }
    return {};
};


export const checkValidateValue = (infoTitle,value) =>{
    var validate = {validate:true ,err:" "};
    for(var i=0;i<infoTitle.length;i++){
        let detail=infoTitle[i].view;
        let titleCheck = infoTitle[i].title;
        let accessValue = value[detail];
        let checkValidate =infoTitle[i].selectValidate;
        validate.err =  titleCheck +"= " +accessValue +" ! ";
        if(checkValidate=="email"){
            if(!validateEmail(accessValue)){
                validate.validate=false;
                validate.err += "Xin vui lòng check email";
                break; 
            }
        } else if(checkValidate=="phone"){
            if(!validatePhone(accessValue)){
                validate.validate=false;
                validate.err += "Xin vui lòng kiểm tra định dạng phone";
                break; 
            }
        } else if(checkValidate=="password"){
            if(accessValue.length<6){
                validate.validate=false;
                validate.err += "Độ dài mật khẩu <6";
                break; 
            }
        } else if(checkValidate=="leng3"){
            if(accessValue.length<3){
                validate.validate=false;
                validate.err += "Độ dài ký tự không hợp lệ , độ dài >3";
                break; 
            }
        } else if(checkValidate=="leng6"){
            if(accessValue.length<6){
                validate.validate=false;
                validate.err += "Độ dài ký tự không hợp lệ , độ dài >6";
                break; 
            }
        } else if(checkValidate=="number"){
            if(isNaN(accessValue)){
                validate.validate=false;
                validate.err += "Định dạng phải là số";
                break; 
            }
        } else if(checkValidate=="date"){
            if(!validateDate(accessValue)){
                validate.validate=false;
                validate.err += "Không đúng định dạng ngày tháng năm";
                break; 
            }
        }    
    }
    return validate;
}



export const getValueDetail = (infoTitle,value) =>{
    var validate = JSON.parse(JSON.stringify(value)); 
    for(var i=0;i<infoTitle.length;i++){
        let detail=infoTitle[i].view;
        let titleCheck = infoTitle[i].title;
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

