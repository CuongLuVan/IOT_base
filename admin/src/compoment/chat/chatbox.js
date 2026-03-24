//import FormChat from './FormChat';

//export default FormChat;

import React from 'react';
import ReactDOM from 'react-dom';
import './main/assets/index.css';
import App from './main/components/App';
import * as serviceWorker from './main/serviceWorker';
class FormChatBox extends React.Component {

    render() {
        return <App/>;
    }
}
  
export default FormChatBox;


//ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();