const express = require("express");
const chatRoutes = require("./chat.route.js");
const historyRoutes = require("./history.route.js");
const commentRoutes = require('./commentBlog.js');
const historyComment = require('./historyCommentBlog.js');
const cronRoutes = require('./cron.route.js')
const router = express.Router();

router.use("/chat", chatRoutes);
router.use("/history", historyRoutes);
router.use("/comment", commentRoutes);
router.use("/history_comment", historyComment);
router.use("/cron", cronRoutes);


module.exports = router;
