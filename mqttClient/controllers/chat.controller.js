
const {mangerModel} = require('../models/database/managerAll');
const Chat = require('../app/models/Chat.model');
const {returnOK,returnOKCustom,returnNotFound} = require('../utils/returnResponse.js');

var chatCtrl={};
 
chatCtrl.getTableData =function (req, res) {
}

chatCtrl.getAllTableData = async function  (req, res) {
  try
  {
      //console.log("listUser",req.currentUser);
      var data={list_friend_chat:[],persional_chat:[],group_chat:[]};
      var tableCurrent = mangerModel('list_friend_chat');
      data.list_friend_chat= await tableCurrent.getAllInfoUser(req.currentUser.users_id);
      tableCurrent = mangerModel('persional_chat');
      data.persional_chat= await tableCurrent.getAllInfoUser(req.currentUser.users_id);
      tableCurrent = mangerModel('group_chat');
      //console.log("listUser  group_chat",data);
      data.group_chat= await tableCurrent.getAllInfoUser(req.currentUser.users_id);
      returnOKCustom(res,data)

  }
  catch(ie)
  {
    returnNotFound(res,ie);
  }
  
}

chatCtrl.getRoomChatFriend = async function  (req, res) {
  try
  {
    //console.log("getRoomChatFriend.......1");
    req.body["user_friend_id1"]=req.currentUser.users_id;
    var tableCurrent = mangerModel('persional_chat');
    var data= await tableCurrent.getAllInfoUserChatFriend(req.body.user_friend_id1,req.body.user_friend_id2);
    //console.log("getRoomChatFriend.......1",data);
    if(data.length==0){
      req.body["name"]="friend";
      req.body["user_friend_id1"]=req.currentUser.users_id;
      req.body["color"]="color";
      req.body["icon"]="1";
      var dataID= await tableCurrent.createDataToSql(req);
      //console.log("getRoomChatFriend.......dataID",dataID);
      if(dataID==0)  returnNotFound(res,"Không thể vào phòng",203);
      else {  
        req.body["persional_chat_id"]=dataID;
        returnOKCustom(req,(req.body));
      }
    } 
    else
      returnOKCustom(req,(data[0]));

  }
  catch(ie)
  {
    returnNotFound(res,"Server Error!");
  }  
}

chatCtrl.createRoomChatGroupChat = async function  (req, res) {
  try
  {
      var tableCurrent = mangerModel('group_chat');
      var dataID= await tableCurrent.createDataToSql(req);
        if(dataID==0) returnNotFound(res,"Không thể vào phòng",203);
        else {  
          req.body["persional_chat_id"]=dataID;
          req.body["userid"]=req.currentUser.users_id;
          tableCurrent = mangerModel('group_chat_detail');
          dataID= await tableCurrent.createDataToSql(req);
          returnOKCustom(req,(req.body));
        }
  }
  catch(ie)
  {
    returnNotFound(res,ie);
  }  
}

chatCtrl.addUserToGroupChat = async function  (req, res) {
  try
  {
        var   tableCurrent = mangerModel('group_chat_detail');
        var  dataID= await tableCurrent.createDataToSql(req);
        res.send(dataID);
  }
  catch(ie)
  {
    returnNotFound(res,ie,204);
  }  
}


chatCtrl.addDataToTable= async  function (req, res) {
  var table =req.body.table;
  var tableSelect=mangerModelAdmin(table);
  if(!!tableSelect){
    let data=req.body;
    var  dataID= await tableCurrent.createDataToSql(req);
    if(dataID>0 )  return returnOK(res,result[0]);  
    else  return returnFalse(res,error);
  }
  else
  {
    return returnNotFound(res,{ message: "Database inval" });
  }
}



chatCtrl.deleteData= async function (req, res) {
  var tableSelect=mangerModelAdmin(req.body.table);
  if(!!!tableSelect){
    return returnNotFound(res,{ message: "Database inval" });
  }
  if(!await tableSelect.checkDataToEdit(req)){
    return returnFalse(res,{ message: "Database not access lv2" });
  }
  let data=req.body;
  let dataUser= tableSelect.getFieldToDelete();
  var deleteSQL = squel.update().table(tableSelect.getNameTable())
    .set("id_updated",req.currentUser.users_id)
    .set("updated_at","NOW()",{dontQuote: true})
    .set("deleteflag",1)
    .where(dataUser.locationSelect+'='+data[dataUser.locationSelect]);
  knex.raw(deleteSQL.toString())
      .then(function(x) {
          return returnOK(res,x);   
      }).catch(function(err){
        return returnNotFound(res,{ message: "Database inval" });   
      });
}



