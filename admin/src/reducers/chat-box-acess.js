
import { createSlice } from '@reduxjs/toolkit';
import { forEach } from 'draft-js/lib/DefaultDraftBlockRenderMap';
import ChatMessage from '../utils/ChatMessage';
import ManagerData from '../actions/ManagerData.js'
var newInfo = new ChatMessage();

export  const  chatBoxData = createSlice({
    name: 'chatBoxData',
    initialState: {
        conversations: [],
        list_user:[],
        group_chat:[],
        list_friend_chat:[],
        persional_chat:[],
        selectedConversation: [],
        select_chat:null,
        inChatbox:false,
        infoUser:null,
        table_view:"" ,
        columns: [],
        data:[],
        refesh:false,
    },
    reducers: {
        initChat: (state,action) => {
         console.log("initChat   ...........   ",state,action);
          state.group_chat = action.payload.group_chat;
          state.list_friend_chat = action.payload.list_friend_chat;
          state.persional_chat = action.payload.persional_chat;
        },
        initUserList: (state,action) => {
          //state.value -= 1
          var userInfo = JSON.parse(JSON.stringify(action.payload));
          state.list_user =action.payload ;//  userInfo.filter(o=>(o.users_id!=ManagerData.saveInfoUser.users_id));
        },
        loadPersionalChat: (state,action) => {
          //state.value -= 1
          state.persional_chat = action.payload;
        },
        loadConversation: (state,action) => {
          //state.value -= 1
          console.log("loadConversation   ...........   ",action);
          state.selectedConversation = newInfo.informChatboxDataChat(action.payload,state.list_user);// action.payload;
        },
        addMessageToConverSation: (state,action) => {
          //state.value -= 1
         
          var infoData= newInfo.insertChatboxDataChat(state.selectedConversation,
            action.payload,state.list_user);
            console.log("addMessageToConverSation   ...........   ",infoData);
          state.selectedConversation =infoData;
        },
        selectUserChat: (state, action) => {
            var userInfo = JSON.parse(JSON.stringify(action.payload));
            userInfo.teamName =""; //user_friend_id1 //user_friend_id2
            userInfo.imageUrl ="";
            var currentId=userInfo.user_friend_id1;
            if(currentId==ManagerData.saveInfoUser.users_id){
              currentId=userInfo.user_friend_id2;
            }
            var infoNextUser = state.list_user.filter(o=>(o.users_id==currentId));
            if(infoNextUser.length>0){
              userInfo.teamName =infoNextUser[0].username; //user_friend_id1 //user_friend_id2
              userInfo.imageUrl =infoNextUser[0].avatar;
            }

            state.select_chat=userInfo;// action.payload;
            state.selectedConversation=[];
        },

    },
})

export const { initChat, initUserList, selectUserChat,loadConversation,loadPersionalChat,addMessageToConverSation } = chatBoxData.actions;

export default chatBoxData.reducer;
