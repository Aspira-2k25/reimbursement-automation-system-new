const cloudinary = require('cloudinary').v2;

cloudinary.config(
    {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET_KEY
    }
);

// Helper function to upload file from memory buffer (for serverless environments)
// Accepts either a file buffer or a file path (for backward compatibility)
async function uploadFile(file, options = {}) {
  const { ownerId, tracking, ...cloudOptions } = options;
  if (!ownerId) throw new Error('Document owner is required');
  cloudOptions.type = 'authenticated';
  cloudOptions.unique_filename = true;
  cloudOptions.overwrite = false;
  let result;
  // If file has buffer property (memory storage), use it
  if (file.buffer) {
    // Convert buffer to data URI format for Cloudinary
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    result = await cloudinary.uploader.upload(dataUri, cloudOptions);
  } else {
    result = await cloudinary.uploader.upload(file.path || file, cloudOptions);
  }
  let registered = false;
  try {
    await require('../models/Attachment').create({ ownerId: String(ownerId), publicId: result.public_id,
      resourceType: result.resource_type || 'image', deliveryType: 'authenticated', format: result.format });
    registered = true;
    result.secure_url = documentUrl({ publicId: result.public_id, format: result.format,
      resourceType: result.resource_type || 'image', deliveryType: 'authenticated' });
  } catch (error) {
    await cloudinary.uploader.destroy(result.public_id, { resource_type: result.resource_type || 'image', type: 'authenticated' }).catch(() => {});
    if (registered) await require('../models/Attachment').deleteOne({ publicId: result.public_id }).catch(() => {});
    throw error;
  }
  if (tracking) tracking.push(result);
  return result;
}

function toDocument(result, kind) {
  return { url: result.secure_url, publicId: result.public_id, format: result.format,
    resourceType: result.resource_type || 'image', deliveryType: 'authenticated', ...(kind ? { kind } : {}) };
}

function documentUrl(document) {
  if (!document.publicId || document.deliveryType !== 'authenticated') return document.url;
  return cloudinary.utils.private_download_url(document.publicId, document.format || 'pdf', {
    resource_type: document.resourceType || 'image', type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment: false,
  });
}

function serializeDocuments(documents) {
  return (documents || []).map(document => {
    const value = document.toObject ? document.toObject() : { ...document };
    return { ...value, url: documentUrl(value) };
  });
}

async function deleteDocument(document, ownerId) {
  if (!document.publicId) return;
  const record = await require('../models/Attachment').findOne({ publicId: document.publicId });
  if (!record) {
    console.warn('Legacy attachment cleanup requires ownership migration.');
    return;
  }
  const expectedOwner = ownerId ?? document.ownerId;
  if (expectedOwner !== undefined && String(record.ownerId) !== String(expectedOwner)) throw new Error('Attachment ownership mismatch');
  await cloudinary.uploader.destroy(record.publicId, { resource_type: record.resourceType || 'image',
    type: record.deliveryType || 'authenticated', invalidate: true });
  await require('../models/Attachment').deleteOne({ publicId: document.publicId });
}

const rolledBack = new WeakSet();
async function rollbackUploads(results) {
  await Promise.all((results || []).filter(result => result && !rolledBack.has(result)).map(async result => {
    try { await deleteDocument(toDocument(result)); rolledBack.add(result); }
    catch (error) { console.error('Unattached document cleanup requires retry:', error.message); }
  }));
}

async function uploadBatch(promises) {
  const results = await Promise.allSettled(promises);
  const failed = results.find(result => result.status === 'rejected');
  if (failed) {
    await rollbackUploads(results.filter(result => result.status === 'fulfilled').map(result => result.value));
    throw failed.reason;
  }
  return results.map(result => result.value);
}

module.exports = cloudinary;
module.exports.uploadFile = uploadFile;
module.exports.toDocument = toDocument;
module.exports.serializeDocuments = serializeDocuments;
module.exports.deleteDocument = deleteDocument;
module.exports.uploadBatch = uploadBatch;
module.exports.rollbackUploads = rollbackUploads;
