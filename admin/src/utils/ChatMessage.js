var moment = require('moment');


class ChatMessage{
    timeConverter=(UNIX_timestamp)=>{
        var a = new Date(UNIX_timestamp * 1000);
        var months = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                            'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
        return time;
      }

    compareChatbox=( a, b )=> {
        if ( a.time < b.time ){
            return -1;
        }
        else
        if ( a.time > b.time ){
            return 1;
        }
        return 0;
    }
    
    shortDataChatbox(data){
        data= data.sort(this.compareChatbox);
        var newData=[];
        var acessData =[];
        data.forEach(element => {
            if(element.content.comment_parent_id==0){
                element.content.otherContent =[];
                newData.push(element);
            }
            else
            {
                acessData.push(element);
            }
        });
    
        acessData.forEach(element => {
            var found = newData.find(o => o.comment_id ==element.comment_parent_id);
            newData[found].content.otherContent.push(element);   
        });
    
        return newData;
    }

    findNameUser=(data,id)=>{
        var found = data.find(o => o.user_id ==id);
        if(found>-1)  return data[found].name;
        return "undefine";
    }

    informChatboxDataComment(data,lisUser,currentID){
        var messageList= [
            {type: 'text', author: 'me', data: { text: "Why don't they have salsa on the table?"} },
            {type: 'text', author: 'them', data: { text: 'What do you need salsa for?'} },
            {type: 'text', author: 'me', data: { text: 'Salsa is now the number one condiment in America.'} },
            {type: 'text', author: 'them', data: { text: "You know why? Because people like to say 'salsa.' 'Excuse me, do you have salsa?' 'We need more salsa.' 'Where is the salsa? No salsa?'"} },
            {type: 'text', author: 'me', data: { text: "You know it must be impossible for a Spanish person to order seltzer and not get salsa. 'I wanted seltzer, not salsa.'"} },
            {type: 'text', author: 'them', data: { text: "Don't you know the difference between seltzer and salsa?? You have the seltezer after the salsa!"} },
            {type: 'text', author: 'me', data: { text: 'See, this should be a show. This is the show. '} },
            {type: 'text', author: 'them', data: { text: 'What?'} }, 
            {type: 'emoji', author: 'me', data: { emoji: '😋'} },
            {type: 'file', author: 'me',
              imageUrl: 'https://i.pinimg.com/originals/eb/b0/2a/ebb02aedec9bc74f65e38311c7e14d34.png',
              data: {
                url: 'https://i.pinimg.com/originals/eb/b0/2a/ebb02aedec9bc74f65e38311c7e14d34.png',
                fileName: 'bigBlue.png'
              }
            }];
            var messageInfo=[];
            data.forEach(element => {
                element.timeSend=timeConverter(element.time);
                element['data']={};
                if(currentID==element.content.author_id)
                    element['author'] = 'me';
                else
                    element['author']=findNameUser(lisUser,element.content.author_id);
                element.data.text=element.content.content;
                element.element=element;

            });

        return messageInfo;

    }

    findDataComnet=(data,id)=>{
        var found = data.findIndex(o => o.content.comment_id ==id);
        if(found>-1)  return data[found];
        return  null;
    }

    findNameUserDetail=(data,id)=>{
        var found = data.findIndex(o => o.users_id ==id);
        if(found>-1)  return data[found];
        return null;
    }

    informChatboxDataChat(data,lisUser){
            var messageInfo=[];
            data.forEach(element => {
                var dataInsert= JSON.parse(JSON.stringify(element));
                var day = moment(dataInsert.time);
                dataInsert['timeSend']=day.utc().format();
                dataInsert['author']=this.findNameUserDetail(lisUser,dataInsert.content.author_id);
                //element.element=element;
                if(dataInsert.content.comment_parent_id>0){
                    dataInsert.content.parent_data=this.findDataComnet(data,dataInsert.content.comment_parent_id);
                }
                messageInfo.push(dataInsert);
            });
        return messageInfo;
    }

    insertChatboxDataChat(messageInfo,element,lisUser){
        var infoExisting = messageInfo.findIndex(o=>(o.content.comment_id==element.content.comment_id));
        
        var messageInfoData= JSON.parse(JSON.stringify(messageInfo));
        if(infoExisting>-1) return messageInfoData;
        if(!!!element.timeSend)
        {
            var day = moment(element.time);
            element.timeSend=day.utc().format();
        }
        element['author']=this.findNameUserDetail(lisUser,element.content.author_id);
        //element.element=element;
        if(element.content.comment_parent_id>0){
            element.content.parent_data=this.findDataComnet(messageInfoData,element.content.comment_parent_id);
        }
        messageInfoData.push(element);
        return messageInfoData;
    }

}




export default ChatMessage;