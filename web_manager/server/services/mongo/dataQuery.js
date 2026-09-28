const dataSources = require('../../defines/mongoDataSources.js');

const TYPES = Object.freeze({
  RAW: 1,
  SUM_DAY: 2,
  AVG_DAY: 3,
  SUM_MONTH: 4,
  AVG_MONTH: 5,
  SUM_YEAR: 6,
  AVG_YEAR: 7,
});

const TYPE_DEFINITIONS = Object.freeze({
  2: { unit: 'day', operation: '$sum', format: '%Y-%m-%d' },
  3: { unit: 'day', operation: '$avg', format: '%Y-%m-%d' },
  4: { unit: 'month', operation: '$sum', format: '%Y-%m' },
  5: { unit: 'month', operation: '$avg', format: '%Y-%m' },
  6: { unit: 'year', operation: '$sum', format: '%Y' },
  7: { unit: 'year', operation: '$avg', format: '%Y' },
});

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseDate(value, name) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw badRequest(`${name} must be a valid date`);
  return parsed;
}

function parseMax(value, exportType) {
  const max = Number(value);
  const limit = exportType === 3 ? 1000000 : 100000;
  if (!Number.isInteger(max) || max < 1 || max > limit) {
    throw badRequest(`max must be an integer from 1 to ${limit}`);
  }
  return max;
}

function validateRequest(body) {
  const payload = body || {};
  const source = dataSources[payload.info];
  if (!source) throw badRequest('info is not an enabled data source');
  if (!source.timeFields.includes(payload.type_time)) throw badRequest('type_time is not allowed for this info');

  const type = Number(payload.type);
  if (!Number.isInteger(type) || !Object.values(TYPES).includes(type)) {
    throw badRequest('type must be a number from 1 to 7');
  }
  if (type !== TYPES.RAW && !source.valueFields.includes(payload.data_check)) {
    throw badRequest('data_check is not allowed for this info');
  }
  if (type === TYPES.RAW && payload.data_check && !source.valueFields.includes(payload.data_check)) {
    throw badRequest('data_check is not allowed for this info');
  }

  const exportType = Number(payload.export);
  if (![1, 2, 3].includes(exportType)) throw badRequest('export must be 1, 2 or 3');
  const timeStart = parseDate(payload.time_start, 'time_start');
  const timeEnd = parseDate(payload.time_end, 'time_end');
  if (timeStart > timeEnd) throw badRequest('time_start must be before or equal to time_end');

  return {
    source,
    info: payload.info,
    timeField: payload.type_time,
    valueField: payload.data_check,
    type,
    exportType,
    max: parseMax(payload.max, exportType),
    timeStart,
    timeEnd,
    timezone: process.env.MONGODB_REPORT_TIMEZONE || 'Asia/Ho_Chi_Minh',
  };
}

function buildPipeline(query) {
  const match = { [query.timeField]: { $gte: query.timeStart, $lte: query.timeEnd } };
  if (query.type === TYPES.RAW) return [{ $match: match }, { $sort: { [query.timeField]: 1, _id: 1 } }, { $limit: query.max }];

  const definition = TYPE_DEFINITIONS[query.type];
  const numericValue = {
    $convert: { input: `$${query.valueField}`, to: 'double', onError: null, onNull: null },
  };
  return [
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: definition.format,
            date: `$${query.timeField}`,
            timezone: query.timezone,
          },
        },
        value: { [definition.operation]: numericValue },
        count: { $sum: { $cond: [{ $ne: [numericValue, null] }, 1, 0] } },
      },
    },
    { $project: { _id: 0, period: '$_id', value: 1, count: 1 } },
    { $sort: { period: 1 } },
    { $limit: query.max },
  ];
}

module.exports = { TYPES, validateRequest, buildPipeline };
