
const DocumentFileAndFloder = require('../models/DocumentFileAndFloder.js');
var documentFileAndFloder =new DocumentFileAndFloder();
const {getRamdomData} = require('../utils/utilsString.js');
const {getLanggue} = require('../utils/Validate.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

var squel = require("squel");
const knex = require('../config/knex.js');
const {DEFINE_DOCUMENT,uploadFileS3} = require('../models/S3UploadFile.js');
const WarningInfo = require("../config/warningInfo.js");
const {returnOK,returnFalse,returnOKCustom,returnNotFound,returnInfoQuery } = require('../utils/returnResponse.js');
const {mangerModelAdmin} = require('../models/database/managerAll.model.js');
const brokerProvisioning = require('../services/mqtt/brokerProvisioning.js');

var documentCtrl={};

async function  queryInfoSql(sql,params=null,res=null){
    try{
        var x= await knex.raw(sql, params);
        var data=[];
        if ((x!=null)&&(x.length>0)) {
            data= x[0];
        }
        return data;
    }
    catch(ie){
        if(res!=null) returnFalse(res,"Can't  add file to server",WarningInfo.NOT_UPLOAD_FILE );
    }   
}

async function  querySqlAndChangeLink(sql,params=null){
    var x= await queryInfoSql(sql,params);
    return x;
}

async function  saveDocumentFileHtml(res,content_html,dirSave){
    try{
        var link= await  documentFileAndFloder.createNewFileToS3(content_html,dirSave);
       // link= await uploadFileS3("public/"+ link,"",DEFINE_DOCUMENT.TYPE_HTML);
        if(link==null)  returnFalse(res,"Can't  add file to server" ,WarningInfo.NOT_UPLOAD_FILE);
        return link;
    }
    catch(ie){
        returnFalse(res,"Can't  add file to server" ,WarningInfo.NOT_UPLOAD_FILE);
        return null;
    }
    
}


documentCtrl.postAddPageToDataBase  = async function(request, res) {       
        let content=request.body["content"] ;
        let content_html=request.body["content_html"] ;
        let group=request.body["group_file"];
        let group_content_sub_id = request.body["group_content_sub_id"];
        // save file
        var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
        if(link!=null)
        {
            var tableSelect=mangerModelAdmin('gro_pages_content');
            let infoShortName = tableSelect.getFieldLinkShort();
            let shortName ="";
            if(infoShortName!=null){
                shortName= await  tableSelect.getTagName(tableSelect.getNameTable(),"name_short",request.body["title"]);
            }

            var addData = squel.insert().into('gro_pages_content')
            // save data Sql 
            addData.set("group_content_sub_id",group_content_sub_id)
            .set("group_file",group)
            .set("filesave",link)
            .set("title",request.body["title"])
            .set("name_short",shortName) 
            .set("content",request.body["content"])
            .set("type_langue",request.body["type_langue"])
            .set("detail_content_id",request.body["detail_content_id"])
            .set("is_main_pages_id",request.body["is_main_pages_id"])
            .set("content_img",request.body["content_img"])
            .set("set_to_fist",0)
            .set("id_created",request.currentUser.users_id)
            .set("id_updated",request.currentUser.users_id)
            .set("created_at","NOW()",{dontQuote: true}) 
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0);
            var p = addData.toParam();
            var x = await queryInfoSql(p.text, p.values, res);
            return returnOKCustom(res,{ data: x  });  
        }
 
}



documentCtrl.postUpdatePageToDataBase  = async function(request, res) {       
    let content=request.body["content"] ;
    let content_html=request.body["content_html"] ;
    let group=request.body["group_file"];
    let group_content_sub_id = request.body["group_content_sub_id"];
    // save file
    var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
    if(link!=null)
    {
        var tableSelect=mangerModelAdmin('gro_pages_content');
        let infoShortName = tableSelect.getFieldLinkShort();
        let shortName ="";
        if(infoShortName!=null){
            shortName= await tableSelect.getTagName(tableSelect.getNameTable(),"name_short",request.body["title"]);
        }
            
        var addData = squel.update().table('gro_pages_content')
        // save data Sql
        addData.set("group_content_sub_id",group_content_sub_id)
        .set("group_file",group)
        .set("filesave",link)
        .set("title",request.body["title"])
        .set("detail_content_id",request.body["detail_content_id"])
        .set("type_langue",request.body["type_langue"])
        .set("name_short",shortName)
        .set("content",request.body["content"])
        .set("is_main_pages_id",request.body["is_main_pages_id"])
        .set("content_img",request.body["content_img"])
        .set("id_created",request.currentUser.users_id)
        .set("id_updated",request.currentUser.users_id)
        .set("updated_at","NOW()",{dontQuote: true})
        .set("deleteflag",0)
        .where('pages_content_id = ?', request.body['pages_content_id']);
        var p = addData.toParam();
        var x = await queryInfoSql(p.text, p.values, res);
        return returnOKCustom(res,{ data: x  });  
    }

}

