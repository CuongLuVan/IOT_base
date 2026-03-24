
import React, { Component,useState } from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {exportColumeData } from '../../config/table/ManagerToView.js'
import {
    FormControl,
    Button,
    InputLabel,
    MenuItem,
    Select,
    TextField
  } from '@material-ui/core';

import Swal from 'sweetalert2';
import { registerPageToWriter } from '../../api/httpBaseUtil.js';
import FormChat from '../../compoment/chat/index.js';
import ConversationSearch from '../../compoment/chat/ConversationSearch';
import ConversationList from '../../compoment/chat/ConversationList';



const messages = [
    {
      text: "Hello there",
      id: "5",
      name: "Ironman",
      uid: "user5",
      avatar: "https://data.cometchat.com/assets/images/avatars/ironman.png",
      imageUrl: null,
      imageAlt: null,
      messageText: 'Ok fair enough. Well good talking to you.',
      createdAt: 'Oct 20',
    },
    {
      text: "Hello there",
      id: "1",
      name: "sronman",
      uid: "user1",
      avatar: "https://data.cometchat.com/assets/images/avatars/ironman.png",
      imageUrl: null,
      imageAlt: null,
      messageText: 'Ok fair enough. Well good talking to you.',
      createdAt: 'Oct 20',

    }
    ,
    {
      text: "Hello there",
      id: "3",
      name: "sroman",
      uid: "user3",
      avatar: "https://data.cometchat.com/assets/images/avatars/ironman.png",
      imageUrl: null,
      imageAlt: null,
      messageText: 'Ok fair enough. Well good talking to you.',
      createdAt: 'Oct 20',
     
    }
  ]
  const user = {
    "uid" : "user5"
  }



const ChatBoxInternal=()=> {
  var userlist=[];
      
      var conversations = [];
      for(var i=0;i<100;i++){
        userlist.push({
            id:"item"+i,
            link:"",
            imageUrl: null,
            imageAlt: null,
            avatar:"https://data.cometchat.com/assets/images/avatars/ironman.png",
            name:"name"+i,
            latestMessageText:"vui qua",
        });
      }
      for(var i=0;i<100;i++){
        conversations.push({
          id:"item"+i,
          link:"",
          imageUrl: null,
          imageAlt: null,
          avatar:"https://data.cometchat.com/assets/images/avatars/ironman.png",
          name:"name"+i,
          latestMessageText:"vui qua",
          messages:messages
        });
      }
      var selectedConversation = conversations[0];

  const [state, setState] = useState({userlist:userlist,selectedConversation:selectedConversation,conversations:conversations });
      

       const conversationChanged = conversationId => {
         console.log("................conversationId",conversationId);

        };
      
        const sendMessage = messange => {
          console.log("................sendMessage",messange);
          var texx=  {
            text: messange,
            id: "5",
            name: "sroman",
            uid: "user5",
            avatar: "https://data.cometchat.com/assets/images/avatars/ironman.png",
            imageUrl: null,
            imageAlt: null,
            messageText: messange,
            createdAt: 'Oct 20',
           
          };
          var selectedConversationChange = state.selectedConversation;
          selectedConversationChange.messages.push(texx);
          setState((prev) => ({
            ...prev,
            selectedConversation: selectedConversationChange
          }));

         };

      return (
          <div className="chat-container">
            <div className={'row-chat-box'} >
                <div className={'column-chat-box-left'} >
                    <ConversationSearch conversations={state.conversations} />
                    <ConversationList
                        onConversationItemSelected={conversationChanged}
                        conversations={state.conversations}
                        selectedConversation={state.selectedConversation} />
                </div>
                <div className={'column-chat-box-right'} >
                    <FormChat
                        messages={state.selectedConversation.messages}
                        selectedConversation={state.selectedConversation}
                        conversations={state.conversations}
                        onSubmit={(val) => sendMessage(val)}
                        user={user}
                        lstUser={state.userlist}
                    />
                </div>
            </div>
          </div>
        );

}

export default ChatBoxInternal;