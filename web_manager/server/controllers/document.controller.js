
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
    var langgue = getLanggue(req);
    var sqlraw = squel.select().from('gro_pages_content')
        .where('deleteflag=0')
        .where('type_langue = ?', langgue)
        .where('is_main_pages_id = ? OR pages_content_id = ?', is_main_pages_id, is_main_pages_id);
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

function readBrokerJson(filePath) {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Invalid MQTT broker configuration: " + path.basename(filePath));
    }
    return value;
}

function upsertBrokerEntry(entries, key, id, value) {
    const index = entries.findIndex(function(entry) { return entry[key] === id; });
    if (index === -1) {
        entries.push(value);
    } else {
        entries[index] = Object.assign({}, entries[index], value);
    }
}

function saveBrokerSettings(brokerDir, mqttId, config) {
    const files = {
        acl: path.join(brokerDir, "mqtt_acl.json"),
        clientIds: path.join(brokerDir, "mqtt_client_ids.json"),
        deviceCerts: path.join(brokerDir, "mqtt_device_certs.json"),
        messageAuth: path.join(brokerDir, "mqtt_message_auth.json"),
        users: path.join(brokerDir, "mqtt_users.json"),
    };
    const originals = {};
    const settings = {};
    Object.keys(files).forEach(function(key) {
        originals[key] = fs.readFileSync(files[key], "utf8");
        settings[key] = readBrokerJson(files[key]);
    });

    ["rules", "clients", "devices", "users"].forEach(function(key) {
        const configKey = key === "rules" ? "acl" :
            key === "clients" ? "clientIds" :
            key === "devices" ? "deviceCerts" : "users";
        if (!Array.isArray(settings[configKey][key])) {
            throw new Error("Invalid MQTT broker configuration array: " + key);
        }
    });
    if (!settings.messageAuth.keys || typeof settings.messageAuth.keys !== "object" ||
        Array.isArray(settings.messageAuth.keys)) {
        throw new Error("Invalid MQTT message authentication keys configuration.");
    }

    const publishTopics = config.mqtt_pub ? [config.mqtt_pub] : [];
    const subscribeTopics = config.mqtt_sub ? [config.mqtt_sub] : [];
    upsertBrokerEntry(settings.acl.rules, "clientId", mqttId, {
        clientId: mqttId,
        publish: publishTopics,
        subscribe: subscribeTopics,
    });
    upsertBrokerEntry(settings.clientIds.clients, "clientId", mqttId, {
        clientId: mqttId,
        username: config.mqtt_user,
        label: config.content,
    });
    upsertBrokerEntry(settings.deviceCerts.devices, "clientId", mqttId, {
        clientId: mqttId,
        fingerprint256: config.fingerprint256,
    });
    upsertBrokerEntry(settings.users.users, "username", config.mqtt_user, {
        username: config.mqtt_user,
        password: config.mqtt_pass,
    });
    settings.messageAuth.keys[mqttId] = config.messageAuthKey;

    const nextContents = {
        acl: settings.acl,
        clientIds: settings.clientIds,
        deviceCerts: settings.deviceCerts,
        messageAuth: settings.messageAuth,
        users: settings.users,
    };
    const tempPaths = {};
    const changed = [];
    try {
        Object.keys(files).forEach(function(key) {
            tempPaths[key] = files[key] + "." + process.pid + "." +
                crypto.randomBytes(6).toString("hex") + ".tmp";
            fs.writeFileSync(tempPaths[key], JSON.stringify(nextContents[key], null, 2) + "\n", {
                encoding: "utf8",
                mode: 0o600,
            });
        });
        Object.keys(files).forEach(function(key) {
            fs.renameSync(tempPaths[key], files[key]);
            changed.push(key);
        });
    } catch (error) {
        changed.forEach(function(key) {
            fs.writeFileSync(files[key], originals[key], {encoding: "utf8", mode: 0o600});
        });
        throw error;
    } finally {
        Object.keys(tempPaths).forEach(function(key) {
            if (fs.existsSync(tempPaths[key])) {
                fs.unlinkSync(tempPaths[key]);
            }
        });
    }
}