chatCtrl.updateData= async  function (req, res) {

  var tableSelect=mangerModelAdmin(req.body.table);  
  if(!!!tableSelect){
    return returnNotFound(res,{ message: "Database inval" });
  }
  if(!tableSelect.checkDataEditDatabase(req.currentUser.permission_id,tableSelect.getTypeTable())){
    return returnNotFound(res,{ message: "Database not Acess 1" });
  }
  if(!await tableSelect.checkDataToEdit(req)){
    return returnNotFound(res,{ message: "Database not Acess 2" });
  }

  let data=req.body;
  var userid=req.currentUser.users_id;
  let dataUser=tableSelect.getFieldToDelete();
  var squelGet=squel.select().from(tableSelect.getNameTable());
  for(var i=0;i<dataUser.arrayCoppy.length;i++){
        let item=dataUser.arrayCoppy[i];
    /*    if(!!!data[item]) squelGet.set(item,null);
       else
        authen.set(item,data[item]);
     */
      squelGet.field(item);
  }
  squelGet.where(dataUser.locationSelect+'='+data[dataUser.locationSelect]);
  var authen = squel.insert().into(tableSelect.getNameTable())
                      .fromQuery( dataUser.arrayCoppy, squelGet);
                      //console.log("updateDataauthen.toString() ",authen.toString());
  var dataAdd= await knex.raw(authen.toString());
  if((dataAdd==null)||(dataAdd.length<1)) return returnNotFound(res,"Không tồn tại bản ghi dữ liệu này");     
  var authen2 = squel.update().table(tableSelect.getNameTable());
                        authen2.where(dataUser.locationSelect+'='+dataAdd[0].insertId)
                        .set(dataUser.valueSelect,1) 
                        .set("id_updated",userid)
                        .set("oldid",data[dataUser.locationSelect])
                        .set("deleteflag",1)
                        .set("updated_at","NOW()",{dontQuote: true});
  var deleteAdd= await knex.raw(authen2.toString());
  if((deleteAdd==null)||(deleteAdd.length<1)) return returnFalse(res,"Lỗi cập nhật dữ liệu"); 
  var sqlData = await tableSelect.checkSqlUpdateAdmin(req,data);   
  knex.raw(sqlData).then(function(x) {
      return returnOK(res,x);
  }).catch(function(err){
      return returnFalse(res,err);
  });
}

chatCtrl.sendMessageComment =  function (req, res) {
  Chat.find({topic:req.body.chatRoom,content:{$coment_tag: null} })
  .then((chatRoom) => {
    returnOKCustom(req,({chatRoom:chatRoom}));
  })
  .catch((error) => {
    returnNotFound(res,error,204);
  });
}

chatCtrl.removeMessagesComment =  function (req, res) {
    Chat.find({topic:req.body.chatRoom,content:{$coment_tag: null} })
      .then((chatRoom) => {
        returnOKCustom(req,({chatRoom:chatRoom}));
      })
      .catch((error) => {
        returnNotFound(res,error,204);
    });
}


chatCtrl.adminContent =  function (req, res) {
    Chat.find({topic:req.body.chatRoom })
      .then((chatRoom) => {
        returnOKCustom(req,({chatRoom:chatRoom}));
      })
      .catch((error) => {
        returnNotFound(res,error,204);
      });
}

chatCtrl.tagContent =  function (req, res) {
    Chat.find({topic:req.body.chatRoom,content:{$coment_tag: null} })
    .then((chatRoom) => {
      returnOKCustom(req,({chatRoom:chatRoom}));
    })
    .catch((error) => {
      returnNotFound(res,error,204);
    });
} 
chatCtrl.fileContentCommnent =  function (req, res) {
  Chat.find({topic:req.body.chatRoom ,content:{$comment_atack: null}})
  .then((chatRoom) => {
    returnOKCustom(req,({chatRoom:chatRoom}));
  })
  .catch((error) => {
    returnNotFound(res,error,204);
  });
}

chatCtrl.customerContentCommnent =  function (req, res) {
  Chat.find({topic:req.body.chatRoom })
    .then((chatRoom) => {
      returnOKCustom(req,({chatRoom:chatRoom}));
    })
    .catch((error) => {
      returnNotFound(res,error,204);
    });
}

chatCtrl.customerDeleteCommnent =  function (req, res) {
  Chat.find({content:{chat_id:req.body.chatRoom }})
    .then((chatRoom) => {
      for (let i = 0; i < chatRooms.length; i += 1) {
          const chatRoomID = chatRooms[i]._id;
          ChatRoom.findByIdAndUpdate(
              chatRoomID,
              { $content: {delete: true} },
              { new: true, upsert: true }
            ).exec();
      }
      returnOKCustom(req,({chatRoom:chatRoom}));
    })
    .catch((error) => {
      returnNotFound(res,error,204);
    });
}

chatCtrl.customerUpdateCommnent =  function (req, res) {
  // check inval
  Chat.find({content:req.body.chatRoom })
    .then((chatRoom) => {
      for (let i = 0; i < chatRooms.length; i += 1) {
          const chatRoomID = chatRooms[i]._id;
          ChatRoom.findByIdAndUpdate(
              chatRoomID,
              { $content: {delete: true} },
              { new: true, upsert: true }
            ).exec();
      }
      returnOKCustom(req,({chatRoom:chatRoom}));
    })
    .catch((error) => {
      returnNotFound(res,error,204);
    });
}


module.exports = chatCtrl;
