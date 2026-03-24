
const knex = require('../../config/knex.js');
var squel = require("squel");
var nodemailer = require('nodemailer');
const axios = require('axios');
const login = require("facebook-chat-api");

require('dotenv').config();

var MesageBox={};

var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        secure: false, // use SSL
                        port: 25, // port for secure SMTP
                        tls: {
                            rejectUnauthorized: false
                        },
                        auth: {
                                user:   process.env.MAIL_CLIENT_INFO,
                                pass:   process.env.MAIL_PASS_INFO
                        }
                    });
 
function sendDataToEmail(adress,title,content){
    var mailOptions = {
        from: process.env.MAIL_CLIENT_INFO,
        to: adress,
        subject: title,
        text: content
    };
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                reject(error)
            } else {
              resolve(info.response);
            }
        });
    });
    

}


//https://developers.zalo.me/docs/api/official-account-api/gui-tin-va-thong-bao-qua-oa/gui-thong-bao-van-ban-post-5072
function sendDataToZalo(adress,content){
    var mailOptions = {
        recipient:{ user_id: adress} ,
        message: {text: content}
    };
    return new Promise((resolve, reject) => {
        axios.post('https://openapi.zalo.me/v2.0/oa/message',mailOptions,
            { headers: { access_token: process.env.KEY_ZALO_TOCKEN} } )
        .then(function (response) {
            resolve(response);
        })
        .catch(function (error) {
            reject(error);
        });
    });
    
}


function sendMessageFaceBook(recipient, text) {
    login({email: process.env.FACE_BOOK_ACAO, password: process.env.FACE_BOOK_PASSS }, (err, api) => {
        if(err) return console.error(err);
        api.listen((err, message) => {
            api.sendMessage(text,recipient);
        });
    });
}

const DATA_TYPE_SOCIAL = {
    GMAIL:1,
    ZALO:2,
    FACEBOOK:3,
};


MesageBox.sendTheWarningThebill = async function (idUser,title,content) {

    var authen = squel.select().from('social_user')
                            .where("id_user="+idUser)
                            .where("deleteflag=0");
    var result= await knex.raw(authen.toString());
    if ((result==null)||(result.length==0)) {
            return false;
    }
    var dataInfo = null;
    for(var i=0;i<result[0].length;i++){
        if(result[0][i].social_type_id==DATA_TYPE_SOCIAL.GMAIL){
            dataInfo = await sendDataToEmail(result[0][i].id_adress,title,content);
        } else if(result[0][i].social_type_id==DATA_TYPE_SOCIAL.ZALO){
            dataInfo = await sendDataToZalo(result[0][i].id_adress,content);
        } else if(result[0][i].social_type_id==DATA_TYPE_SOCIAL.FACEBOOK){
            dataInfo = await sendMessageFaceBook(result[0][i].id_adress,content);
        }
   }
   if(dataInfo==null) return false;
   return true;
}



module.exports = MesageBox;
