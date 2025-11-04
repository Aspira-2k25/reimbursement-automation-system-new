const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const FormSchema = new mongoose.Schema({
    applicationId: {type: String, unique:true, default: () => uuidv4()},
    userId: {type: String, required:true}, //link to postgres user_id
    name: { type: String, required:true},
    email:{ type: String, required:true},
    jobTitle: {type: String},
    academicYear: {type: String},
    amount: {type:Number},
    accountName: {type: String},
    ifscCode: {type: String},
    accountNumber: {type: String},
    remark: { type:String},
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

}, {timestamps:true});

module.exports = mongoose.model("Form", FormSchema);