documentCtrl.postAddProductPageToDataBase  = async function(request, res) {       
    let content_html=request.body["content_html"] ;
    let product_id = request.body["product_id"];
    // save file
    var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
    if(link!=null)
    {
        var addData = squel.insert().into('product_pages')
        // save data Sql
        addData.set("product_id",product_id)
        .set("filesave",link)
        .set("id_created",request.currentUser.users_id)
        .set("id_updated",request.currentUser.users_id)
        .set("created_at","NOW()",{dontQuote: true}) 
        .set("updated_at","NOW()",{dontQuote: true})
        .set("deleteflag",0);
            var p = addData.toParam();
            var x = await queryInfoSql(p.text, p.values, res);
        return returnOKCustom(res,{ data: x  });  
    }
}


documentCtrl.postAddServicePageToDataBase  = async function(request, res) {       
    let content_html=request.body["content_html"] ;
    let service_group_id = request.body["service_group_id"];
    // save file
    var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
    if(link!=null)
    {
        var addData = squel.insert().into('service_pages')
        // save data Sql
        addData.set("service_group_id",service_group_id)
        .set("filesave",link)
        .set("id_created",request.currentUser.users_id)
        .set("id_updated",request.currentUser.users_id)
        .set("created_at","NOW()",{dontQuote: true}) 
        .set("updated_at","NOW()",{dontQuote: true})
        .set("deleteflag",0);
        var p = addData.toParam();
        var result= await knex.raw(p.text, p.values)
        if ((result==null)||(result.length==0)) {
            return returnNotFound(res,{ message: "Error pages"},WarningInfo.ERROR_SERVER);
        }
        return returnOK(res,result[0]);   
    }
}


documentCtrl.postUpdateServicePageToDataBase  = async function(request, res) {       
    let content_html=request.body["content_html"] ;
    let service_group_id = request.body["service_group_id"];
    let service_pages_id= request.body["service_pages_id"];
    // save file
    var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
    if(link!=null)
    {
        var addData = squel.update().table('service_pages')
            .set("service_group_id",service_group_id)
            .set("filesave",link)
            .set("id_updated",request.currentUser.users_id)
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0)            .where('service_pages_id = ?', service_pages_id);
        var p = addData.toParam();
        var result= await knex.raw(p.text, p.values)
        if ((result==null)||(result.length==0)) {
            return returnNotFound(res,{ message: "Error pages"},WarningInfo.ERROR_SERVER);
        }
        return returnOK(res,result[0]);
        
    }
}



documentCtrl.postUpdateProductPageToDataBase  = async function(request, res) {       
    let content_html=request.body["content_html"] ;
    let product_id = request.body["product_id"];
    let product_pages_id = request.body["product_pages_id"];
    // save file
    var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
    if(link!=null)
    {
        var addData = squel.update().table('product_pages')
        // save data Sql
        addData.set("product_id",product_id)
        .set("filesave",link)
        .set("id_created",request.currentUser.users_id)
        .set("id_updated",request.currentUser.users_id)
        .set("updated_at","NOW()",{dontQuote: true})
        .set("deleteflag",0)
        .where('product_pages_id = ?', product_pages_id);
            var p = addData.toParam();
            var x = await queryInfoSql(p.text, p.values, res);
        return returnOKCustom(res,{ data: x  });  
    }

}



