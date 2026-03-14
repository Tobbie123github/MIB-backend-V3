const mongoose = require("mongoose");

const EmailJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  proxyData: Object,
  additionalData: Object,
  documentUrl: String,
  scheduledFor: Date,
  status: { type: String, default: "pending" },
  sentAt: Date,
  error: String,
}, { timestamps: true });

module.exports = mongoose.model("EmailJob", EmailJobSchema);
