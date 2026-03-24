const initialState = {
    conversations: [],
    selectedConversation: {},
    inChatbox:false,
    infoUser:null,
};

initialState.selectedConversation = initialState.conversations[1];



const messageInfo = (state = initialState, action) => {
    console.log("messageInfo ....................." ,state);
    const newState = { ...state };
    newState.inChatbox = (window.location.href).includes('chatbox');

    switch (action.type) {
        case 'CONVERSATIONS_LOADED': {
            newState.conversations = action.payload.conversations ? action.payload.conversations : [];
            newState.selectedConversation = action.payload.selectedConversation;
            return newState;
        }
      case 'SELECTED_CONVERSATION_CHANGED': {
        newState.selectedConversation = 
            newState.conversations.find(
                conversation => conversation.id === action.conversationId
            );

        return newState;
      }
      case 'DELETE_CONVERSATION': {
        if (state.selectedConversation) {
            let selectedConversationIndex = 
                newState.conversations.findIndex(c => c.id === newState.selectedConversation.id);
            newState.conversations.splice(selectedConversationIndex, 1);

            if (newState.conversations.length > 0) {
                if (selectedConversationIndex > 0) {
                    --selectedConversationIndex;
                }
                newState.selectedConversation = newState.conversations[selectedConversationIndex];
            } else {
                newState.selectedConversation = null;
            }

            return newState;
        }
        
        return state;
      }
      case 'NEW_MESSAGE_ADDED': {
          if (state.selectedConversation) {
            const newState = { ...state };
            newState.selectedConversation = { ...newState.selectedConversation };
            newState.selectedConversation.messages.unshift( action.payload);
            return newState;
          }
          else{
            const newState = { ...state };
            newState.selectedConversation = { messages:[] };
            newState.selectedConversation.messages.unshift( action.payload);
            return newState;
          }

          return state;
      }
      default:
        return newState;
    }
  }
  
export default messageInfo;