documentCtrl.postAddAdvertisementToDataBase  = async function(request, res) {       
    let content=request.body["content"] ;
    let content_html=request.body["content_html"] ;
    let group=request.body["group_file"];
    let group_content_sub_id = request.body["group_content_sub_id"];
    let group_product_id = request.body["group_product_id"];
    // save file
    var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
    if(link!=null)
    {
        if(request.body.is_postPages){
            var addData = squel.insert().into('advertisement_content')
            // save data Sql
            addData.set("group_content_sub_id",group_content_sub_id)
            .set("group_file",group)
            .set("filesave",link)
            .set("title",request.body["title"])
            .set("content",request.body["content"])
            .set("set_to_fist",0)
            .set("content_img",request.body["content_img"])
            .set("id_created",request.currentUser.users_id)
            .set("id_updated",request.currentUser.users_id)
            .set("created_at","NOW()",{dontQuote: true}) 
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0);
            var p = addData.toParam();
            var x = await queryInfoSql(p.text, p.values, res);
            return returnOKCustom(res,{ data: x  }); 
        }
        else
        {
            var addData = squel.insert().into('advertisement_product')
            // save data Sql
            addData.set("group_product_id",group_product_id)
//"group_product_id","filesave","title","content","content_img","land_image","set_to_fist"
            .set("filesave",link)
            .set("title",request.body["title"])
            .set("content",request.body["content"])
            .set("land_image",request.body["land_image"])
            .set("set_to_fist",0)
            .set("content_img",request.body["content_img"])
            .set("id_created",request.currentUser.users_id)
            .set("id_updated",request.currentUser.users_id)
            .set("created_at","NOW()",{dontQuote: true}) 
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0);
            var p = addData.toParam();
            var x = await queryInfoSql(p.text, p.values, res);
            return returnOKCustom(res,{ data: x  }); 
        }
         
    } else returnFalse(ress,"khong the ghi vao file");

}


documentCtrl.postUpdateAdvertisementToDataBase  = async function(request, res) {       
    let content=request.body["content"] ;
    let content_html=request.body["content_html"] ;
    let group=request.body["group_file"];
    let group_content_sub_id = request.body["group_content_sub_id"];
    let group_product_id = request.body["group_product_id"];

    // save file
    var link= await saveDocumentFileHtml(res,content_html,'storeHtml');
    if(link!=null)
    {
        if(request.body.is_postPages){
            var addData = squel.update().table('advertisement_content')
            // save data Sql
            addData.set("group_content_sub_id",group_content_sub_id)
            .set("group_file",group)
            .set("filesave",link)
            .set("title",request.body["title"])
            .set("content",request.body["content"])
            .set("set_to_fist",request.body["set_to_fist"])
            .set("content_img",request.body["content_img"])
            .set("id_created",request.currentUser.users_id)
            .set("id_updated",request.currentUser.users_id)
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0)
            .where('advertisement_id = ?', request.body['advertisement_id']);
            var p = addData.toParam();
            var x = await queryInfoSql(p.text, p.values, res);
                return returnOKCustom(res,{ data: x  });  
        }
        else
        {
            var addData = squel.update().table('advertisement_content')
            // save data Sql
            addData.set("group_product_id",group_product_id)
            .set("filesave",link)
            .set("title",request.body["title"])
            .set("content",request.body["content"])
            .set("land_image",request.body["land_image"])
            .set("set_to_fist",request.body["set_to_fist"])
            .set("content_img",request.body["content_img"])
            .set("id_created",request.currentUser.users_id)
            .set("id_updated",request.currentUser.users_id)
            .set("updated_at","NOW()",{dontQuote: true})
            .set("deleteflag",0)
            .where('advertisement_product_id = ?', request.body['advertisement_product_id']);
            var p = addData.toParam();
            var x = await queryInfoSql(p.text, p.values, res);
                return returnOKCustom(res,{ data: x  });  
        }
        
    } else returnFalse(ress,"khong the ghi vao file");

}

documentCtrl.getAllInMenuPage  = async function(listID) {
    var listArray = Array.isArray(listID) ? listID : [listID];
    var placeholders = listArray.map(() => '?').join(',');
    var sql= "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue= ?  AND gro_pages_content.is_main_pages_id<1 and group_content_sub_id IN("+placeholders+") Order By set_to_fist ,pages_content_id DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 2 ";
    var x= await knex.raw(sql, [getLanggue(req), ...listArray]);
    if ((x!=null)&&(x.length>0)) {
        var subjects =[];
        var idItem=-1;
        for(var i=0;i<x[0].length;i++)
        {
            var itemPage = x[0][i];
            if(!!itemPage){
                if(itemPage.group_content_sub_id!=idItem){
                    subjects.push({title:itemPage.group_content,items:[]});
                    idItem= itemPage.group_content_sub_id;
                }
                if(itemPage.is_main_pages_id==-1){
                    subjects[subjects.length-1].items.push({ title: itemPage.title , route:'/group_page/'+
                                itemPage.pages_content_id, typePage: itemPage.title });
                }
                else
                {
                    subjects[subjects.length-1].items.push({ title: itemPage.title , route:'/page_detail/'+
                                itemPage.name_short, typePage: itemPage.title });
                }

                
            }
        }
        return subjects;
    }
    return [];
}

