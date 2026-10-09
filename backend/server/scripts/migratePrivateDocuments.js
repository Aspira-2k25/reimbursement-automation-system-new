// Dry-run by default. Run only during a maintenance window after backing up MongoDB.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connect = require('../config/mongo');
const cloudinary = require('../utils/cloudinary');
const Form = require('../models/Form');
const StudentForm = require('../models/StudentForm');
const Attachment = require('../models/Attachment');

async function main() {
  const apply = process.argv.includes('--apply');
  const journalArg = process.argv.indexOf('--journal');
  const journal = journalArg >= 0 ? path.resolve(process.argv[journalArg + 1]) : null;
  if (apply && (!journal || process.env.MAINTENANCE_MODE !== 'true')) {
    throw new Error('Apply requires MAINTENANCE_MODE=true and --journal <backup-journal.jsonl>');
  }
  await connect();
  const assets = new Map();
  for (const Model of [Form, StudentForm]) {
    for await (const form of Model.find({ 'documents.publicId': { $exists: true } }).lean().cursor()) {
      for (const document of form.documents || []) {
        if (!document.publicId || document.deliveryType === 'authenticated') continue;
        const resourceType = document.resourceType || document.url?.match(/\/(image|raw|video)\/(upload|private|authenticated)\//)?.[1] || 'image';
        const key = `${resourceType}:${document.publicId}`;
        if (!assets.has(key)) assets.set(key, { document: { ...document, resourceType }, references: [] });
        assets.get(key).references.push({ collection: Model.collection.name, id: String(form._id), ownerId: String(form.userId), document });
      }
    }
  }
  console.log(`${apply ? 'Applying' : 'Dry run'}: ${assets.size} legacy assets need authenticated delivery.`);
  if ([...assets.values()].some(asset => new Set(asset.references.map(reference => reference.ownerId)).size !== 1)) {
    throw new Error('Shared asset references across different owners require manual review before migration.');
  }
  if (!apply) return;
  // Exclusive create prevents accidentally overwriting an earlier recovery journal.
  const handle = fs.openSync(journal, 'wx');
  try {
    for (const { document, references } of assets.values()) {
      const resourceType = document.resourceType || 'image';
      const existing = await Attachment.findOne({ publicId: document.publicId });
      if (existing && String(existing.ownerId) !== references[0].ownerId) throw new Error('Existing attachment ownership conflicts with legacy references.');
      const info = await cloudinary.api.resource(document.publicId, { resource_type: resourceType, type: 'upload' });
      fs.writeSync(handle, JSON.stringify({ phase: 'planned', publicId: document.publicId, resourceType, references }) + '\n');
      fs.fsyncSync(handle);
      await cloudinary.uploader.rename(document.publicId, document.publicId, {
        resource_type: resourceType, type: 'upload', to_type: 'authenticated', overwrite: false, invalidate: true,
      });
      fs.writeSync(handle, JSON.stringify({ phase: 'cloud-protected', publicId: document.publicId, resourceType }) + '\n');
      fs.fsyncSync(handle);
      for (const Model of [Form, StudentForm]) {
        await Model.updateMany({ 'documents.publicId': document.publicId }, { $set: {
          'documents.$[document].deliveryType': 'authenticated',
          'documents.$[document].resourceType': resourceType,
          'documents.$[document].format': info.format,
          'documents.$[document].url': '',
        } }, { arrayFilters: [{ 'document.publicId': document.publicId }] });
      }
      await Attachment.updateOne({ publicId: document.publicId }, { $set: { ownerId: references[0].ownerId,
        resourceType, deliveryType: 'authenticated', format: info.format } }, { upsert: true });
      fs.writeSync(handle, JSON.stringify({ phase: 'complete', publicId: document.publicId, resourceType }) + '\n');
      fs.fsyncSync(handle);
    }
  } finally { fs.closeSync(handle); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