documentCtrl.saveCertificateMqtt  = async function(req,res) {
    try {
        const body = req.body || {};
        const mqttId = getMqttIdentity(body);
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

        const certDir = process.env.MQTT_CERTS;
        if (!certDir) {
            throw new Error("MQTT_CERTS is not configured.");
        }
        const certDirectory = path.resolve(certDir);
        const brokerDir = path.dirname(certDirectory);
        const privateKeyPath = path.join(certDirectory, mqttId + ".key");
        const csrPath = path.join(certDirectory, mqttId + ".csr");
        const certificatePath = path.join(certDirectory, mqttId + ".crt");
        const caCertificatePath = path.join(certDirectory, "ca.crt");
        const caPrivateKeyPath = path.join(certDirectory, "ca.key");
        const extPath = path.join(certDirectory, "device-save-mongo.ext");

        if ([privateKeyPath, csrPath, certificatePath].some(fs.existsSync)) {
            throw new Error("An MQTT certificate already exists for this mqtt_id.");
        }
        const existing = await knex("mqtt_microservice")
            .where({mqtt_id: mqttId, deleteflag: 0})
            .first();
        if (existing) {
            throw new Error("An active MQTT record already exists for this mqtt_id.");
        }

        runOpenSSL([
            "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048",
            "-out", privateKeyPath,
        ]);
        fs.chmodSync(privateKeyPath, 0o600);
        runOpenSSL([
            "req", "-new", "-key", privateKeyPath, "-out", csrPath,
            "-subj", "/CN=" + mqttId,
        ]);
        runOpenSSL([
            "x509", "-req", "-in", csrPath, "-CA", caCertificatePath,
            "-CAkey", caPrivateKeyPath, "-set_serial",
            "0x" + crypto.randomBytes(16).toString("hex"), "-out", certificatePath,
            "-days", "365", "-sha256", "-extfile", extPath,
        ]);

        const certificateDer = runOpenSSL([
            "x509", "-in", certificatePath, "-outform", "DER",
        ]);
        config.fingerprint256 = crypto.createHash("sha256").update(certificateDer)
            .digest("hex").toUpperCase().match(/.{2}/g).join(":");
        config.messageAuthKey = crypto.randomBytes(32).toString("hex");

        const now = knex.fn.now();
        const insertData = {
            content: config.content,
            mqtt_pub: config.mqtt_pub,
            mqtt_sub: config.mqtt_sub,
            mqtt_user: config.mqtt_user,
            mqtt_pass: config.mqtt_pass,
            mqtt_id: mqttId,
            created_at: now,
            updated_at: now,
            id_created: req.currentUser.users_id,
            id_updated: req.currentUser.users_id,
            deleteflag: 0,
        };
        const inserted = await knex.transaction(async function(trx) {
            const result = await trx("mqtt_microservice").insert(insertData);
            saveBrokerSettings(brokerDir, mqttId, config);
            return result;
        });
        const privateKey = fs.readFileSync(privateKeyPath, "utf8");
        const certificate = fs.readFileSync(certificatePath, "utf8");
        const client_dir = certificate;
        returnOKCustom(res, {
            mqtt_microservice_id: inserted[0],
            mqtt_id: mqttId,
            fingerprint256: config.fingerprint256,
            mqtt_message_key: config.messageAuthKey,
            requiresBrokerRestart: true,
            privateKey,
            certificate,
            client_dir,
        });
    } catch (error) {
        console.error("Failed to save MQTT certificate/configuration:", error.message);
        returnFalse(res, "Unable to save MQTT certificate/configuration.", WarningInfo.ERROR_SERVER);
    }
}

documentCtrl.getCertificateMqtt  = async function(req,res) {
    try {
        const mqttId = getMqttIdentity(req.body || {});
        const certDir = process.env.MQTT_CERTS;
        if (!certDir) {
            throw new Error("MQTT_CERTS is not configured.");
        }
        const privateKey = fs.readFileSync(path.join(certDir, mqttId + ".key"), "utf8");
        const certificate = fs.readFileSync(path.join(certDir, mqttId + ".crt"), "utf8");
        const client_dir = certificate;
        returnOKCustom(res, {privateKey, certificate, client_dir});
    } catch (error) {
        console.error("Failed to read MQTT certificate:", error.message);
        returnFalse(res, "Unable to read MQTT certificate.", WarningInfo.ERROR_SERVER);
    }
}

module.exports =documentCtrl;