documentCtrl.getAllContentDetailPage  = async function(req, res) {
    var listID = req.params.typePage;
    var listArray = Array.isArray(listID) ? listID : [listID];
    var placeholders = listArray.map(() => '?').join(',');
    var sql= "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue= ? AND gro_pages_content.is_main_pages_id<1  and group_content_sub_id IN("+placeholders+") Order By set_to_fist ,pages_content_id DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 10 ";
                returnOKCustom(res,await queryInfoSql(sql, [getLanggue(req), ...listArray]));
}

documentCtrl.getAllContentLatestPage  = async function(req, res) {
    var listID = req.params.typePage;
    var listArray = Array.isArray(listID) ? listID : [listID];
    var placeholders = listArray.map(() => '?').join(',');
    var sql= "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue= ? AND gro_pages_content.is_main_pages_id<1  and group_content_sub_id IN("+placeholders+") Order BY id_created DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 10 ";
                returnOKCustom(res,await queryInfoSql(sql, [getLanggue(req), ...listArray]));
}

const DOCUMENT_PAGE_SIZE = 10;
const MAX_DOCUMENT_PAGE_SIZE = 100;
const MAX_DOCUMENT_OFFSET = 1000000;
const MAX_DOCUMENT_GROUPS = 50;

function parseDocumentGroupIds(value) {
    const rawIds = Array.isArray(value)
        ? value
        : (typeof value === 'string' ? value.split(',') : []);

    if (rawIds.length === 0 || rawIds.length > MAX_DOCUMENT_GROUPS) return null;

    const groupIds = [];
    const seen = new Set();
    for (const rawId of rawIds) {
        const normalizedId = typeof rawId === 'string' ? rawId.trim() : String(rawId);
        if (!/^\d+$/.test(normalizedId)) return null;

        const groupId = Number(normalizedId);
        if (!Number.isSafeInteger(groupId) || groupId < 1) return null;
        if (!seen.has(groupId)) {
            seen.add(groupId);
            groupIds.push(groupId);
        }
    }

    return groupIds;
}

function parseDocumentPagination(body) {
    const start = body.start === undefined ? 0 : Number(body.start);
    if (!Number.isSafeInteger(start) || start < 0 || start > MAX_DOCUMENT_OFFSET) return null;

    if (body.end === undefined || body.end === null || body.end === '') {
        return { offset: start, limit: DOCUMENT_PAGE_SIZE };
    }

    const end = Number(body.end);
    if (!Number.isSafeInteger(end) || end <= start) return null;

    const limit = end - start;
    if (limit > MAX_DOCUMENT_PAGE_SIZE) return null;
    return { offset: start, limit: limit };
}

documentCtrl.getAllContentDocumentData  = async function(req, res) {
    const body = req.body || {};
    const groupIds = parseDocumentGroupIds(body.data);
    const isCounterRequest = body.counter === true;

    if (!groupIds || (body.counter !== undefined && typeof body.counter !== 'boolean')) {
        return res.status(400).json({
            error: { message: 'Invalid document query.' },
            error_code: WarningInfo.VALIDATE_WORNG,
            data: { message: 'BAD_REQUEST' }
        });
    }

    const pagination = isCounterRequest ? null : parseDocumentPagination(body);
    if (!isCounterRequest && !pagination) {
        return res.status(400).json({
            error: { message: 'Invalid pagination.' },
            error_code: WarningInfo.VALIDATE_WORNG,
            data: { message: 'BAD_REQUEST' }
        });
    }

    const placeholders = groupIds.map(() => '?').join(', ');
    const select = isCounterRequest
        ? 'COUNT(gro_pages_content.pages_content_id) AS number_document'
        : 'gro_pages_content.*';
    let sql = `SELECT ${select} FROM gro_pages_content
        WHERE gro_pages_content.deleteflag = 0
          AND gro_pages_content.type_langue = ?
          AND gro_pages_content.is_main_pages_id < 1
          AND gro_pages_content.group_content_sub_id IN (${placeholders})`;
    const params = [getLanggue(req), ...groupIds];

    if (!isCounterRequest) {
        sql += ' ORDER BY gro_pages_content.set_to_fist DESC, gro_pages_content.pages_content_id DESC LIMIT ? OFFSET ?';
        params.push(pagination.limit, pagination.offset);
    }

    try {
        const result = await knex.raw(sql, params);
        return returnOKCustom(res, result[0] || []);
    } catch (error) {
        console.error('Unable to retrieve document content.', error);
        return returnFalse(res, { message: 'Unable to retrieve document content.' }, WarningInfo.ERROR_SERVER);
    }
}

