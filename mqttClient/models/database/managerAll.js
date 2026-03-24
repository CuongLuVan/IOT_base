
const GroupChat = require('./GroupChat.model.js');
const GroupChatDetail = require('./GroupChatDetail.model.js');
const ListFriendChat = require('./ListFriendChat.model.js');
const PersionalChat = require('./PersionalChat.model.js');

const classesFactory = {GroupChat,GroupChatDetail ,ListFriendChat,PersionalChat};
const classesFactorryMapping = {    group_chat:"GroupChat" , group_chat_detail:"GroupChatDetail",
                                    list_friend_chat:"ListFriendChat" ,persional_chat:"PersionalChat"};
                        
exports.mangerModel = function  (table) {
    var nameConvert=classesFactorryMapping[table];
    if(!!nameConvert){
        var tableSelect=new classesFactory[nameConvert]();
        if(!!tableSelect) return tableSelect;
    }
    //console.log("listUser nameConvert data => false");
    return false;
};
