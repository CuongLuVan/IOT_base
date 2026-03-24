import React from 'react';


const ConversationSearch = ({ conversations }) => {
    return (
        <div class="search-container">
            { (conversations && conversations.length > 0) ?<input type="text" placeholder="Search" />:"" }
        </div>
    );
}

export default ConversationSearch;