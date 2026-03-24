const express = require('express');
const router = express.Router();
const Chat = require('../app/models/Chat.model');
const adminAuthenticated = require('../middlewares/authenticate.js');
const customerAuthenticated = require('../middlewares/authenticateCustomer');
const chatCtrl = require('../controllers/chat.controller');
const mqtt = require('mqtt');
const {returnOK,returnOKCustom,returnNotFound} = require('../utils/returnResponse.js');

var option={
	port:3000,
	clientId : 'message_' + Math.random().toString(16).substr(2, 8),
	username : "test",
	useNewUrlParser: true,
	password: 'testadmin'
};

const serverMqtt='ws://'+process.env.APP_HOST+':'+ process.env.APP_PORT;
var client = mqtt.connect(serverMqtt, option);
client.on('connect', function(){

});

router.route('/chat').post(adminAuthenticated,(req, res) => {
  ////console.log("chat",req.body);
  var currentTime = (new Date()).getTime()/1000;
  var currentPost = currentTime*1000 + req.currentUser.users_id;
  var infoSave ={
    topic:"/chat/"+req.body.post_id,
    content:{comment_id:currentPost,post_id:req.body.post_id,author_id:req.currentUser.users_id,
                  author_IP:req.body.author_IP,reply_id:req.currentUser.users_id,content:req.body.content,
                  coment_tag:req.body.coment_tag, comment_atack:req.body.comment_atack,
                  comment_parent_id:req.body.comment_parent_id},
    time:currentTime
  };

  Chat.insertMany(infoSave, function (err, data) {
    if (err) returnNotFound(res,err);
    else{
      client.publish(infoSave.topic, JSON.stringify(infoSave));
      returnOKCustom(res,JSON.stringify({content:infoSave.content,time:infoSave.time}));
    }
  });
});


router.route('/info_mqtt').get(adminAuthenticated,(req, res) => {
  returnOKCustom(res,JSON.stringify({port:3000,server:serverMqtt, username:"test",password:"testadmin"}));
});

router.route('/find_chat').post(adminAuthenticated,chatCtrl.getAllTableData);
// thêm PHÒNG CHAT với bạn bè 1 NGƯỜI
router.route('/create_friend').post(adminAuthenticated,chatCtrl.getRoomChatFriend);
// tạo nhóm chat với bạn bè
router.route('/create_group').post(adminAuthenticated,chatCtrl.createRoomChatGroupChat);
// thêm 1 người nhóm chat
router.route('/add_person_to_group').post(adminAuthenticated,chatCtrl.addUserToGroupChat);
// thay đổi thông tin phòng chat thông tin 1 người
router.route('/manager_add').post(adminAuthenticated,chatCtrl.addDataToTable);
router.route('/manager_delete').post(adminAuthenticated,chatCtrl.deleteData);  
router.route('/manager_update').post(adminAuthenticated,chatCtrl.updateData);
router.route('/sendMessages').post(adminAuthenticated,chatCtrl.sendMessageComment);
// thu hồi tin nhắn
router.route('/removeMessages').post(adminAuthenticated,chatCtrl.removeMessagesComment);
router.route('/admin_content').post(adminAuthenticated,chatCtrl.adminContent);
router.route('/tag_content').post(adminAuthenticated,chatCtrl.tagContent);
router.route('/file_content').post(adminAuthenticated,chatCtrl.fileContentCommnent);
router.route('/cus_content').post(customerAuthenticated,chatCtrl.customerContentCommnent);
router.route('/delete').post(customerAuthenticated,chatCtrl.customerDeleteCommnent);
router.route('/update').post(customerAuthenticated,chatCtrl.customerUpdateCommnent);

module.exports = router;