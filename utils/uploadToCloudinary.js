const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

require("dotenv").config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // or "auto", but "raw" is safer for PDF
        public_id: `policies/${filename}`,
        format: "pdf", // force file format
        filename_override: `${filename}.pdf`,
        type: "upload",
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream); // ✅ convert buffer to stream
  });
};

module.exports = uploadToCloudinary;

