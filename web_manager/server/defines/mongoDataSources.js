/**
 * Whitelist du lieu MongoDB duoc phep truy van tu API.
 *
 * Khong nhan database/collection/field truc tiep tu request. Muon them nguon
 * moi, them mot key `info` vao file nay va khai bao day du cac field hop le.
 */
module.exports = Object.freeze({
  sensor: Object.freeze({
    database: process.env.MONGODB_DB || 'iot',
    collection: 'sensor_data',
    timeFields: Object.freeze(['time_save']),
    valueFields: Object.freeze(['temp', 'humi']),
  }),

  // Vi du neu collection AQI su dung schema khac:
  // aqi: Object.freeze({
  //   database: process.env.MONGODB_DB || 'iot',
  //   collection: 'aqi_data',
  //   timeFields: Object.freeze(['created_at']),
  //   valueFields: Object.freeze(['pm25', 'co2']),
  // }),
});
