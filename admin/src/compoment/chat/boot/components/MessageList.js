import React, { Component } from 'react';
import Message from './Messages';
import PropTypes from 'prop-types';

class MessageList extends Component {

  componentDidUpdate(_prevProps, _prevState) {
    this.scrollList.scrollTop = this.scrollList.scrollHeight;
  }

  render () {
    return (
      <div className="sc-message-list" ref={el => this.scrollList = el}>
        {this.props.messages.map((message, i) => {
          return <Message message={message} key={i}  onClick ={()=> {
            console.log("Message message={message} key={i} ");
            if(!!this.props.replyMessage)
                this.props.replyMessage(message);
          }
          } />;
        })}
      </div>);
  }
}

MessageList.propTypes = {
  replyMessage: PropTypes.func.isRequired
};

export default MessageList;
