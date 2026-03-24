import React, {useEffect ,useState} from 'react'
import { useDispatch,useSelector } from 'react-redux';
import * as actions from '../../actions/message-info';
import PropTypes from 'prop-types';
import DialogChat from './DialogChat.js';
import DialogComment from './DialogComment.js';

import ManagerData from '../../actions/ManagerData.js'
import {getListFindChat,getListUserChat,getInfoClientMqtt } from '../../api/httpBaseUtil'; 
import { initChat,initUserList ,addMessageToConverSation} from '../../reducers/chat-box-acess';

var mqtt    = require('mqtt');
var options = {
	protocol: 'mqtts',
	// clientId uniquely identifies client
	// choose any string you wish
	clientId: 'b0908853' 	
};
var client =null;

export default function FooterChat(){
 // https://github.com/kingofthestack/react-chat-window
  const [enableMqtt, setEnableMqtt] = useState(false);
  const dispatch = useDispatch();
  const inChatbox = useSelector(state => state.chatBoxData.inChatbox);

  if(client!=null){
    client.on('message', function (topic, message) {
        var note = message.toString();
        // Updates React state with message 
        console.log("topic",topic,note);
        dispatch(addMessageToConverSation(JSON.parse(note)));

    });
  }

  useEffect(() => {
        let isMounted = true; 
        ManagerData.getInfoUser();
        getListFindChat({}).then(result=>{ dispatch(initChat(result.data));   });
        getListUserChat().then(result=>{ dispatch(initUserList(result));  });
        getInfoClientMqtt().then(result=>{ 
            console.log("Connect mqtt ManagerData.result:", result);
            ManagerData.mqtt.isloaded = true;
            ManagerData.mqtt.port = result.data.port;
            ManagerData.mqtt.password = result.data.password;
            ManagerData.mqtt.username = result.data.username;
            ManagerData.mqtt.server = result.data.server;
            ManagerData.mqtt.topic_sub = '#',// '/chat/1';

            ManagerData.mqtt.config={
                port:ManagerData.mqtt.port,
                clientId : 'message_' + Math.random().toString(16).substr(2, 8),
                username : ManagerData.mqtt.username,
                useNewUrlParser: true,
                password: ManagerData.mqtt.password
            };
            console.log("Connect mqtt ManagerData.mqtt:", ManagerData.mqtt);
 
            client = mqtt.connect(ManagerData.mqtt.server, ManagerData.mqtt.config);
            console.log("Connect mqtt ManagerData.config: to start");
            client.subscribe(ManagerData.mqtt.topic_sub);

            /*client.on('message', (topic, message, packet) => {
                console.log("message from topic", topic.toString());
                console.log(message.toString());

            });*/

        });
        return () => { isMounted = false };
  }, [dispatch]);


  return (<div> {inChatbox?"": 
                    <DialogChat />}
                <DialogComment/>
          </div> );

}

