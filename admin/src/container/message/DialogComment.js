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
import ChatMessage from '../../utils/ChatMessage';
import { sendMessageChat} from '../../api/httpBaseUtil.js';
import { initChat,loadConversation,addMessageToConverSation } from '../../reducers/chat-box-acess';
import launcherIcon from '../../compoment/chat/boot/assets/logo-no-bg.svg';
import launcherIconActive from '../../compoment/chat/boot/assets/close-icon.png';
import MessageList from '../../compoment/chat/boot/components/MessageList';
import UserInput from '../../compoment/chat/boot/components/UserInput';


const HOST_HTTP_CHAT = process.env.HOST_HTTP_CHAT;


var chatboxSample =[{ time:1634669318436,content:{comment_id:1634669318436222,post_id:1001,author_id:1,author_IP:"192",
reply_id:13,content:"Gastropub cardigan jean shorts, kogi Godard PBR&B lo-fi locavore. Organic chillwave vinyl Neutra. Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:0}
},
{ time:1634669318436,content:{comment_id:1634669318436223,post_id:1001,author_id:13,author_IP:"192",
reply_id:1,content:" Organic chillwave vinyl Neutra. Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:0}
},
{ time:1634669318436,content:{comment_id:1634669318436224,post_id:1001,author_id:1,author_IP:"192",
reply_id:13,content:"Bushwick Helvetica cred freegan, crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436223}
},{ time:1634669318436,content:{comment_id:1634669318436225,post_id:1001,author_id:13,author_IP:"192",
reply_id:1,content:" crucifix Godard craft beer deep v mixtape cornhole Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:0}
},
{ time:1634669318436,content:{comment_id:1634669318436226,post_id:1001,author_id:13,author_IP:"192",
reply_id:1,content:" Truffaut master cleanse pour-over Odd Future beard. Portland polaroid iPhone. ",
coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436225}
},{ time:1634669318436,content:{comment_id:1634669318436227,post_id:1001,author_id:1,author_IP:"192",
reply_id:13,content:"Gastropub cardigan jean shorts, ",
coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436225}
}
];

var child = React.createRef();
var newInfo = new ChatMessage();
export default function DialogComment() {
 // https://github.com/kingofthestack/react-chat-window
    const [isOpen, setIsOpen] = useState(false);
    const dispatch = useDispatch();
    const messageList = useSelector(state => state.chatBoxData.selectedConversation);
    const userList = useSelector(state => state.chatBoxData.list_user);
    const selectChat = useSelector(state => state.chatBoxData.select_chat);

    useEffect(() => {
        dispatch(loadConversation(chatboxSample));// newInfo.informChatboxDataChat(chatboxSample,userList)));
    }, [dispatch,userList]);

    const _onMessageWasSent=(message)=> {
      console.log("message .....",message);
      if (message.length > 0) {
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
    const handleClick=()=> {
        setIsOpen(!isOpen);
    }

    
    const onUserInputSubmit=(message)=> {
        //this.props.onUserInputSubmit(message);
    }

    const onFilesSelected=(filesList)=> {
        //this.props.onFilesSelected(filesList);
    }

    return (<div  style={{position:"fixed", zIndex: 999}}>
                <div id="sc-launcher1" >
                    <div className={'sc-launcher1' +(isOpen?" opened":"") } onClick={handleClick}>
                        <img className={'sc-open-icon'} src={launcherIconActive} />
                        <img className={'sc-closed-icon'} src={launcherIcon} />
                    </div>
                </div>
                <div className={'sc-chat-window ' +(isOpen? 'opened' : 'closed')}>
                    <div className="sc-header1"></div>
                    <MessageList
                        messages={messageList}
                        imageUrl={launcherIconActive}
                    />
                    <UserInput  
                        onSubmit={onUserInputSubmit}
                        onFilesSelected={onFilesSelected}
                        showEmoji={true}
                    />
                </div>
            </div>);
}
