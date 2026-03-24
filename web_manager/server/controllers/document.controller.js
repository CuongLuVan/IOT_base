
const DocumentFileAndFloder = require('../models/DocumentFileAndFloder.js');
var documentFileAndFloder =new DocumentFileAndFloder();
const {getRamdomData} = require('../utils/utilsString.js');
const {getLanggue} = require('../utils/Validate.js');

var squel = require("squel");
const knex = require('../config/knex.js');
const {DEFINE_DOCUMENT,uploadFileS3} = require('../models/S3UploadFile.js');
const WarningInfo = require("../config/warningInfo.js");
const {returnOK,returnFalse,returnOKCustom,returnNotFound,returnInfoQuery } = require('../utils/returnResponse.js');
const {mangerModelAdmin} = require('../models/database/managerAll.model.js');

var documentCtrl={};

async function  queryInfoSql(sql,res=null){
    try{
        var x= await knex.raw(sql);
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

async function  querySqlAndChangeLink(sql){
    var x= await queryInfoSql(sql);
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
            var x = await queryInfoSql(addData.toString(),res);
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
        .where('pages_content_id='+request.body['pages_content_id']);
        var x = await queryInfoSql(addData.toString(),res);
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
        var x = await queryInfoSql(addData.toString(),res);
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
        var result= await knex.raw(addData.toString())
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
            .set("deleteflag",0).where('service_pages_id='+service_pages_id);
        var result= await knex.raw(addData.toString())
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
        .where('product_pages_id='+product_pages_id);
        var x = await queryInfoSql(addData.toString(),res);
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
            var x = await queryInfoSql(addData.toString(),res);
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
            var x = await queryInfoSql(addData.toString(),res);
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
            .where('advertisement_id='+request.body['advertisement_id']);
            var x = await queryInfoSql(addData.toString(),res);
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
            .where('advertisement_product_id='+request.body['advertisement_product_id']);
            var x = await queryInfoSql(addData.toString(),res);
                return returnOKCustom(res,{ data: x  });  
        }
        
    } else returnFalse(ress,"khong the ghi vao file");

}

documentCtrl.getAllInMenuPage  = async function(listID) {
    var sql= "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue="+ getLanggue(req)+"  AND gro_pages_content.is_main_pages_id<1 and group_content_sub_id IN("
                +listID+") ORDER BY set_to_fist ,pages_content_id DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 2 "

    var x= await knex.raw(sql);
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
    var sql= "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue="+ getLanggue(req)+" AND gro_pages_content.is_main_pages_id<1  and group_content_sub_id IN("
                +listID+") ORDER BY set_to_fist ,pages_content_id DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 10 ";
                returnOKCustom(res,await queryInfoSql(sql));
}

documentCtrl.getAllContentLatestPage  = async function(req, res) {
    var listID = req.params.typePage;
    var sql= "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue="+ getLanggue(req)+" AND gro_pages_content.is_main_pages_id<1  and group_content_sub_id IN("
                +listID+") ORDER BY id_created DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 10 ";
                returnOKCustom(res,await queryInfoSql(sql));
}

documentCtrl.getAllContentStartPage  = async function(req,res) {
    var sql=  "SELECT gro_pages_content.*,group_content_sub.group_content , n FROM ( SELECT @prev := '', @n := 0 ) init JOIN ( SELECT gro_pages_content.*, @n := if(group_content_sub_id != @prev, 1, @n + 1) AS n, @prev := group_content_sub_id FROM gro_pages_content WHERE gro_pages_content.deleteflag =0 AND gro_pages_content.type_langue="+ getLanggue(req)+" AND gro_pages_content.is_main_pages_id<1 ORDER BY group_content_sub_id,set_to_fist,pages_content_id DESC) gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id WHERE n <= 2";
    returnOKCustom(res,await querySqlAndChangeLink(sql));
}

documentCtrl.getAllInfoTool = async function(req,res) {
    var sql=  "SELECT gro_pages_content.* FROM gro_pages_content WHERE type_langue="+ getLanggue(req)+" group_content_sub_id > 40 and deleteflag=0;";
    returnOKCustom(res,await querySqlAndChangeLink(sql));
}

documentCtrl.getAllInfoHome = async function(req,res) {
    

    var sql=  "SELECT gro_pages_content.* FROM gro_pages_content Where deleteflag=0 and type_langue ="+getLanggue(req)
    +" and is_main_pages_id<1 ORDER BY set_to_fist DESC,pages_content_id DESC LIMIT 4";
    returnOKCustom(res,await querySqlAndChangeLink(sql));
}

documentCtrl.getAllInGroupPage  = async function(req,res) {
    var is_main_pages_id = req.body['is_main_pages_id'];
    var sqlraw = squel.select().from('gro_pages_content')
        .where('deleteflag=0')
        .where('type_langue='+ getLanggue(req))
        .where('is_main_pages_id='+is_main_pages_id
                +" OR pages_content_id ="+is_main_pages_id );
    var x= await knex.raw(sqlraw.toString());
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
    var sql= " SELECT gro_pages_content.* FROM gro_pages_content Where deleteflag=0 and type_langue="+ getLanggue(req) +" and group_content_sub_id<"+
              +dataValue+  " and group_content_sub_id >"+req.body.type+" and is_main_pages_id<1  ORDER BY set_to_fist ASC LIMIT 10";
              returnOKCustom(res,await queryInfoSql(sql));
}

module.exports =documentCtrl;