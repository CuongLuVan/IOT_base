
import React from 'react';

const ConversationList = ({ conversations, selectedConversation, onConversationItemSelected }) => {
    const conversationItems = conversations.map((conversation) => {
        const conversationIsActive = selectedConversation && conversation.id === selectedConversation.id;

        return (
            <div className={'conversation active:'+  conversationIsActive } 
                onClick={() => onConversationItemSelected(conversation.id)}>
                <img src={conversation.avatar} alt={conversation.imageAlt} />
                <div className="title-text">{conversation.name}</div>
                <div className="created-date">{conversation.createdAt}</div>
                <div className="conversation-message">
                    {conversation.latestMessageText}
                </div>
            </div>
        );

    });

    return (
        <div className="conversation-list lst-conversation">
            {conversationItems}
        </div>
    );
}

export default ConversationList;