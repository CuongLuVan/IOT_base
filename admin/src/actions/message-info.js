
export const conversationChanged = payload =>({ type: 'SELECTED_CONVERSATION_CHANGED',payload});
export const conversationsRequested = payload =>({ type: 'CONVERSATIONS_REQUESTED',payload});
export const conversationDeleted = payload =>({ type: 'DELETE_CONVERSATION',payload});
export const newMessageAdded = payload =>({ type: 'NEW_MESSAGE_ADDED',  payload});
export const messagesRequested = payload =>({ type: 'MESSAGES_REQUESTED',payload});
export const messagesLoaded = payload =>({ type: 'MESSAGES_LOADED',payload});

