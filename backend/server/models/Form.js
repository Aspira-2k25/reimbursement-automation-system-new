const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const FormSchema = new mongoose.Schema({
    applicationId: { type: String, unique: true, default: () => uuidv4() },
    userId: { type: String, required: true }, //link to postgres user_id
    name: { type: String, required: true },
    email: { type: String, required: true },
    jobTitle: { type: String },
    department: { type: String }, // Department for HOD filtering
    academicYear: { type: String },
    amount: { type: Number },
    accountName: { type: String },
    ifscCode: { type: String },
    accountNumber: { type: String },
    remark: { type: String },
    reimbursementType: { type: String, default: "NPTEL" },
    applicantType: { type: String, default: "Faculty" }, // "Faculty" or "Coordinator"
    status: {
        type: String,
        default: "Under HOD",
        enum: ["Pending", "Under Coordinator", "Under HOD", "Under Principal", "Approved", "Rejected"]
    },
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

module.exports = mongoose.model("Form", FormSchema);