documentCtrl.getAllContentStartPage  = async function(req,res) {
    var langgue = getLanggue(req);
    var sql=  "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue= ? AND gro_pages_content.is_main_pages_id<1 ORDER BY group_content_sub_id,set_to_fist,pages_content_id DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 2";
    returnOKCustom(res,await querySqlAndChangeLink(sql, [langgue]));
}

documentCtrl.getAllInfoTool = async function(req,res) {
    var langgue = getLanggue(req);
    var sql=  "SELECT gro_pages_content.* FROM gro_pages_content WHERE type_langue= ?  group_content_sub_id > 40 and deleteflag=0;";
    returnOKCustom(res,await querySqlAndChangeLink(sql, [langgue]));
}

documentCtrl.getAllInfoHome = async function(req,res) {
    var langgue = getLanggue(req);
    var sql=  "SELECT gro_pages_content.* FROM gro_pages_content Where deleteflag=0 and type_langue = ? and is_main_pages_id<1 ORDER BY set_to_fist DESC,pages_content_id DESC LIMIT 4";
    returnOKCustom(res,await querySqlAndChangeLink(sql, [langgue]));
}

documentCtrl.getAllInGroupPage  = async function(req,res) {
    var is_main_pages_id = req.body['is_main_pages_id'];
    var sqlraw = squel.select().from('gro_pages_content', 'g')
                        .field('g.*')
                        .field('COALESCE(u.username, c.username)', 'username_updated')
                        .left_join('users', 'u', 'g.id_updated = u.users_id')
                        .left_join('customer', 'c', 'g.id_updated = c.customer_id')
                        .where('g.deleteflag = 0')
                        .where('g.type_langue = ?', getLanggue(req))
                        .where('(g.is_main_pages_id = ? OR g.pages_content_id = ?)', is_main_pages_id, is_main_pages_id);
    var p = sqlraw.toParam();
    var x= await knex.raw(p.text, p.values);
    var data=[];
    if ((x!=null)&&(x.length>0)) {
        data = x[0];
    }
    returnOKCustom(res,data);
}

documentCtrl.getAllContentAdvertisement  = async function(req,res) {
    var sql= " SELECT advertisement_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT advertisement_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM advertisement_content WHERE advertisement_content.deleteflag =0 ORDER BY set_to_fist ,advertisement_id DESC) advertisement_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=advertisement_content.group_content_sub_id WHERE n <= 1 ;";
    if(req.body.group_content_sub_id==0){
        var sql ="SELECT advertisement_content.* FROM advertisement_content where deleteflag=0 ORDER BY `advertisement_content`.`set_to_fist` ASC LIMIT 4";
    }
    returnOKCustom(res,await queryInfoSql(sql));
}

documentCtrl.getRamdomContent  = async function(req,res) {
    var dataValue = req.body.type + 10;
    var langgue = getLanggue(req);
    var sql= " SELECT gro_pages_content.* FROM gro_pages_content Where deleteflag=0 and type_langue= ? and group_content_sub_id< ? and group_content_sub_id > ? and is_main_pages_id<1  ORDER BY set_to_fist ASC LIMIT 10";
    returnOKCustom(res,await queryInfoSql(sql, [langgue, dataValue, req.body.type]));
}


function runOpenSSL(args) {
    return execFileSync("openssl", args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 1024 * 1024,
    });
}

function getMqttIdentity(body) {
    const fallbackId = body.type == null ? "" : String(Number(body.type) + 10);
    const mqttId = String(body.mqtt_id || fallbackId).trim();
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(mqttId)) {
        throw new Error("mqtt_id must contain only letters, numbers, dots, underscores, or hyphens.");
    }
    return mqttId;
}

// Names already used by the broker PKI in MQTT_CERTS.
const RESERVED_CERT_NAMES = ["ca", "server", "pki"];
// Device EEPROM regions (define_All.h: MTLS_*_MAX_LENGTH, without the '\0').
const MTLS_LIMITS = {caCertificate: 703, certificate: 767, deviceKey: 255};

// Keeps only the requested PEM block, so the files and the API response hold
// no openssl text such as "Bag Attributes" or EC PARAMETERS.
function cleanPem(text, label) {
    const pattern = new RegExp("-----BEGIN " + label + "-----[\\s\\S]+?-----END " + label + "-----");
    const block = String(text).match(pattern);
    if (!block) {
        throw new Error("No " + label + " PEM block found.");
    }
    return block[0].split(/\r?\n/).map(function(line) { return line.trim(); })
        .filter(Boolean).join("\n") + "\n";
}

