const express = require('express');
const router = express.Router();
const Chat = require('../app/models/Chat.model');
const VoteProduct = require('../app/models/VoteProduct.model');
const VotePage = require('../app/models/VotePage.model');
const NoificationData = require('../app/models/NoificationData.model');
const customerAuthenticated = require('../middlewares/authenticateCustomer');
const {returnOKCustom,returnNotFound} = require('../utils/returnResponse.js');

router.route('/login').get((req, res) => {
    returnOKCustom(res,{sample:false});
});

router.route('/content').post((req, res) => {
    Chat.find({topic:req.body.chatRoom })
      .then((chatRoom) => returnOKCustom(res,{chatRoom:chatRoom}))
      .catch((error) => returnNotFound(res,error));
});

router.route('/load_all').post((req, res) => {
  var typeChat= req.body.type+"/"+req.body.chatRoom;
  Chat.find({topic:typeChat}).limit(1000) //.skip(20)
    .then((chatRoom) => {
      returnOKCustom(res,{chatRoom:chatRoom});
    })
    .catch((error) => returnNotFound(res,error));
});

router.route('/page_statistical').post(async (req, res)  => {
    var numberPage = 0;
    let data=req.body;
    try{
        var dataReport = await  VotePage.findOne({link_pages:data.link_pages});
        if(dataReport) numberPage = dataReport.number_read;
        numberPage = numberPage+1;
        var votePage ={
          link_pages:data.link_pages,
          number_read: numberPage,
          value_vote: data.value_vote,
          id_read: data.id_read,
          note:data.note,
          time: (new Date()).getTime()/1000
        };
        var dataInsert = await  VotePage.insertMany(votePage);
        returnOKCustom(res,JSON.stringify({number_read:numberPage,info:dataInsert}));
    }
    catch( ie){
      returnNotFound(res,ie);
    }
});

router.route('/product_statistical').get(async (req, res)  => {
  try{
      var dataReport = await  VoteProduct.findOne({id_product:req.query.type});
      returnOKCustom(res,JSON.stringify(dataReport));
  }
  catch( ie){
    returnNotFound(res,ie);
  }
})
.post(async (req, res)  => {
  var numberPage = 0;
  var avarge_vote =0;
  let data=req.body;
  try{
      var dataReport = await  VoteProduct.findOne({link_pages:data.id_product});
      if(dataReport) {
        numberPage = dataReport.number_vote;
        avarge_vote = avarge_vote*numberPage + data.value_vote;
      } 

      numberPage = numberPage+1;
      avarge_vote = avarge_vote/numberPage;
      var votePage ={
        id_product: data.id_product,
        number_vote: numberPage,
        value_vote:data.value_vote,
        avarge_vote:avarge_vote,
        id_vote:data.id_vote,
        note:data.note,
        time: (new Date()).getTime()/1000
      };
      var dataInsert = await  VoteProduct.insertMany(votePage);
      returnOKCustom(res,JSON.stringify({number_read:numberPage,info:dataInsert}));
  }
  catch( ie){
    returnNotFound(res,ie);
  }
});

router.route('/noification').get(customerAuthenticated,async (req, res)  => {
  try{
    console.log("noification",req.currentUser,req.query);
    if(req.query.all){
      var dataReport = await  NoificationData.find({id_user:req.currentUser.users_id}).limit(50);
      returnOKCustom(res,JSON.stringify(dataReport));
    }
    else
    {
      var dataReport = await  NoificationData.find({id_user:req.currentUser.users_id,read:false});
      returnOKCustom(res,JSON.stringify(dataReport));
    } 
  }
  catch( ie){
    returnNotFound(res,ie);
  }
})
.post(customerAuthenticated,async (req, res)  => {
  let data=req.body;
  try{
      var votePage ={
        id_user: req.currentUser.users_id,
        title: data.title,
        content:data.content,
        read:false,
        type_noification:data.type_noification,
        time: (new Date()).getTime()/1000
      };
      var dataInsert = await  VoteProduct.insertMany(votePage);
      returnOKCustom(res,JSON.stringify(dataInsert));
  }
  catch( ie){
    returnNotFound(res,ie);
  }
});

router.route('/read_noification').get(customerAuthenticated,async (req, res)  => {
  try{
      var dataReport = await  NoificationData.findOneAndUpdate({id_user:req.currentUser.users_id},{read:true});
      returnOKCustom(res,JSON.stringify(dataReport));
  }
  catch( ie){
    returnNotFound(res,ie);
  }
});



module.exports = router;