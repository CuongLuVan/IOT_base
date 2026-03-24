import React, { Component } from 'react';
import TextMessage from './TextMessage';
import EmojiMessage from './EmojiMessage';
import FileMessage from './FileMessage';
import chatIconUrl from './../../assets/chat-icon.svg';
import ManagerData from '../../../../../actions/ManagerData.js'
import PropTypes from 'prop-types';

class Message extends Component {

  _renderMessageOfType(type='text') {
    switch(type) {
    case 'text':
      return <TextMessage {...this.props.message} />;
    case 'emoji':
      return <EmojiMessage {...this.props.message} />;
    case 'file':
      return <FileMessage {...this.props.message} />;
    default:
      console.error(`Attempting to load message with unsupported file type '${type}'`);
    }
  }

  render () {
    if((!!!this.props.message.content)||(!!!this.props.message.author)||(!!!this.props.message.author.avatar))  
    return (
      <div className="sc-message">

      </div>
    )

    let contentClassList = [
      'sc-message--content',
      (this.props.message.content.author_id === ManagerData.saveInfoUser.users_id ? 'sent' : 'received')
    ];
    return (
      <div className="sc-message">
        <div className={contentClassList.join(' ')}  onClick={this.props.onClick}>
          <div className="sc-message--avatar" style={{
            backgroundImage: `url(${this.props.message.author.avatar})`
          }}></div>
          {this._renderMessageOfType()}
        </div>
      </div>);
  }
}
Message.propTypes = {
  onClick: PropTypes.func.isRequired
};

export default Message;
