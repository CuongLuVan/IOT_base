import PropTypes from 'prop-types';
import React, { Component } from 'react';
import SendIcon from './icons/SendIcon';
import FileIcon from './icons/FileIcon';
import EmojiIcon from './icons/EmojiIcon';
import PopupWindow from './popups/PopupWindow';
import EmojiPicker from './emoji-picker/EmojiPicker';
import UserInputEditor from './UserInputEditor';

class UserInput extends Component {

  constructor() {
    super();
    this.state = {
      inputActive: false,
      inputHasText: false,
      emojiPickerIsOpen: false,
      emojiFilter: ''
    };
  }

  componentDidMount() {
    this.emojiPickerButton = document.querySelector('#sc-emoji-picker-button'); 
  }

  handleKeyDown(event) {
    if (event.keyCode === 13 && !event.shiftKey) {
      return this._submitText(event);
    }
  }

  handleKeyUp(event) {
    const inputHasText = event.target.innerHTML.length !== 0 &&
      event.target.innerText !== '\n';
    this.setState({ inputHasText });
  }

  _showFilePicker() {
    this._fileUploadButton.click();
  }

  toggleEmojiPicker = (e) => {
    e.preventDefault();
    if (!this.state.emojiPickerIsOpen) {
      this.setState({ emojiPickerIsOpen: true });
    }
  }

  closeEmojiPicker = (e) => {
    if (this.emojiPickerButton.contains(e.target)) {
      e.stopPropagation();
      e.preventDefault();
    }
    this.setState({ emojiPickerIsOpen: false });
  }

  _submitText(event) {
    event.preventDefault();
    const text = this.userInput.textContent;
    /*var data= {
      author: {users_id: 1000, username: 'sample xx', avatar: 'https://i.pinimg.com/originals/eb/b0/2a/ebb02aedec9bc74f65e38311c7e14d34.png'},
      content:{comment_id:1634669318436227,post_id:1001,author_id:1001,author_IP:"192",reply_id:1001,content:text,
                  coment_tag:"@hahaha", comment_atack:"link",comment_parent_id:1634669318436225},
      time: 1634669318436,
      timeSend: "2021-10-19T18:48:38Z"
    };
    */
    if (text && text.length > 0) {
      this.props.onSubmit(text);
     // this.userInput.innerHTML = '';
    }
  }
  
  clearTextData(){
    this.userInput.innerHTML = '';
  }

  _onFilesSelected(event) {
    if (event.target.files && event.target.files.length > 0) {
      this.props.onFilesSelected(event.target.files);
    }
  }


  _handleEmojiPicked = (emoji) => {
    this.setState({ emojiPickerIsOpen: false });
    if(this.state.inputHasText) {
      this.userInput.innerHTML += emoji;
    } else {
      this.props.onSubmit({
        author: 'me',
        type: 'emoji',
        data: { emoji }
      });
    }
  }

  handleEmojiFilterChange = (event) => {
    const emojiFilter = event.target.value;
    this.setState({ emojiFilter });
  }

  _renderEmojiPopup = () => (
    <PopupWindow
      isOpen={this.state.emojiPickerIsOpen}
      onClickedOutside={this.closeEmojiPicker}
      onInputChange={this.handleEmojiFilterChange}
    >
      <EmojiPicker
        onEmojiPicked={this._handleEmojiPicked}
        filter={this.state.emojiFilter}
      />
    </PopupWindow>
  )

  _renderSendOrFileIcon() {
    if (this.state.inputHasText) {
      return (
        <div className="sc-user-input--button">
          <SendIcon onClick={this._submitText.bind(this)} />
        </div>
      );
    }
    return (
      <div className="sc-user-input--button">
        <FileIcon onClick={this._showFilePicker.bind(this)} />
        <input
          type="file"
          name="files[]"
          multiple
          ref={(e) => { this._fileUploadButton = e; }}
          onChange={this._onFilesSelected.bind(this)}
        />
      </div>
    );
  }

  render() {
    const { emojiPickerIsOpen, inputActive } = this.state;
    return (
      <form className={`sc-user-input ${(inputActive ? 'active' : '')}`}>
        <UserInputEditor 
              className="sc-user-input--text" 
              summitData={(text)=>{this.props.onSubmit(text)}} />
        {/*<div
          role="button"
          tabIndex="0"
          onFocus={() => { this.setState({ inputActive: true }); }}
          onBlur={() => { this.setState({ inputActive: false }); }}
          ref={(e) => { this.userInput = e; }}
          onKeyDown={this.handleKeyDown.bind(this)}
          onKeyUp={this.handleKeyUp.bind(this)}
          contentEditable="true"
          placeholder="Write a reply..."
          className="sc-user-input--text"
        >
        </div>
        */}
        <div className="sc-user-input--buttons">
          <div className="sc-user-input--button"></div>
          <div className="sc-user-input--button">
            {this.props.showEmoji && <EmojiIcon
              onClick={this.toggleEmojiPicker}
              isActive={emojiPickerIsOpen}
              tooltip={this._renderEmojiPopup()}
            />}
          </div>
          {this._renderSendOrFileIcon()}
        </div>
      </form>
    );
  }
}

UserInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
 // onChangeText: PropTypes.func.string,
  onFilesSelected: PropTypes.func.isRequired,
  showEmoji: PropTypes.bool
};

export default UserInput;
