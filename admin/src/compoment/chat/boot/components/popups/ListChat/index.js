import React, {useState, useEffect} from 'react';
import './ListChat.css';
import ListChatItem from '../ListChatItem';
import LeftIcon from '../../../assets/left.png';
import RightIcon from '../../../assets/right.png';
import { useDispatch,useSelector } from 'react-redux';
import { selectUserChat,loadPersionalChat,loadConversation } from '../../../../../../reducers/chat-box-acess';
import {getChatWithFriend,getHistoryRoutes} from '../../../../../../api/httpBaseUtil'; 
import ManagerData from '../../../../../../actions/ManagerData.js'

export default function ListChat () {
 
    const dispatch = useDispatch();
    const [conversations, setConversations] = useState([]);
    const [conversationsShow, setConversationsShow] = useState([]);
    const [itemCount, setItemCount] = useState(0);
    const listUser = useSelector(state => state.chatBoxData.list_user);
    const persionalChat = useSelector(state => state.chatBoxData.persional_chat);
  // setConversations(listData);
    useEffect(() => {
      const userInfo = (listUser || []).filter(o=>(o.users_id!=ManagerData.saveInfoUser.users_id));
      setConversations(userInfo);
      setItemCount(0);
      setConversationsShow(userInfo.slice(0, 5));
    },[listUser])

    // Shows 5 users from index start (the slice must use the new index, not the old one).
    const showFrom = (start) => {
      setItemCount(start);
      setConversationsShow(conversations.slice(start, start+5));
    }
    const beforeItem = () => showFrom(Math.max(0, itemCount-1));
    const afterItem = () => showFrom(Math.min(Math.max(0, conversations.length-5), itemCount+1));
    const selectChat = (id) => {

            var infoData = persionalChat.filter(o=>((o.user_friend_id1==id)||(o.user_friend_id2==id)));
            if(infoData.length>0){
              dispatch(selectUserChat(infoData[0]));
              getHistoryRoutes({chatRoom:"/chat/"+infoData[0].persional_chat_id}).then(result=>{
                dispatch(loadConversation(result.data.chatRoom));
              });
            }
            else
            {
                var infoData={name:"",color:"",icon:"",user_friend_id1:-1, user_friend_id2:id};
                getChatWithFriend(infoData).then(result=>{
                  var messageInfoData =  JSON.parse(JSON.stringify(persionalChat));
                  messageInfoData.push(result.data);
                  dispatch(loadPersionalChat(messageInfoData));
                  dispatch(selectUserChat(result.data));
                  getHistoryRoutes({chatRoom:"/chat/"+result.data.persional_chat_id}).then(result=>{
                    dispatch(loadConversation(result.data.chatRoom));
                  });
                });
            }
      
    }
    
    return (
            <div className='sc-listchat'>
              <div className='sc-listchat-control'>
            <div className='sc-listchat-left-button' onClick={beforeItem}>
              <img src={LeftIcon} alt='' />
            </div>
            {conversationsShow.map((category) => 
                                      <ListChatItem
                                            selectChat={(value)=>selectChat(value)}
                                            key={category.users_id}
                                            data={category} />
                                    )
            }
              <div className='sc-listchat-right-button' onClick={afterItem}>
              <img src={RightIcon} alt=''/>  
              </div>          
            </div>
            </div>
            );    
}
