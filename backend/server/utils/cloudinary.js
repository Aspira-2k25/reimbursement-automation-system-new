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
function uploadFile(file, options = {}) {
  // If file has buffer property (memory storage), use it
  if (file.buffer) {
    // Convert buffer to data URI format for Cloudinary
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    return cloudinary.uploader.upload(dataUri, options);
  }
  // Otherwise, assume it's a file path (for local development)
  return cloudinary.uploader.upload(file.path || file, options);
}

module.exports = cloudinary;
module.exports.uploadFile = uploadFile;