function getCertificatePaths(certDirectory, mqttId) {
    return {
        caCertificate: path.join(certDirectory, "ca.crt"),
        caPrivateKey: path.join(certDirectory, "ca.key"),
        certificate: path.join(certDirectory, mqttId + ".crt"),
        privateKey: path.join(certDirectory, mqttId + ".key"),
        deviceKey: path.join(certDirectory, mqttId + ".esp.key"),
        csr: path.join(certDirectory, mqttId + ".csr"),
        ext: path.join(certDirectory, mqttId + ".ext"),
    };
}

function readCertificateFiles(paths) {
    const labels = {
        caCertificate: "CERTIFICATE",
        certificate: "CERTIFICATE",
        privateKey: "PRIVATE KEY",
        deviceKey: "EC PRIVATE KEY",
    };
    const files = {};
    Object.keys(labels).forEach(function(key) {
        // Certificates made by generate_ecdsa_certs.ps1 may lack <id>.esp.key.
        const raw = key === "deviceKey" && !fs.existsSync(paths.deviceKey) ?
            runOpenSSL(["ec", "-in", paths.privateKey, "-no_public"]) :
            fs.readFileSync(paths[key], "utf8");
        const content = cleanPem(raw, labels[key]);
        files[key] = {
            name: path.basename(paths[key]),
            size: Buffer.byteLength(content),
            maxSize: MTLS_LIMITS[key] || null,
            content,
        };
    });
    return files;
}

function writePem(filePath, content, flag) {
    fs.writeFileSync(filePath, content, {encoding: "ascii", flag: flag || "w", mode: 0o600});
}

function certificateResponse(files) {
    return {
        files,
        caCertificate: files.caCertificate.content,
        certificate: files.certificate.content,
        privateKey: files.privateKey.content,
        deviceKey: files.deviceKey.content,
        client_dir: files.certificate.content,
    };
}

