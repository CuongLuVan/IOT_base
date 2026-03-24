import React, {useEffect} from 'react';
import './ListChatItem.css';

export default function ListChatItem(props) {

    const {users_id, avatar, username} = props.data;
    return (
      <div className="sc-listchat-item" onClick ={()=>{props.selectChat(users_id);}}>
        <img className="sc-listchat-item-photo" src={avatar} alt="conversation" />
          <p className="sc-listchat-item-title">{ username.slice(0, 5) +".." }</p>
      </div>
    );
}