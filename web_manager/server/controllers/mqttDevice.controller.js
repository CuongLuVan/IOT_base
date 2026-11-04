const knex = require('../config/knex.js');
const WarningInfo = require("../config/warningInfo.js");
const {returnFalse, returnOKCustom} = require('../utils/returnResponse.js');
const deviceStatus = require('../services/mqtt/deviceStatusService.js');

// Devices added from the Wi-Fi setup page (View/mqtt/device-wifi.ejs).
// One active mqtt_microservice row per (account, mqtt_pub, mqtt_sub);
// mqtt_user holds the account, so an account can own several devices.
const TABLE = "mqtt_microservice";
const MAX_FIELD_LENGTH = 40;

var mqttDeviceCtrl = {};

// Admin and customer ids come from different tables, so the token type is
// part of the key ("admin_3" and "customer_3" are different accounts).
function getAccountKey(req) {
    return req.auth.type + "_" + req.currentUser.users_id;
}

function readField(body, field, required) {
    const value = body[field] == null ? "" : String(body[field]).trim();
    if (required && !value) {
        throw new Error(field + " is required.");
    }
    if (value.length > MAX_FIELD_LENGTH) {
        throw new Error(field + " must be " + MAX_FIELD_LENGTH + " characters or fewer.");
    }
    return value;
}

