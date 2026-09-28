const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { getCollection, getMongoUri } = require('../services/mongo/mongoClient.js');
const { validateRequest, buildPipeline } = require('../services/mongo/dataQuery.js');

const exportJobs = new Map();
const workerFile = path.join(__dirname, '../workers/mongoCsvExport.worker.js');
// Theo yeu cau, CSV duoc luu trong thu muc static cua ung dung.
const exportDirectory = path.join(__dirname, '../../public/uploads/datas');

function csvCell(value) {
  let text;
  if (value === null || value === undefined) text = '';
  else if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function makeCsv(documents) {
  if (documents.length === 0) return '\uFEFF';
  const headers = Object.keys(documents[0]);
  const lines = [headers.map(csvCell).join(',')];
  for (const document of documents) lines.push(headers.map((header) => csvCell(document[header])).join(','));
  return `\uFEFF${lines.join('\n')}\n`;
}

function ownerId(req) {
  return String(req.currentUser && req.currentUser.users_id);
}

async function loadDocuments(query) {
  const collection = await getCollection(query.source);
  return collection.aggregate(buildPipeline(query), { allowDiskUse: true }).toArray();
}

exports.getData = async function getData(req, res) {
  try {
    const query = validateRequest(req.body);
    if (query.exportType === 3) return queueCsvExport(req, res, query);

    const documents = await loadDocuments(query);
    if (query.exportType === 2) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${query.info}-${Date.now()}.csv"`);
      return res.status(200).send(makeCsv(documents));
    }
    return res.status(200).json({ result: documents, count: documents.length });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'MongoDB query failed' });
  }
};

function queueCsvExport(req, res, query) {
  const id = crypto.randomUUID();
  const outputPath = path.join(exportDirectory, `${id}.csv`);
  const job = {
    id,
    ownerId: ownerId(req),
    status: 'queued',
    createdAt: new Date().toISOString(),
    completedAt: null,
    rowCount: null,
    error: null,
    outputPath,
  };
  exportJobs.set(id, job);

  let worker;
  try {
    worker = new Worker(workerFile, { workerData: { query, outputPath, mongoUri: getMongoUri() } });
  } catch (error) {
    exportJobs.delete(id);
    throw error;
  }
  job.status = 'running';
  worker.on('message', (message) => {
    if (message.status === 'completed') {
      job.status = 'completed';
      job.rowCount = message.rowCount;
      job.completedAt = new Date().toISOString();
    } else if (message.status === 'failed') {
      job.status = 'failed';
      job.error = message.error;
    }
  });
  worker.on('error', (error) => {
    job.status = 'failed';
    job.error = error.message;
  });
  worker.on('exit', (code) => {
    if (code !== 0 && job.status !== 'failed') {
      job.status = 'failed';
      job.error = `Export worker exited with code ${code}`;
    }
  });
  return res.status(202).json({
    result: {
      job_id: id,
      status: job.status,
      status_url: `/api/mongodb/exports/${id}`,
    },
  });
}

function getOwnedJob(req, res) {
  const job = exportJobs.get(req.params.jobId);
  if (!job || job.ownerId !== ownerId(req)) {
    res.status(404).json({ error: 'Export job not found' });
    return null;
  }
  return job;
}

exports.getExportStatus = function getExportStatus(req, res) {
  const job = getOwnedJob(req, res);
  if (!job) return;
  const result = {
    job_id: job.id,
    status: job.status,
    created_at: job.createdAt,
    completed_at: job.completedAt,
    row_count: job.rowCount,
    error: job.error,
  };
  if (job.status === 'completed') result.download_url = `/api/mongodb/exports/${job.id}/download`;
  return res.status(200).json({ result });
};

exports.downloadExport = async function downloadExport(req, res) {
  const job = getOwnedJob(req, res);
  if (!job) return;
  if (job.status !== 'completed') return res.status(409).json({ error: `Export is ${job.status}` });
  try {
    await fs.promises.access(job.outputPath, fs.constants.R_OK);
    return res.download(job.outputPath, `mongodb-export-${job.id}.csv`);
  } catch (_) {
    return res.status(410).json({ error: 'Export file is no longer available' });
  }
};
