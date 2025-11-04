// models/StudentForm.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const StudentFormSchema = new mongoose.Schema({
    applicationId: { type: String, unique: true, default: () => uuidv4() },
    userId: { type: String, required: true }, // link to Postgres user_id
    name: { type: String, required: true },
    studentId: { type: String, required: true },
    division: { type: String, required: true },
    email: { type: String, required: true },
    academicYear: { type: String },
    amount: { type: Number },
    accountName: { type: String },
    ifscCode: { type: String },
    accountNumber: { type: String },
    remarks: { type: String },
    reimbursementType: { type: String, default: "NPTEL" },
    documents: [
        {
            // Support both local file fields and Cloudinary fields
            filename: String,
            path: String,
            mimetype: String,
            url: String,
            publicId: String,
        },
    ],
}, { timestamps: true });

module.exports = mongoose.model("StudentForm", StudentFormSchema);