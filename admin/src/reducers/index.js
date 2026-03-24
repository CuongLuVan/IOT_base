import { combineReducers } from 'redux';

import messageInfo from './message-info';
import messagesReducer from './messagesReducer';

export default combineReducers({
    messageInfo,
    messagesReducer
});