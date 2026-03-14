const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({

  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  googleId: {
    type: String, 
  }
});




module.exports = mongoose.model("User", UserSchema);
