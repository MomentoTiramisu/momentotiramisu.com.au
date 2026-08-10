const mongoose = require('mongoose');
let Schema = mongoose.Schema;


const createAccountSchema = new Schema({
  email: String,
  password: String,
  createdAt: { type: Date, default: Date.now },
  verificationToken: String,
  isVerified: { type: Boolean, default: false }
});

const createAccount = mongoose.model('Account', createAccountSchema); 

module.exports = {createAccount};

