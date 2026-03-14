const mongoose = require("mongoose");

const ProviderCounterSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  current: { type: Number, default: 0 },
});

module.exports = mongoose.model("ProviderCounter", ProviderCounterSchema);
