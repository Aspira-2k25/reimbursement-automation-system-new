/**
 * normalizeUserIds.js
 * Migration script to normalize userId across Form and StudentForm collections in MongoDB.
 * Ensures every document has a clean string representation for userId.
 *
 * Usage:
 *   node scripts/normalizeUserIds.js --dry-run
 *   node scripts/normalizeUserIds.js --commit
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectMongoDB = require('../config/mongo');
const Form = require('../models/Form');
const StudentForm = require('../models/StudentForm');
const Notification = require('../models/Notification');

async function run() {
  const isDryRun = !process.argv.includes('--commit');
  console.log(`Starting userId normalization (${isDryRun ? 'DRY RUN' : 'COMMITTING CHANGES'})...\n`);

  try {
    await connectMongoDB();

    let totalFormsUpdated = 0;
    let totalStudentFormsUpdated = 0;
    let totalNotificationsUpdated = 0;

    // 1. Process Form collection
    const forms = await Form.find({}).lean();
    console.log(`Found ${forms.length} Form documents.`);

    for (const form of forms) {
      if (form.userId !== undefined && form.userId !== null) {
        const stringUserId = String(form.userId).trim();
        if (form.userId !== stringUserId) {
          totalFormsUpdated++;
          if (!isDryRun) {
            await Form.updateOne({ _id: form._id }, { $set: { userId: stringUserId } });
          }
        }
      }
    }

    // 2. Process StudentForm collection
    const studentForms = await StudentForm.find({}).lean();
    console.log(`Found ${studentForms.length} StudentForm documents.`);

    for (const form of studentForms) {
      if (form.userId !== undefined && form.userId !== null) {
        const stringUserId = String(form.userId).trim();
        if (form.userId !== stringUserId) {
          totalStudentFormsUpdated++;
          if (!isDryRun) {
            await StudentForm.updateOne({ _id: form._id }, { $set: { userId: stringUserId } });
          }
        }
      }
    }

    // 3. Process Notification collection
    const notifications = await Notification.find({}).lean();
    console.log(`Found ${notifications.length} Notification documents.`);

    for (const notif of notifications) {
      if (notif.userId !== undefined && notif.userId !== null) {
        const stringUserId = String(notif.userId).trim();
        if (notif.userId !== stringUserId) {
          totalNotificationsUpdated++;
          if (!isDryRun) {
            await Notification.updateOne({ _id: notif._id }, { $set: { userId: stringUserId } });
          }
        }
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Forms to update: ${totalFormsUpdated}`);
    console.log(`StudentForms to update: ${totalStudentFormsUpdated}`);
    console.log(`Notifications to update: ${totalNotificationsUpdated}`);

    if (isDryRun) {
      console.log('\nDry run complete. No changes were written to the database.');
      console.log('Run with --commit to apply changes.');
    } else {
      console.log('\nMigration successfully committed!');
    }

  } catch (error) {
    console.error('Error during normalization:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
