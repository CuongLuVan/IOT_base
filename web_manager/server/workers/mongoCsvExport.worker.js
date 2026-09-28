const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { buildPipeline } = require('../services/mongo/dataQuery.js');

function csvCell(value) {
  let text;
  if (value === null || value === undefined) text = '';
  else if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  // Excel co the thuc thi cong thuc khi mo CSV; neutralize cac gia tri nguy hiem.
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function writeLine(stream, text) {
  if (stream.write(`${text}\n`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    stream.once('drain', resolve);
    stream.once('error', reject);
  });
}

async function run() {
  const { query, outputPath, mongoUri } = workerData;
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(mongoUri);
  let stream;
  try {
    await client.connect();
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
    // BOM giup Excel nhan UTF-8, khong tao them dong trong o dau file.
    stream.write('\uFEFF');

    const cursor = client.db(query.source.database)
      .collection(query.source.collection)
      .aggregate(buildPipeline(query), { allowDiskUse: true });
    let headers;
    let rowCount = 0;
    for await (const document of cursor) {
      if (!headers) {
        headers = Object.keys(document);
        await writeLine(stream, headers.map(csvCell).join(','));
      }
      await writeLine(stream, headers.map((header) => csvCell(document[header])).join(','));
      rowCount += 1;
    }
    await new Promise((resolve, reject) => stream.end(resolve).on('error', reject));
    parentPort.postMessage({ status: 'completed', rowCount });
  } catch (error) {
    if (stream) stream.destroy();
    throw error;
  } finally {
    await client.close().catch(() => {});
  }
}

run().catch((error) => {
  parentPort.postMessage({ status: 'failed', error: error.message || String(error) });
  process.exitCode = 1;
});
