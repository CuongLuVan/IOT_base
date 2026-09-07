const TableManifest = require('../models/middlewareDatabase/TableManifest.js');
const { returnNotAuthen } = require('../utils/returnResponse.js');
const WarningInfo = require('../config/warningInfo.js');

/**
 * Autorisaatio-middleware MQTT-hallintareiteille (/api/mqtt).
 *
 * Kutsutaan aina authenticate.js-middlewaren JÄLKEEN (req.currentUser täytyy olla asetettu).
 * Päästää läpi vain ylläpitotason käyttäjät (MASTER/MANAGER/SUPPORT/ACCOUNT/ADMIN)
 * ja estää tavalliset rekisteröityneet asiakkaat (NEW_REGISTER) ohjaamasta MQTT:tä,
 * koska MQTT pystyy ohjaamaan laitteita ja lukemaan kaikki viestit.
 *
 * Sallitut: permission_id < NEW_REGISTER (11)
 *   MASTER=1, MANAGER=2, SUPPORT=3, ACCOUNT=4, ADMIN=10
 */
module.exports = function authorizeMqtt(req, res, next) {
  if (!req.currentUser) {
    return returnNotAuthen(
      res,
      { error: 'Không truy cáp /api/mqtt - chưa xác nhận tài uses' },
      WarningInfo.NOT_ACESS_DATABASE
    );
  }

  const permissionId = req.currentUser.permission_id;

  // Ylläpitotaso: permission_id 1..10 (alle NEW_REGISTER). Muut eivät saa ohjata MQTT:tä.
  if (!permissionId || permissionId < TableManifest.MASTER || permissionId >= TableManifest.NEW_REGISTER) {
    return returnNotAuthen(
      res,
      { error: 'Không truy cáp /api/mqtt - tài uses nemá quyen' },
      WarningInfo.NOT_ACESS_DATABASE
    );
  }

  req.currentUser.isMqttAuthorized = true;
  next();
};