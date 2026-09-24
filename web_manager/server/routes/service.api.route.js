const express = require("express");
const knex = require("../config/knex");
const router = express.Router();
const k = require("knex");
const {
  addService,
  admin_getAllOrders,
  getAllService,
  generateOrder,
  admin_updateOrder,
} = require("../controllers/service.api.controller");
const isAuthenticatedCustomer = require('../middlewares/authenticateCustomer.js');

//TODO: ADD authorization middleware
router.post("/", addService); 
router.get("/available-service", isAuthenticatedCustomer, getAllService);
router.post("/generate-order", isAuthenticatedCustomer,  generateOrder);
router.get("/orders", isAuthenticatedCustomer, admin_getAllOrders);
router.put("/confirm-order/:id", isAuthenticatedCustomer, admin_updateOrder);

module.exports = router;