function readDeviceInfo(body) {
    const device = {
        mqtt_id: readField(body, "mqtt_id", true),
        mqtt_pub: readField(body, "mqtt_pub", true),
        mqtt_sub: readField(body, "mqtt_sub", true),
        mqtt_pass: readField(body, "mqtt_pass", false),
        content: readField(body, "content", false),
    };
    if (!/^[A-Za-z0-9_.-]+$/.test(device.mqtt_id)) {
        throw new Error("mqtt_id must contain only letters, numbers, dots, underscores, or hyphens.");
    }
    if (/[+#]/.test(device.mqtt_pub)) {
        throw new Error("mqtt_pub must not contain + or #.");
    }
    return device;
}

function returnBadRequest(res, message) {
    return res.status(400).json({error: message, error_code: WarningInfo.ERROR_SERVER});
}

// Creates the device row or, when the account already has one with the same
// mqtt_pub/mqtt_sub, updates it. The previous version is kept as a deleted
// row pointing to it through oldid, like CommonModel updates.
mqttDeviceCtrl.registerDevice = async function(req, res) {
    let device;
    try {
        device = readDeviceInfo(req.body || {});
    } catch (error) {
        return returnBadRequest(res, error.message);
    }
    const owner = getAccountKey(req);
    const userId = req.currentUser.users_id;
    try {
        const result = await knex.transaction(async function(trx) {
            const existing = await trx(TABLE)
                .where({mqtt_user: owner, mqtt_pub: device.mqtt_pub, mqtt_sub: device.mqtt_sub, deleteflag: 0})
                .forUpdate()
                .first();
            const now = knex.fn.now();
            if (existing) {
                const history = Object.assign({}, existing, {
                    deleteflag: 1,
                    oldid: existing.mqtt_microservice_id,
                });
                delete history.mqtt_microservice_id;
                await trx(TABLE).insert(history);
                await trx(TABLE).where({mqtt_microservice_id: existing.mqtt_microservice_id}).update({
                    content: device.content || existing.content || device.mqtt_id,
                    mqtt_id: device.mqtt_id,
                    mqtt_pass: device.mqtt_pass,
                    updated_at: now,
                    id_updated: userId,
                });
                return {action: "updated", mqtt_microservice_id: existing.mqtt_microservice_id};
            }
            const inserted = await trx(TABLE).insert({
                content: device.content || device.mqtt_id,
                mqtt_pub: device.mqtt_pub,
                mqtt_sub: device.mqtt_sub,
                mqtt_user: owner,
                mqtt_pass: device.mqtt_pass,
                mqtt_id: device.mqtt_id,
                created_at: now,
                updated_at: now,
                id_created: userId,
                id_updated: userId,
                deleteflag: 0,
            });
            return {action: "created", mqtt_microservice_id: inserted[0]};
        });
        returnOKCustom(res, Object.assign(result, {
            mqtt_id: device.mqtt_id,
            mqtt_pub: device.mqtt_pub,
            mqtt_sub: device.mqtt_sub,
        }));
    } catch (error) {
        console.error("Failed to register MQTT device:", error.message);
        returnFalse(res, "Unable to register MQTT device.", WarningInfo.ERROR_SERVER);
    }
}

mqttDeviceCtrl.listDevices = async function(req, res) {
    try {
        const devices = await knex(TABLE)
            .select("mqtt_microservice_id", "content", "mqtt_id", "mqtt_pub", "mqtt_sub", "updated_at")
            .where({mqtt_user: getAccountKey(req), deleteflag: 0})
            .orderBy("updated_at", "desc");
        returnOKCustom(res, {devices});
    } catch (error) {
        console.error("Failed to list MQTT devices:", error.message);
        returnFalse(res, "Unable to list MQTT devices.", WarningInfo.ERROR_SERVER);
    }
}

// Soft delete: the row stays with deleteflag = 1.
mqttDeviceCtrl.deleteDevice = async function(req, res) {
    const id = Number((req.body || {}).mqtt_microservice_id);
    if (!Number.isInteger(id) || id <= 0) {
        return returnBadRequest(res, "mqtt_microservice_id is required.");
    }
    try {
        const updated = await knex(TABLE)
            .where({mqtt_microservice_id: id, mqtt_user: getAccountKey(req), deleteflag: 0})
            .update({
                deleteflag: 1,
                oldid: id,
                updated_at: knex.fn.now(),
                id_updated: req.currentUser.users_id,
            });
        if (!updated) {
            return res.status(404).json({error: "Device not found.", error_code: WarningInfo.ERROR_SERVER});
        }
        returnOKCustom(res, {mqtt_microservice_id: id, deleted: true});
    } catch (error) {
        console.error("Failed to delete MQTT device:", error.message);
        returnFalse(res, "Unable to delete MQTT device.", WarningInfo.ERROR_SERVER);
    }
}

function findOwnDevice(req, id) {
    return knex(TABLE)
        .select("mqtt_microservice_id", "content", "mqtt_id", "mqtt_pub", "mqtt_sub", "updated_at")
        .where({mqtt_microservice_id: id, mqtt_user: getAccountKey(req), deleteflag: 0})
        .first();
}

// Devices of the account with the last state each one published. Also asks
// every device for a fresh state (rate limited in deviceStatusService).
mqttDeviceCtrl.deviceStatus = async function(req, res) {
    try {
        const devices = await knex(TABLE)
            .select("mqtt_microservice_id", "content", "mqtt_id", "mqtt_pub", "mqtt_sub", "updated_at")
            .where({mqtt_user: getAccountKey(req), deleteflag: 0})
            .orderBy("updated_at", "desc");
        let mqttError = null;
        try {
            await deviceStatus.ensureConnected();
        } catch (error) {
            mqttError = error.message;
        }
        const result = await Promise.all(devices.map(async function(device) {
            let error = mqttError;
            if (!mqttError) {
                error = await deviceStatus.watch(device.mqtt_pub);
                deviceStatus.requestStatus(device.mqtt_sub, false);
            }
            return Object.assign({}, device, {status: deviceStatus.getStatus(device.mqtt_pub), error});
        }));
        returnOKCustom(res, {devices: result, mqttConnected: !mqttError, mqttError});
    } catch (error) {
        console.error("Failed to read MQTT device status:", error.message);
        returnFalse(res, "Unable to read MQTT device status.", WarningInfo.ERROR_SERVER);
    }
}

// value: bitmask of the outputs to switch on (bit 0 = channel 1, bit 1 = channel 2).
mqttDeviceCtrl.controlDevice = async function(req, res) {
    const body = req.body || {};
    const id = Number(body.mqtt_microservice_id);
    const value = Number(body.value);
    if (!Number.isInteger(id) || id <= 0) {
        return returnBadRequest(res, "mqtt_microservice_id is required.");
    }
    if (!Number.isInteger(value) || value < 0 || value > 3) {
        return returnBadRequest(res, "value must be an integer from 0 to 3.");
    }
    try {
        const device = await findOwnDevice(req, id);
        if (!device) {
            return res.status(404).json({error: "Device not found.", error_code: WarningInfo.ERROR_SERVER});
        }
        await deviceStatus.ensureConnected();
        await deviceStatus.watch(device.mqtt_pub);
        await deviceStatus.control(device.mqtt_sub, value);
        returnOKCustom(res, {mqtt_microservice_id: id, value, sent: true});
    } catch (error) {
        if (error.status === 400) {
            return returnBadRequest(res, error.message);
        }
        console.error("Failed to control MQTT device:", error.message);
        res.status(503).json({error: "MQTT: " + error.message, error_code: WarningInfo.ERROR_SERVER});
    }
}

module.exports = mqttDeviceCtrl;
