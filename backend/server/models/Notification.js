const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: {type: String, required: true, index:true},
    applicationId: { type: String, required:true},
    type: {
        type: String, 
        required: true,
        enum : ['approval', 'rejection', 'status_change', 'submission']

    },
    title: { type: String, required:true},
    message: { type:String, required:true},
    phase: {type:String},
    status: {type: String},
    read: { type:Boolean, default: false, index:true},
    emailSent: {type:Boolean, default: false},
    metadata: {type: mongoose.Schema.Types.Mixed},

}, {timestamps:true});

//index
NotificationSchema.index({ userId:1, read:1, createdAt: -1});

module.exports = mongoose.model('Notification', NotificationSchema);