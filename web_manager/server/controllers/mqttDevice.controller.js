const knex = require('../config/knex.js');
const WarningInfo = require("../config/warningInfo.js");
const {returnFalse, returnOKCustom} = require('../utils/returnResponse.js');
const deviceStatus = require('../services/mqtt/deviceStatusService.js');
const deviceSchedule = require('../services/mqtt/deviceScheduleService.js');

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

// How commands reach a device: "auto" (MQTT, or LAN when the broker or the
// device's MQTT link is down), "mqtt" or "lan" (POST http://<ip>/lan).
const TRANSPORT_MODES = ["auto", "mqtt", "lan"];

function readTransport(value) {
    return TRANSPORT_MODES.includes(value) ? value : "auto";
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
        // {mqtt_microservice_id: "auto" | "mqtt" | "lan"} chosen on the page.
        const transports = (req.body && req.body.transports) || {};
        const result = await Promise.all(devices.map(async function(device) {
            const mode = readTransport(transports[device.mqtt_microservice_id]);
            const route = deviceStatus.route(device, mode);
            let error = null;
            if (route === "mqtt") {
                error = mqttError || await deviceStatus.watch(device.mqtt_pub);
            } else if (!mqttError) {
                // Keep listening on MQTT so "auto" notices when it works again.
                await deviceStatus.watch(device.mqtt_pub);
            }
            if (!error) {
                deviceStatus.requestStatus(device, false, route);
            }
            const lan = deviceStatus.getLan(device.mqtt_pub);
            if (route === "lan" && lan.error) {
                error = lan.error;
            }
            return Object.assign({}, device, {status: deviceStatus.getStatus(device.mqtt_pub), error, transport: mode, route, lan});
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
    const mode = readTransport(body.transport);
    let route = "mqtt";
    try {
        const device = await findOwnDevice(req, id);
        if (!device) {
            return res.status(404).json({error: "Device not found.", error_code: WarningInfo.ERROR_SERVER});
        }
        route = deviceStatus.route(device, mode);
        if (route === "mqtt") {
            await deviceStatus.ensureConnected();
            await deviceStatus.watch(device.mqtt_pub);
        }
        await deviceStatus.control(device, value, route);
        returnOKCustom(res, {mqtt_microservice_id: id, value, sent: true, route});
    } catch (error) {
        if (error.status === 400) {
            return returnBadRequest(res, error.message);
        }
        console.error("Failed to control device over " + route + ":", error.message);
        res.status(503).json({error: (route === "lan" ? "LAN: " : "MQTT: ") + error.message, error_code: WarningInfo.ERROR_SERVER});
    }
}

// ---------------------------------------------------------------------------
// Local schedules stored on the device (firmware docs/Schedule.md). The device
// is the only copy; every request is answered by the device itself.
// ---------------------------------------------------------------------------
const SCHEDULE_MAX_COUNT = 20;
// Page command name -> firmware "com" (docs/Schedule.md). ENABLE/DISABLE
// share com 11 with value 1/0.
const SCHEDULE_COMS = {
    SCHEDULE_ADD: 8,
    SCHEDULE_UPDATE: 9,
    SCHEDULE_DELETE: 10,
    SCHEDULE_ENABLE: 11,
    SCHEDULE_DISABLE: 11,
    SCHEDULE_CLEAR: 12,
};
const SCHEDULE_COMMANDS = Object.keys(SCHEDULE_COMS);
const COMMAND_ON_TIMER = 5;

function readInteger(body, field, min, max, fallback) {
    const raw = body[field];
    if ((raw == null || raw === "") && fallback !== undefined) {
        return fallback;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(field + " must be an integer from " + min + " to " + max + ".");
    }
    return value;
}

function isValidDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Builds the exact firmware command ({"com":8,"id":1,"ho":7,...}) from the
// page's fields; unknown fields are never forwarded.
function readScheduleCommand(body) {
    const cmd = String(body.cmd || "");
    if (!SCHEDULE_COMMANDS.includes(cmd)) {
        throw new Error("cmd must be one of " + SCHEDULE_COMMANDS.join(", ") + ".");
    }
    const com = SCHEDULE_COMS[cmd];
    if (cmd === "SCHEDULE_CLEAR") {
        return {com};
    }
    const command = {com, id: readInteger(body, "id", 1, SCHEDULE_MAX_COUNT)};
    if (cmd === "SCHEDULE_ENABLE" || cmd === "SCHEDULE_DISABLE") {
        command.value = cmd === "SCHEDULE_ENABLE" ? 1 : 0;
        return command;
    }
    if (cmd === "SCHEDULE_DELETE") {
        return command;
    }
    command.ho = readInteger(body, "hour", 0, 23);
    command.mi = readInteger(body, "minute", 0, 59);
    command.we = readInteger(body, "weekday", 0, 127);
    command.po = readInteger(body, "port_mask", 1, 255);
    command.pos = readInteger(body, "port_state", 0, 255) & command.po;
    command.au = readInteger(body, "auto_off", 0, 65535, 0);
    if (body.enabled === false) {
        command.en = 0;
    }
    if (command.we === 0) {
        command.ye = readInteger(body, "year", 2024, 2149);
        command.mo = readInteger(body, "month", 1, 12);
        command.da = readInteger(body, "day", 1, 31);
        if (!isValidDate(command.ye, command.mo, command.da)) {
            throw new Error("year/month/day is not a valid date.");
        }
    }
    return command;
}

// Returns the device (with .transport = the route to use), or null after
// answering the request with an error.
async function prepareScheduleDevice(req, res) {
    const id = Number((req.body || {}).mqtt_microservice_id);
    if (!Number.isInteger(id) || id <= 0) {
        returnBadRequest(res, "mqtt_microservice_id is required.");
        return null;
    }
    const device = await findOwnDevice(req, id);
    if (!device) {
        res.status(404).json({error: "Device not found.", error_code: WarningInfo.ERROR_SERVER});
        return null;
    }
    device.transport = deviceStatus.route(device, readTransport((req.body || {}).transport));
    if (device.transport === "lan") {
        return device;
    }
    await deviceStatus.ensureConnected();
    const watchError = await deviceStatus.watch(device.mqtt_pub);
    if (watchError) {
        res.status(503).json({error: "MQTT: " + watchError, error_code: WarningInfo.ERROR_SERVER});
        return null;
    }
    return device;
}

function returnScheduleError(res, error, action) {
    if (error.status === 400) {
        return returnBadRequest(res, error.message);
    }
    if (error.status === 504) {
        return res.status(504).json({error: error.message, error_code: WarningInfo.ERROR_SERVER});
    }
    console.error("Failed to " + action + ":", error.message);
    res.status(503).json({error: error.message, error_code: WarningInfo.ERROR_SERVER});
}

mqttDeviceCtrl.listSchedules = async function(req, res) {
    try {
        const device = await prepareScheduleDevice(req, res);
        if (!device) return;
        const result = await deviceSchedule.list(device, device.transport);
        returnOKCustom(res, Object.assign({mqtt_microservice_id: device.mqtt_microservice_id}, result));
    } catch (error) {
        returnScheduleError(res, error, "list device schedules");
    }
}

// The device's verdict (SUCCESS, CONFLICT, INVALID, ...) is returned as is.
mqttDeviceCtrl.sendScheduleCommand = async function(req, res) {
    let command;
    try {
        command = readScheduleCommand(req.body || {});
    } catch (error) {
        return returnBadRequest(res, error.message);
    }
    try {
        const device = await prepareScheduleDevice(req, res);
        if (!device) return;
        // The reply is the device's status report, so "set" is already updated.
        const ack = await deviceSchedule.send(device, command, device.transport);
        returnOKCustom(res, Object.assign({mqtt_microservice_id: device.mqtt_microservice_id, cmd: req.body.cmd, id: command.id || 0}, ack));
    } catch (error) {
        returnScheduleError(res, error, "send schedule command");
    }
}

// Auto OFF on-timer stored on the device, independent of schedules: a channel
// on for "sec" seconds is switched off. Without "sec" the value is only read.
const ON_TIMER_MAX_SECONDS = 86400;

mqttDeviceCtrl.onTimerCommand = async function(req, res) {
    const body = req.body || {};
    // {"com":5} reads, {"com":5,"value":sec} sets (0 = off).
    const command = {com: COMMAND_ON_TIMER};
    if (body.sec != null && body.sec !== "") {
        try {
            command.value = readInteger(body, "sec", 0, ON_TIMER_MAX_SECONDS);
        } catch (error) {
            return returnBadRequest(res, error.message);
        }
    }
    try {
        const device = await prepareScheduleDevice(req, res);
        if (!device) return;
        // The reply is the device's status report ("tim"), also kept by the status service.
        const ack = await deviceSchedule.onTimer(device, command, device.transport);
        returnOKCustom(res, Object.assign({mqtt_microservice_id: device.mqtt_microservice_id}, ack));
    } catch (error) {
        returnScheduleError(res, error, "send on-timer command");
    }
}

// Countdown auto ON, independent of schedules: the device switches the "mask"
// channels on once after "sec" seconds; sec 0 cancels, no "sec" only reads.
// Firmware command {"com":4,"value":sec,"mask":mask}; lost on device reboot.
const COMMAND_COUNTDOWN = 4;
const COUNTDOWN_MAX_SECONDS = 86400;

mqttDeviceCtrl.countdownCommand = async function(req, res) {
    const body = req.body || {};
    const command = {com: COMMAND_COUNTDOWN};
    try {
        if (body.sec != null && body.sec !== "") {
            command.value = readInteger(body, "sec", 0, COUNTDOWN_MAX_SECONDS);
            if (command.value > 0 && body.mask != null && body.mask !== "") {
                command.mask = readInteger(body, "mask", 1, 255);
            }
        }
    } catch (error) {
        return returnBadRequest(res, error.message);
    }
    try {
        const device = await prepareScheduleDevice(req, res);
        if (!device) return;
        const ack = await deviceSchedule.countdown(device, command, device.transport);
        returnOKCustom(res, Object.assign({mqtt_microservice_id: device.mqtt_microservice_id}, ack));
    } catch (error) {
        returnScheduleError(res, error, "send countdown command");
    }
}

// LAN address used for LAN control. Without "ip" (or ip "") the address the
// device reports in its status is used again.
mqttDeviceCtrl.setDeviceLan = async function(req, res) {
    const body = req.body || {};
    const id = Number(body.mqtt_microservice_id);
    if (!Number.isInteger(id) || id <= 0) {
        return returnBadRequest(res, "mqtt_microservice_id is required.");
    }
    try {
        const device = await findOwnDevice(req, id);
        if (!device) {
            return res.status(404).json({error: "Device not found.", error_code: WarningInfo.ERROR_SERVER});
        }
        deviceStatus.setLanIp(device.mqtt_pub, String(body.ip || "").trim());
        returnOKCustom(res, {mqtt_microservice_id: id, lan: deviceStatus.getLan(device.mqtt_pub)});
    } catch (error) {
        if (error.status === 400) {
            return returnBadRequest(res, error.message);
        }
        console.error("Failed to save device LAN address:", error.message);
        returnFalse(res, "Unable to save the device LAN address.", WarningInfo.ERROR_SERVER);
    }
}

module.exports = mqttDeviceCtrl;
