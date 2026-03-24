
import { configureStore } from '@reduxjs/toolkit';
import chatBoxData from '../reducers/chat-box-acess';

export default configureStore({
  reducer: {
    todos: chatBoxData,
  },
});

