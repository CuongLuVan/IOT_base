const express = require('express');
const router = express.Router();
// no model
const CommentBlog = require('../app/models/CommentBlog.model')
const {returnOKCustom,returnNotFound} = require('../utils/returnResponse.js');


router.route('/login').get((req, res) => {
  returnOKCustom(res,{sample:false});
});

router.route('/content').post((req, res) => {
    CommentBlog.find({topic:req.body.chatRoom })
      .then((chatRoom) => {
        returnOKCustom(res,{chatRoom:chatRoom});
      })
      .catch((error) => returnNotFound(res,error));
});

router.route('/load_all').post((req, res) => {
  var typeChat= req.body.type+"/"+req.body.chatRoom;
  CommentBlog.find({topic:typeChat}).limit(1000) //.skip(20)
    .then((chatRoom) => returnOKCustom(res,{chatRoom:chatRoom}))
    .catch((error) => {returnNotFound(res,error);});
});



module.exports = router;