/**
 * One-time data migration script to normalize `userId` values in Form and StudentForm collections.
 * 
 * Ensures all `userId` fields are stored as consistent strings without inconsistent
 * types (numeric, email vs id, un-trimmed strings) and avoids N+1 query lookups.
 * 
 * Usage:
 *   node scripts/normalizeUserIds.js [--dry-run]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectMongoDB = require('../config/mongo');
const prisma = require('../config/prisma');
const Form = require('../models/Form');
const StudentForm = require('../models/StudentForm');

async function runMigration() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`\n--- Starting userId normalization migration ${isDryRun ? '(DRY RUN)' : ''} ---`);

  try {
    await connectMongoDB();
    console.log('✅ Connected to MongoDB');

    // Pre-fetch staff map from PostgreSQL (email -> string ID, id -> string ID)
    let staffMap = new Map();
    try {
      const allStaff = await prisma.staff.findMany({
        select: { id: true, email: true, username: true }
      });
      for (const s of allStaff) {
        if (s.email) staffMap.set(s.email.toLowerCase().trim(), String(s.id));
        if (s.id) staffMap.set(String(s.id), String(s.id));
      }
      console.log(`✅ Loaded ${allStaff.length} staff records from PostgreSQL`);
    } catch (dbErr) {
      console.warn('⚠️ Could not load staff from PostgreSQL (proceeding with string normalization only):', dbErr.message);
    }

    const collections = [
      { name: 'Form', model: Form },
      { name: 'StudentForm', model: StudentForm }
    ];

    for (const { name, model } of collections) {
      console.log(`\nScanning ${name} collection...`);
      const cursor = model.find({}).cursor();
      let total = 0;
      let updated = 0;
      let skipped = 0;

      for await (const doc of cursor) {
        total++;
        const rawUserId = doc.userId;
        let normalizedUserId = null;

        if (rawUserId !== null && rawUserId !== undefined) {
          const rawStr = String(rawUserId).trim();
          // If raw is an email, check if we have a staff ID mapping
          if (rawStr.includes('@') && staffMap.has(rawStr.toLowerCase())) {
            normalizedUserId = staffMap.get(rawStr.toLowerCase());
          } else {
            normalizedUserId = rawStr;
          }
        } else if (doc.email && staffMap.has(String(doc.email).toLowerCase().trim())) {
          normalizedUserId = staffMap.get(String(doc.email).toLowerCase().trim());
        }

        if (normalizedUserId && normalizedUserId !== rawUserId) {
          if (!isDryRun) {
            await model.updateOne(
              { _id: doc._id },
              { $set: { userId: normalizedUserId } }
            );
          }
          updated++;
          if (updated <= 10) {
            console.log(`  [${name} ${doc.applicationId || doc._id}] userId '${rawUserId}' (${typeof rawUserId}) -> '${normalizedUserId}'`);
          }
        } else {
          skipped++;
        }
      }

      console.log(`Summary for ${name}: Total scanned=${total}, Updated=${updated}, Skipped=${skipped}`);
    }

    console.log(`\n✅ userId normalization complete! ${isDryRun ? '(Dry run finished - no writes made)' : '(All changes saved)'}\n`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
      await prisma.$disconnect();
    } catch (_) {}
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
