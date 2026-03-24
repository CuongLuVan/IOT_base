import React, {useEffect ,useState} from 'react'
import { useDispatch,useSelector } from 'react-redux';
import Launcher from '../../compoment/chat/boot/components/Launcher';
import {render} from 'react-dom';
import messageHistory from '../../compoment/chat/boot/messageHistory';
import '../../compoment/chat/boot/assets/styles';
import '../../compoment/chat/boot/styles';
import { connect } from 'react-redux';
import * as actions from '../../actions/message-info';
import PropTypes from 'prop-types';
import ManagerData from '../../actions/ManagerData.js'
import ChatWindow from '../../compoment/chat/boot/components/ChatWindow';
import ChatMessage from '../../utils/ChatMessage';
import { sendMessageChat,getHistoryRoutes} from '../../api/httpBaseUtil.js';
import { selectUserChat,loadConversation,addMessageToConverSation } from '../../reducers/chat-box-acess';

const HOST_HTTP_CHAT = process.env.HOST_HTTP_CHAT;

var child = React.createRef();
export default function DialogChat() {
 // https://github.com/kingofthestack/react-chat-window
    const dispatch = useDispatch();
    const messageList = useSelector(state => state.chatBoxData.selectedConversation);
    const userList = useSelector(state => state.chatBoxData.list_user);
    const selectChat = useSelector(state => state.chatBoxData.select_chat);
    const persionalChat = useSelector(state => state.chatBoxData.persional_chat);
    useEffect(() => {
        if(persionalChat.length>0){
            dispatch(selectUserChat(persionalChat[0]));
            getHistoryRoutes({chatRoom:"/chat/"+persionalChat[0].persional_chat_id}).then(result=>{
                dispatch(loadConversation(result.data.chatRoom));
            });
        }
       // dispatch(loadConversation(chatboxSample));// newInfo.informChatboxDataChat(chatboxSample,userList)));
    }, [dispatch,persionalChat]);

    const _onMessageWasSent=(message)=> {
      console.log("message .....",message);
      if (message.length > 0) {
        /*var data= {
          author: {users_id: 1000, username: 'sample xx', avatar: 'https://i.pinimg.com/originals/eb/b0/2a/ebb02aedec9bc74f65e38311c7e14d34.png'},
          content:{comment_id:1634669318436227,post_id:1001,author_id:1001,author_IP:"192",reply_id:1001,content:message,
                      coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436225},
          time: 1634669318436,
          timeSend: "2021-10-19T18:48:38Z"
        };*/
        var infoChat={post_id:selectChat.persional_chat_id,content:message ,coment_tag:"" ,
                        comment_atack:"",comment_parent_id:1634669318436225 };
        sendMessageChat(infoChat).then((info)=>{
            //dispatch(actionsMesage.sendMessage(info));
            dispatch(addMessageToConverSation(info.data));
            child.current.clearTextData();
        }).catch(err=>{
        });
      }
    }
    const replyMessage=(message)=> {
      console.log("replyMessage .....",message);
    }
    return (<div  style={{position:"fixed", zIndex: 999}}>
                <Launcher
                  ref={child}
                  agentProfile={{
                    teamName: !!selectChat?selectChat.teamName:"" ,
                    imageUrl: !!selectChat?selectChat.imageUrl:""
                  }}
                  replyMessage ={replyMessage}
                  onMessageWasSent={_onMessageWasSent}
                  messageList={messageList}
                  showEmoji
                />
            </div>);
}
