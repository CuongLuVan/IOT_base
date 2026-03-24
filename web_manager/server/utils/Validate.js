const HttpStatus = require('http-status-codes');
const {mangerModelUser} = require('../models/database/managerAll.model.js');
const WarningInfo = require("../config/warningInfo.js");
const {returnOK,returnOKCustom,returnFalse,returnNotFound,returnInfoQuery } = require('../utils/returnResponse.js');


function ValidateEmail(mail) 
{
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail))
    {
        return true;
    }

    return false;
}
function validatePhoneNumber(input_str) {
    var re = /^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]*$/g;
    return re.test(input_str);
}
function checkError(data,rule){
    if(data==undefined) return {value:false,data:"  Thông tin "+rule.name+" không hợp lệ "};
    if(rule.type=="string"){
        if(data.length<rule.length) return {value:false,data:"  Độ dài "+rule.name+" phải lớn "+rule.length+" ký tự "};
    }else  if(rule.type=="email"){
        if(!ValidateEmail(data)) return {value:false,data:" Email không hợp lệ "};
    }else if(rule.type=="password"){
        if(data.length<rule.length) return {value:false,data:" : Độ dài "+rule.name+" phải lớn "+rule.length+" ký tự "};
    }else if(rule.type=="phone"){
        if(validatePhoneNumber(data)==false) return {value:false,data:" Số điện thoại không hợp lệ"};
    }else if(rule.type=="nospace"){
        if(data.length<rule.length) return {value:false,data:"  Độ dài "+rule.name+" phải lớn "+rule.length+" ký tự "};
        else if(data.includes(" ")) return {value:false,data:rule.name+"  không được chứa dấu cách "};
    }
    return {value:true,data:""};
}

exports.checkRegisterInfo = function  (req, res, next) {
    let {customer,is_sale,company} = req.body;
    var tableSelect=mangerModelUser('customer');
    var infoCheck = tableSelect.getValidate();
    var checkInfo = null;
    for(var k in infoCheck) {
        checkInfo = checkError(customer[k], infoCheck[k]);
        if(!checkInfo.value) {
            returnFalse(res,{message:checkInfo.data},WarningInfo.VALIDATE_WORNG);
            return;
        }
    }
    if(is_sale){
        tableSelect=mangerModelUser('company');
        infoCheck = tableSelect.getValidate();
        for(var k in infoCheck) {
            checkInfo = checkError(company[k], infoCheck[k]);
            if(!checkInfo.value) {
                returnFalse(res,{message:checkInfo.data},WarningInfo.VALIDATE_WORNG);
                return;
            }
        }
    }
    next();
}

exports.checkRegisterCompany = function  (req, res, next) {
    let {company} = req.body;
    var tableSelect=tableSelect=mangerModelUser('company');
    infoCheck = tableSelect.getValidate();
    for(var k in infoCheck) {
        checkInfo = checkError(company[k], infoCheck[k]);
        if(!checkInfo.value) {
            returnFalse(res,{message:checkInfo.data},WarningInfo.VALIDATE_WORNG);
            return;
        }
    }

    next();
}


exports.createTemplate = function (info,token) {

}

exports.getLanggue = function (req) {
    console.log(req.cookies["lang"]);
    let langgue = req.cookies["lang"];
    if(langgue==undefined) return 0;
    let langgueDetail ={vi:0,en:2}
    if(langgueDetail[langgue]!=undefined) return langgueDetail[langgue];
    return 0;
}
