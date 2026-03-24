const CommentBlog = require('../app/models/CommentBlog.model')

module.exports = (req, res, next) => {
    console.log('abc', req.body);
    if(req.body.id_comment_reply==0) {
        req.parentId = 0;
        next();
    }
    else{
    let chatRoom = '/comment/' + req.body.post_id;
    CommentBlog.find({topic:chatRoom, comment_id: req.body.id_comment_reply}, (error, result) => {
        console.log('this is the comment parent', result);
        req.parentId = result[0].content.comment_parent_id;
        next();

    });
}
}