documentCtrl.saveCertificateMqtt  = async function(req,res) {
    const createdFiles = [];
    let paths = null;
    try {
        const body = req.body || {};
        const mqttId = getMqttIdentity(body);
        if (RESERVED_CERT_NAMES.includes(mqttId.toLowerCase())) {
            throw new Error("mqtt_id is reserved: " + mqttId);
        }
        const requiredFields = ["content", "mqtt_pub", "mqtt_sub", "mqtt_user", "mqtt_pass"];
        const config = {};
        requiredFields.forEach(function(field) {
            config[field] = body[field] == null ? "" : String(body[field]).trim();
            if (config[field].length > 40) {
                throw new Error(field + " must be 40 characters or fewer.");
            }
        });
        if (!config.mqtt_user || !config.mqtt_pass) {
            throw new Error("mqtt_user and mqtt_pass are required.");
        }
        config.mqtt_id = mqttId;

        // Certificates are issued and kept on the web_manager server; the broker
        // only receives the configuration (brokerProvisioning).
        paths = getCertificatePaths(brokerProvisioning.getPkiDirectory(), mqttId);

        if ([paths.certificate, paths.privateKey, paths.deviceKey].some(fs.existsSync)) {
            throw new Error("An MQTT certificate already exists for this mqtt_id.");
        }
        const existing = await knex("mqtt_microservice")
            .where({mqtt_id: mqttId, deleteflag: 0})
            .first();
        if (existing) {
            throw new Error("An active MQTT record already exists for this mqtt_id.");
        }
        // A queued DELETE would otherwise remove the new device from the broker.
        const revoking = await knex("mqtt_microservice")
            .where({mqtt_id: mqttId, broker_sync_status: brokerProvisioning.STATUS.REVOKE_PENDING})
            .first();
        if (revoking) {
            throw new Error("The previous device with this mqtt_id is still being revoked on the broker.");
        }

        writePem(paths.ext, [
            "basicConstraints=critical,CA:FALSE",
            "keyUsage=critical,digitalSignature",
            "extendedKeyUsage=clientAuth",
            "subjectKeyIdentifier=hash",
            "authorityKeyIdentifier=keyid,issuer",
            "",
        ].join("\n"));
        createdFiles.push(paths.privateKey);
        writePem(paths.privateKey, cleanPem(runOpenSSL([
            "genpkey", "-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-256",
            "-pkeyopt", "ec_param_enc:named_curve",
        ]), "PRIVATE KEY"), "wx");
        // SEC1 key without the public key: the smallest form, for the device EEPROM.
        createdFiles.push(paths.deviceKey);
        writePem(paths.deviceKey, cleanPem(runOpenSSL([
            "ec", "-in", paths.privateKey, "-no_public",
        ]), "EC PRIVATE KEY"), "wx");
        runOpenSSL([
            "req", "-new", "-key", paths.privateKey, "-out", paths.csr,
            "-subj", "/CN=" + mqttId,
        ]);
        createdFiles.push(paths.certificate);
        writePem(paths.certificate, cleanPem(runOpenSSL([
            "x509", "-req", "-in", paths.csr, "-CA", paths.caCertificate,
            "-CAkey", paths.caPrivateKey, "-set_serial",
            "0x" + crypto.randomBytes(16).toString("hex"),
            "-days", "3650", "-sha256", "-extfile", paths.ext,
        ]), "CERTIFICATE"), "wx");

        const files = readCertificateFiles(paths);
        Object.keys(MTLS_LIMITS).forEach(function(key) {
            if (files[key].size > MTLS_LIMITS[key]) {
                throw new Error(files[key].name + " is " + files[key].size +
                    " B; the device region holds " + MTLS_LIMITS[key] + " B.");
            }
        });
        config.fingerprint256 = new crypto.X509Certificate(files.certificate.content).fingerprint256;
        config.messageAuthKey = crypto.randomBytes(32).toString("hex");

        const now = knex.fn.now();
        const insertData = {
            content: config.content,
            mqtt_pub: config.mqtt_pub,
            mqtt_sub: config.mqtt_sub,
            mqtt_user: config.mqtt_user,
            mqtt_pass: config.mqtt_pass,
            mqtt_id: mqttId,
            message_auth_key: config.messageAuthKey,
            // Outbox: the row is committed first, then delivered to the broker.
            // If the broker is unreachable the retry worker delivers it later.
            broker_sync_status: brokerProvisioning.STATUS.PENDING,
            broker_sync_attempts: 0,
            created_at: now,
            updated_at: now,
            id_created: req.currentUser.users_id,
            id_updated: req.currentUser.users_id,
            deleteflag: 0,
        };
        const inserted = await knex("mqtt_microservice").insert(insertData);
        createdFiles.length = 0;
        const brokerSynced = await brokerProvisioning.trySyncRow(
            Object.assign({mqtt_microservice_id: inserted[0]}, insertData));
        returnOKCustom(res, Object.assign({
            mqtt_microservice_id: inserted[0],
            mqtt_id: mqttId,
            fingerprint256: config.fingerprint256,
            mqtt_message_key: config.messageAuthKey,
            // The broker re-reads its JSON files on change, no restart needed.
            requiresBrokerRestart: false,
            brokerSynced,
            brokerSyncStatus: brokerSynced ? brokerProvisioning.STATUS.SYNCED : brokerProvisioning.STATUS.PENDING,
        }, certificateResponse(files)));
    } catch (error) {
        createdFiles.forEach(function(filePath) {
            fs.rmSync(filePath, {force: true});
        });
        console.error("Failed to save MQTT certificate/configuration:", error.message);
        returnFalse(res, "Unable to save MQTT certificate/configuration.", WarningInfo.ERROR_SERVER);
    } finally {
        if (paths) {
            fs.rmSync(paths.csr, {force: true});
            fs.rmSync(paths.ext, {force: true});
        }
    }
}

documentCtrl.getCertificateMqtt  = async function(req,res) {
    try {
        const mqttId = getMqttIdentity(req.body || {});
        // Read from the local PKI folder only: works while the broker is down.
        const files = readCertificateFiles(getCertificatePaths(brokerProvisioning.getPkiDirectory(), mqttId));
        const row = await knex("mqtt_microservice")
            .where({mqtt_id: mqttId, deleteflag: 0})
            .first();
        let brokerSyncStatus = row ? row.broker_sync_status || null : null;
        // Opening the certificate also retries a delivery that is still pending.
        if (row && brokerSyncStatus === brokerProvisioning.STATUS.PENDING &&
            await brokerProvisioning.trySyncRow(row)) {
            brokerSyncStatus = brokerProvisioning.STATUS.SYNCED;
        }
        returnOKCustom(res, Object.assign({
            mqtt_id: mqttId,
            brokerSynced: brokerSyncStatus === brokerProvisioning.STATUS.SYNCED,
            brokerSyncStatus,
        }, certificateResponse(files)));
    } catch (error) {
        console.error("Failed to read MQTT certificate:", error.message);
        returnFalse(res, "Unable to read MQTT certificate.", WarningInfo.ERROR_SERVER);
    }
}

