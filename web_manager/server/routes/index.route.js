const express = require("express");
const authRoutes = require("./auth.route.js");
const userRoutes = require("./user.route.js");
const enterpriseRoutes = require("./enterprise.route.js");
const groupRoutes = require("./group.route.js");
const customerRoutes = require("./customer.route.js");
const documentRoutes = require("./document.route.js");
const serviceRoutes = require("./service.api.route.js");
const socialRoutes = require("./social.route.js");

const router = express.Router();


// mount auth routes at /auth
router.use("/auth", authRoutes);
router.use("/document", documentRoutes);
// mount user routes at /users
router.use("/users", userRoutes);
// mount enterprise routes at /enterprises
router.use("/enterprises", enterpriseRoutes);
// mount group routes at /groups
router.use("/groups", groupRoutes);
// mount customer routes at /customers
router.use("/customers", customerRoutes);
router.use("/service", serviceRoutes);
router.use("/social", socialRoutes);



  


module.exports = router;
