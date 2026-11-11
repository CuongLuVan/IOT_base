import { API_URL } from '../config/config';
import { httpDeleteData, httpGetData, httpPostData, httpPutData } from './httpBaseUtil';

const api = (path) => API_URL + path;
const normalize = (row, key) => Object.assign({}, row, { id: row.id || row[key] });

export const listBuildings = () => httpGetData(api('locations/buildings')).then((response) => (response.data.result || []).map((x) => normalize(x, 'building_id')));
export const createBuilding = (data) => httpPostData(api('locations/buildings'), data);
export const listFloors = (buildingId) => httpGetData(api('locations/floors') + (buildingId ? '?building_id=' + encodeURIComponent(buildingId) : '')).then((response) => (response.data.result || []).map((x) => normalize(x, 'floor_id')));
export const createFloor = (data) => httpPostData(api('locations/floors'), data);
export const listRooms = (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach((key) => { if (filters[key]) params.set(key, filters[key]); });
  const query = params.toString();
  return httpGetData(api('rooms') + (query ? '?' + query : '')).then((response) => (response.data.result || []).map((x) => normalize(x, 'room_id')));
};
export const getRoomSummary = (roomId) => httpGetData(api('rooms/' + roomId + '/summary')).then((response) => response.data.result);
export const createRoom = (data) => httpPostData(api('rooms'), data);
export const updateRoom = (roomId, data) => httpPutData(api('rooms/' + roomId), data);
export const deactivateRoom = (roomId) => httpDeleteData(api('rooms/' + roomId));
export const assignDevice = (roomId, mqtt_microservice_id) => httpPostData(api('rooms/' + roomId + '/devices'), { mqtt_microservice_id });
export const unassignDevice = (roomId, deviceId) => httpDeleteData(api('rooms/' + roomId + '/devices/' + deviceId));
export const assignRoomMember = (roomId, data) => httpPostData(api('rooms/' + roomId + '/members'), data);
export const removeRoomMember = (roomId, permissionId) => httpDeleteData(api('rooms/' + roomId + '/members/' + permissionId));
export const listDeviceSensors = (deviceId) => httpGetData(api('iot/devices/' + deviceId + '/sensors')).then((r) => r.data.result || []);
export const updateRoomDevice = (deviceId, data) => httpPutData(api('iot/devices/' + deviceId), data);
export const createDeviceSensor = (deviceId, data) => httpPostData(api('iot/devices/' + deviceId + '/sensors'), data);
export const updateSensor = (sensorId, data) => httpPutData(api('iot/sensors/' + sensorId), data);
export const deleteSensor = (sensorId) => httpDeleteData(api('iot/sensors/' + sensorId));
export const listSensorReadings = (sensorId, filters = {}) => {
  const params = new URLSearchParams({ limit: '5000' });
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return httpGetData(api('iot/sensors/' + sensorId + '/readings?' + params.toString())).then((r) => r.data.result || []);
};
export const listDeviceActuators = (deviceId) => httpGetData(api('iot/devices/' + deviceId + '/actuators')).then((r) => r.data.result || []);
export const createDeviceActuator = (deviceId, data) => httpPostData(api('iot/devices/' + deviceId + '/actuators'), data);
export const updateActuator = (actuatorId, data) => httpPutData(api('iot/actuators/' + actuatorId), data);
export const deleteActuator = (actuatorId) => httpDeleteData(api('iot/actuators/' + actuatorId));
export const listRoomAlerts = (roomId) => httpGetData(api('iot/rooms/' + roomId + '/alerts')).then((r) => r.data.result || []);
export const acknowledgeAlert = (alertId, status = 'ACKNOWLEDGED', resolution) => httpPostData(api('iot/alerts/' + alertId + '/acknowledge'), { status, resolution });
export const listRoomWidgets = (roomId) => httpGetData(api('iot/rooms/' + roomId + '/dashboard-widgets')).then((r) => r.data.result || []);
export const getIoTOverview = (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach((key) => { if (filters[key] != null && filters[key] !== '') params.set(key, filters[key]); });
  return httpGetData(api('rooms/overview?' + params.toString())).then((r) => r.data.result);
};
export const createRoomWidget = (roomId, data) => httpPostData(api('iot/rooms/' + roomId + '/dashboard-widgets'), data);
export const updateRoomWidget = (roomId, widgetId, data) => httpPutData(api('iot/rooms/' + roomId + '/dashboard-widgets/' + widgetId), data);
export const deleteRoomWidget = (roomId, widgetId) => httpDeleteData(api('iot/rooms/' + roomId + '/dashboard-widgets/' + widgetId));
export const getRoomAnalytics = (roomId, filters) => {
  const params = new URLSearchParams();
  Object.keys(filters || {}).forEach((key) => { if (filters[key] != null && filters[key] !== '') params.set(key, filters[key]); });
  return httpGetData(api('iot/rooms/' + roomId + '/analytics?' + params.toString())).then((r) => r.data.result);
};
export const controlActuator = (deviceId, actuatorId, value) => httpPostData(api('iot/devices/' + deviceId + '/actuators/' + actuatorId + '/commands'), { value });
export const controlRoomActuators = (roomId, actuator_key, value) => httpPostData(api('iot/rooms/' + roomId + '/controls/actuator'), { actuator_key, value });
export const listDeviceCommands = (deviceId) => httpGetData(api('iot/devices/' + deviceId + '/commands')).then((r) => r.data.result || []);
export const listRoomAudit = (roomId) => httpGetData(api('iot/rooms/' + roomId + '/audit-logs')).then((r) => r.data.result || []);
