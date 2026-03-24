const HttpStatus = require("http-status-codes");
const joi = require("joi");
const knex = require("../config/knex");
const { BillStatus } = require("../utils/constants");
const ServiceBillModel = require("../models/database/serviceBill.model");
const { date } = require("joi");
const {returnOK,returnFalse,returnOKCustom,returnNotFound,returnInfoQuery } = require('../utils/returnResponse.js');

const ForTestingOnly = {
  id_created: 0,
  id_updated: 0,
  deleteflag: 0,
  oldid: 0,
};

const ServiceSchema = joi.object({
  name: joi.string().required(),
  content: joi.string().required(),
  cost: joi.string().required(),
  downloads: joi.number().required()
});

//<DATA FLOW: admin --creates--> service / plans <--- customers requesting service
exports.addService = function (req, res) {
  ServiceSchema.validate(req.body);
  const { name, content, cost, downloads } = req.body;
  knex
    .insert({
      name: name,
      cost: cost,
      content: content,
      downloads: +downloads,
      created_at: new Date(),
      updated_at: new Date(),
      ...ForTestingOnly,
    })
    .into("service")
    .then(() => { returnOKCustom(res,"")
    });
};

exports.getAllService = function (req, res) {
  knex("service")
    .select("*")
    .then((rows) => returnOKCustom(res,rows));
};

exports.generateOrder = function (req, res) {
  const { serviceId, customerId } = req.body;
  if (!serviceId || !customerId)
    return res
      .status(HttpStatus.BAD_REQUEST)
      .json({ message: "ServiceId & CustomerId is required" });

  knex
    .insert({
      customer_id: customerId,
      service_id: serviceId,
      created_at: new Date(),
      updated_at: new Date(),
      ...ForTestingOnly,
    })
    .into("service_bill")
    .then(() => returnOKCustom(res,""));

  //TODO: push notifs to admin?
};

exports.admin_getAllOrders = function (req, res) {
  knex("service_bill")
    .select("*")
    .then((rows) =>  returnOKCustom(res,rows));
};

exports.admin_updateOrder = async function (req, res) {
  const bill_service_id = +req.params.id;
  const { status, content, value, bank } = req.body;
  const bill = (
    await knex("service_bill")
      .select("*")
      .where("bill_service_id", +bill_service_id)
      .limit(1)
  )[0];
  if (!bill) return returnNotFound(res,""); 
  //UPDATE ROW AS A WHOLE
  await knex("service_bill").where("bill_service_id", bill_service_id).update({
    content: content,
    value: value,
    bank: bank,
    status: status,
    updated_at: new Date(),
  });
  if (status === BillStatus.Charged && !bill.auto_activated) {
    const service = (await knex("service").where("service_id", bill.service_id).limit(1))[0];
    await knex("customer")
      .where("customer_id", +bill.customer_id)
      .update({
        service_downloads: knex.raw("service_downloads + ??", [service.downloads]),
        updated_at: new Date(),
      });
    await knex("service_bill").where("bill_service_id", bill_service_id).update({
      auto_activated: true,
    });

    return returnOKCustom(res,{
      message: "Automatically extended customer's number of downloads",
    });
    //TODO: push notifications to customers && auto mail of statuses
  }
  return returnOKCustom(res,"");
};

//TODO: integrate with thirdparty payment gateway sandbox?
