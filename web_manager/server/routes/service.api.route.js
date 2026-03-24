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

//TODO: ADD authorization middleware
router.post("/", addService); 
router.get("/available-service", getAllService);
router.post("/generate-order", generateOrder);
router.get("/orders", admin_getAllOrders);
router.put("/confirm-order/:id", admin_updateOrder);

module.exports = router;
