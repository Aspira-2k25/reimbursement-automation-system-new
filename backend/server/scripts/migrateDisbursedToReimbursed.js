const connectMongoDB = require('../config/mongo');
const Form = require('../models/Form');
const StudentForm = require('../models/StudentForm');

async function migrateDisbursedToReimbursed() {
  await connectMongoDB();

  const [formCountBefore, studentCountBefore] = await Promise.all([
    Form.countDocuments({ status: 'Disbursed' }),
    StudentForm.countDocuments({ status: 'Disbursed' }),
  ]);

  console.log('Legacy records before migration:');
  console.log(`  Form: ${formCountBefore}`);
  console.log(`  StudentForm: ${studentCountBefore}`);

  const [formResult, studentResult] = await Promise.all([
    Form.updateMany({ status: 'Disbursed' }, { $set: { status: 'Reimbursed' } }),
    StudentForm.updateMany({ status: 'Disbursed' }, { $set: { status: 'Reimbursed' } }),
  ]);

  const [formCountAfter, studentCountAfter] = await Promise.all([
    Form.countDocuments({ status: 'Disbursed' }),
    StudentForm.countDocuments({ status: 'Disbursed' }),
  ]);

  console.log('Migration update results:');
  console.log(`  Form matched=${formResult.matchedCount} modified=${formResult.modifiedCount}`);
  console.log(`  StudentForm matched=${studentResult.matchedCount} modified=${studentResult.modifiedCount}`);

  console.log('Legacy records after migration:');
  console.log(`  Form: ${formCountAfter}`);
  console.log(`  StudentForm: ${studentCountAfter}`);

  if (formCountAfter === 0 && studentCountAfter === 0) {
    console.log('Migration completed successfully.');
  } else {
    console.error('Migration completed with residual legacy records. Please inspect data manually.');
    process.exitCode = 1;
  }
}

migrateDisbursedToReimbursed()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
    } catch (_) {
      // no-op
    }
  });
