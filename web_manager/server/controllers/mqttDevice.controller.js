const knex = require('../config/knex.js');
const WarningInfo = require("../config/warningInfo.js");
const {returnFalse, returnOKCustom} = require('../utils/returnResponse.js');
const deviceStatus = require('../services/mqtt/deviceStatusService.js');
const deviceSchedule = require('../services/mqtt/deviceScheduleService.js');
const { writeAudit } = require('../services/roomIotAudit.js');
const roomController = require('./room.controller.js');

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

async function authorizeRoomOperator(req, mqttMicroserviceId) {
    const linked = await knex('devices').where({mqtt_microservice_id: mqttMicroserviceId, status: 'ACTIVE', deleteflag: 0}).first('room_id');
    if (!linked) return true;
    const permission = await roomController.canOperateRoom(req, linked.room_id);
    return permission.allowed;
}

async function authorizeRoomManager(req, mqttMicroserviceId) {
    const linked = await knex('devices').where({mqtt_microservice_id: mqttMicroserviceId, status: 'ACTIVE', deleteflag: 0}).first('room_id');
    if (!linked) return true;
    const permission = await roomController.canManageRoom(req, linked.room_id);
    return permission.allowed;
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
            // Device history is stored per topic only (MongoDB), so one
            // mqtt_pub must belong to a single account across the system.
            const taken = await trx(TABLE)
                .where({mqtt_pub: device.mqtt_pub, deleteflag: 0})
                .whereNot({mqtt_user: owner})
                .forUpdate()
                .first();
            if (taken) {
                return {conflict: true};
            }
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
        if (result.conflict) {
            return res.status(409).json({error: "mqtt_pub is already used by another device.", error_code: WarningInfo.ERROR_SERVER});
        }
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
        if (!(await authorizeRoomManager(req, id))) return res.status(403).json({error: 'Room manager role required.'});
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

// mqtt_pass is the device password sent as "pa" with every command.
function findOwnDevice(req, id) {
    return knex(TABLE)
        .select("mqtt_microservice_id", "content", "mqtt_id", "mqtt_pub", "mqtt_sub", "mqtt_pass", "updated_at")
        .where({mqtt_microservice_id: id, mqtt_user: getAccountKey(req), deleteflag: 0})
        .first();
}

// Devices of the account with the last state each one published. Also asks
// every device for a fresh state (rate limited in deviceStatusService).
mqttDeviceCtrl.deviceStatus = async function(req, res) {
    try {
        // mqtt_pass goes to the owner's page too: LAN commands are sent from
        // the browser and need it as "pa".
        const devices = await knex(TABLE)
            .select("mqtt_microservice_id", "content", "mqtt_id", "mqtt_pub", "mqtt_sub", "mqtt_pass", "updated_at")
            .where({mqtt_user: getAccountKey(req), deleteflag: 0})
            .orderBy("updated_at", "desc");
        let mqttError = null;
        try {
            await deviceStatus.ensureConnected();
        } catch (error) {
            mqttError = error.message;
        }
        // LAN control does not go through here: the page sends it straight to
        // the device IP (status.ip) from the user's browser.
        const result = await Promise.all(devices.map(async function(device) {
            let error = mqttError;
            if (!mqttError) {
                error = await deviceStatus.watch(device.mqtt_pub) || deviceStatus.getPasswordError(device.mqtt_pub);
                deviceStatus.requestStatus(device, false);
            }
            const linked = await knex('devices').where({mqtt_microservice_id: device.mqtt_microservice_id, status: 'ACTIVE', deleteflag: 0}).first('device_id');
            const alerts = linked ? await knex('alerts').where({device_id: linked.device_id, deleteflag: 0})
                .whereIn('status', ['OPEN', 'ACKNOWLEDGED']).orderBy('triggered_at', 'desc')
                .limit(5).select('alert_id', 'alert_type', 'severity', 'status', 'message', 'triggered_at') : [];
            return Object.assign({}, device, {status: deviceStatus.getStatus(device.mqtt_pub), error, alerts});
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
    let commandId = null;
    let roomDeviceId = null;
    try {
        const device = await findOwnDevice(req, id);
        if (!device) {
            return res.status(404).json({error: "Device not found.", error_code: WarningInfo.ERROR_SERVER});
        }
        const assignedRoomDevice = await knex('devices').where({mqtt_microservice_id: id, deleteflag: 0, status: 'ACTIVE'}).first();
        if (assignedRoomDevice) {
            const access = await roomController.canOperateRoom(req, assignedRoomDevice.room_id);
            if (!access.allowed) return res.status(403).json({error: 'Room operator role required.'});
            const capabilities = await knex('actuators').where({device_id: assignedRoomDevice.device_id, deleteflag: 0, status: 'ACTIVE'}).select('channel_number');
            const supportedMask = capabilities.reduce((mask, actuator) => {
                const channel = Number(actuator.channel_number);
                return Number.isInteger(channel) && channel >= 1 && channel <= 2 ? mask | (1 << (channel - 1)) : mask;
            }, 0);
            if (!capabilities.length || supportedMask !== 3 || (value & ~supportedMask) !== 0) {
                return res.status(403).json({error: 'Command exceeds the active actuator capabilities registered for this device.'});
            }
        }
        try {
            const roomDevice = await knex('devices').where({mqtt_microservice_id: id, deleteflag: 0, status: 'ACTIVE'}).first();
            if (roomDevice) {
                roomDeviceId = roomDevice.device_id;
                const inserted = await knex('device_commands').insert({
                    device_id: roomDevice.device_id,
                    command_type: 'OUTPUT_SET',
                    payload: JSON.stringify({value}),
                    status: 'PENDING',
                    issued_at: knex.fn.now(),
                    requested_by: req.currentUser.users_id,
                    requested_by_type: req.auth.type,
                    created_at: knex.fn.now(),
                    id_created: req.currentUser.users_id,
                    created_by: req.currentUser.users_id,
                    created_by_type: req.auth.type,
                    deleteflag: 0,
                    oldid: null,
                });
                commandId = inserted[0];
            }
        } catch (historyError) {
            console.warn('Unable to create room device command history:', historyError.message);
        }
        await deviceStatus.ensureConnected();
        await deviceStatus.watch(device.mqtt_pub);
        await deviceStatus.control(device, value);
        if (commandId) {
            await knex('device_commands').where({command_id: commandId}).update({
                status: 'SENT', result: JSON.stringify({sent: true}), updated_at: knex.fn.now(), id_updated: req.currentUser.users_id,
            }).catch((historyError) => console.warn('Unable to update command history:', historyError.message));
            await writeAudit(req, 'COMMAND_SENT', 'device_command', commandId, null, {device_id: roomDeviceId, value})
                .catch((historyError) => console.warn('Unable to write command audit:', historyError.message));
        }
        returnOKCustom(res, {mqtt_microservice_id: id, value, sent: true, command_id: commandId});
    } catch (error) {
        if (commandId) {
            await knex('device_commands').where({command_id: commandId}).update({
                status: 'FAILED', result: JSON.stringify({error: error.message}), completed_at: knex.fn.now(),
                updated_at: knex.fn.now(), id_updated: req.currentUser.users_id,
            }).catch((historyError) => console.warn('Unable to update failed command history:', historyError.message));
        }
        if (error.status === 400) {
            return returnBadRequest(res, error.message);
        }
        console.error("Failed to control MQTT device:", error.message);
        res.status(503).json({error: "MQTT: " + error.message, error_code: WarningInfo.ERROR_SERVER});
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

// Returns the device, or null after answering the request with an error.
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
    if (error.status === 504 || error.status === 403) {
        return res.status(error.status).json({error: error.message, error_code: WarningInfo.ERROR_SERVER});
    }
    console.error("Failed to " + action + ":", error.message);
    res.status(503).json({error: "MQTT: " + error.message, error_code: WarningInfo.ERROR_SERVER});
}

mqttDeviceCtrl.listSchedules = async function(req, res) {
    try {
        const device = await prepareScheduleDevice(req, res);
        if (!device) return;
        const result = await deviceSchedule.list(device);
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
        if (!(await authorizeRoomOperator(req, device.mqtt_microservice_id))) return res.status(403).json({error: 'Room operator role required.'});
        // The reply is the device's status report, so "set" is already updated.
        const ack = await deviceSchedule.send(device, command);
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
        if (command.value != null && !(await authorizeRoomOperator(req, device.mqtt_microservice_id))) return res.status(403).json({error: 'Room operator role required.'});
        // The reply is the device's status report ("tim"), also kept by the status service.
        const ack = await deviceSchedule.onTimer(device, command);
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
        if (command.value != null && !(await authorizeRoomOperator(req, device.mqtt_microservice_id))) return res.status(403).json({error: 'Room operator role required.'});
        const ack = await deviceSchedule.countdown(device, command);
        returnOKCustom(res, Object.assign({mqtt_microservice_id: device.mqtt_microservice_id}, ack));
    } catch (error) {
        returnScheduleError(res, error, "send countdown command");
    }
}

// Sensor threshold control (firmware ThresholdControl.h): rule "id" 1..2,
// "value" = the 4 bytes packed by the page (0 deletes). Without "value" the
// rules are only read.
const COMMAND_THRESHOLD = 14;
const THRESHOLD_RULE_COUNT = 2;
const THRESHOLD_MAX_VALUE = 0x7FFFFFFF;

mqttDeviceCtrl.thresholdCommand = async function(req, res) {
    const body = req.body || {};
    const command = {com: COMMAND_THRESHOLD};
    try {
        if (body.value != null && body.value !== "") {
            command.id = readInteger(body, "id", 1, THRESHOLD_RULE_COUNT);
            command.value = readInteger(body, "value", 0, THRESHOLD_MAX_VALUE);
        }
    } catch (error) {
        return returnBadRequest(res, error.message);
    }
    try {
        const device = await prepareScheduleDevice(req, res);
        if (!device) return;
        if (command.value != null && !(await authorizeRoomOperator(req, device.mqtt_microservice_id))) return res.status(403).json({error: 'Room operator role required.'});
        const ack = await deviceSchedule.threshold(device, command);
        returnOKCustom(res, Object.assign({mqtt_microservice_id: device.mqtt_microservice_id}, ack));
    } catch (error) {
        returnScheduleError(res, error, "send threshold command");
    }
}

module.exports = mqttDeviceCtrl;