// Clone detection status of a device (mqttBroker/antiClone.js):
// { enrolled, quarantine: {reason, at, ip, previousIp, ...} | null, lastIp }.
documentCtrl.antiCloneStatusMqtt  = async function(req,res) {
    try {
        const mqttId = getMqttIdentity(req.body || {});
        returnOKCustom(res, Object.assign({mqtt_id: mqttId}, await brokerProvisioning.antiCloneStatus(mqttId)));
    } catch (error) {
        console.error("Failed to read MQTT anti-clone status:", error.message);
        returnFalse(res, "Unable to read MQTT anti-clone status.", WarningInfo.ERROR_SERVER);
    }
}

// Releases a quarantined identity. Use it only after the copy is out of
// service (e.g. a false alarm or the genuine device was replaced); when the
// key may have leaked, revoke and issue a new certificate instead.
documentCtrl.releaseAntiCloneMqtt  = async function(req,res) {
    try {
        const mqttId = getMqttIdentity(req.body || {});
        const row = await knex("mqtt_microservice").where({mqtt_id: mqttId, deleteflag: 0}).first("mqtt_microservice_id");
        if (!row) {
            return res.status(404).json({error: "No active MQTT record for this mqtt_id.", error_code: WarningInfo.ERROR_SERVER});
        }
        await brokerProvisioning.resetAntiClone(mqttId);
        console.warn("MQTT anti-clone quarantine released for", mqttId, "by user", req.currentUser.users_id);
        returnOKCustom(res, {mqtt_id: mqttId, released: true});
    } catch (error) {
        console.error("Failed to release MQTT anti-clone quarantine:", error.message);
        returnFalse(res, "Unable to release MQTT anti-clone quarantine.", WarningInfo.ERROR_SERVER);
    }
}

// Deletes the device record and revokes it on the broker: its rules are
// removed (client is refused at once and disconnected), its certificate and
// keys are moved to <MQTT_PKI_DIR>/revoked/. When the broker is unreachable
// the revocation stays "revoke_pending" and the sync worker retries it.
documentCtrl.revokeCertificateMqtt  = async function(req,res) {
    try {
        const mqttId = getMqttIdentity(req.body || {});
        const row = await knex("mqtt_microservice")
            .where({mqtt_id: mqttId, deleteflag: 0})
            .first();
        if (!row) {
            // Retry of a revocation already recorded (idempotent).
            const queued = await knex("mqtt_microservice")
                .where({mqtt_id: mqttId, broker_sync_status: brokerProvisioning.STATUS.REVOKE_PENDING})
                .first();
            if (queued) {
                const brokerSynced = await brokerProvisioning.trySyncRow(queued);
                return returnOKCustom(res, {mqtt_id: mqttId, revoked: true, brokerSynced,
                    brokerSyncStatus: brokerSynced ? brokerProvisioning.STATUS.REVOKED : brokerProvisioning.STATUS.REVOKE_PENDING});
            }
            return res.status(404).json({error: "No active MQTT record for this mqtt_id.", error_code: WarningInfo.ERROR_SERVER});
        }
        const updated = await knex("mqtt_microservice")
            .where({mqtt_microservice_id: row.mqtt_microservice_id, deleteflag: 0})
            .update(Object.assign({
                deleteflag: 1,
                oldid: row.mqtt_microservice_id,
                updated_at: knex.fn.now(),
                id_updated: req.currentUser.users_id,
            }, brokerProvisioning.revokeUpdateFields(row)));
        if (!updated) {
            return res.status(409).json({error: "The MQTT record changed, try again.", error_code: WarningInfo.ERROR_SERVER});
        }
        const result = await brokerProvisioning.afterDelete(row);
        returnOKCustom(res, {
            mqtt_microservice_id: row.mqtt_microservice_id,
            mqtt_id: mqttId,
            deleted: true,
            // null: the record was never provisioned on the broker by web_manager.
            revoked: result.revoked,
            brokerSynced: result.brokerSynced,
            brokerSyncStatus: result.revoked === null ? null :
                result.brokerSynced ? brokerProvisioning.STATUS.REVOKED : brokerProvisioning.STATUS.REVOKE_PENDING,
        });
    } catch (error) {
        console.error("Failed to revoke MQTT certificate:", error.message);
        returnFalse(res, "Unable to revoke MQTT certificate.", WarningInfo.ERROR_SERVER);
    }
}

module.exports =documentCtrl;
