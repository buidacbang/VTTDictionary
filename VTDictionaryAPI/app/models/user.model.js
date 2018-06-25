/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* USER SCHEMA
/* --------------------------------------------------------------------- */

const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: { type: String, index: { unique: true }, trim: true },
    password: String,
    isAdmin: Boolean,
    fullName:String,    
    email: String,
    phonenumber: String,
    birthday: Date
}, { timestamps: true });

/* --------------------------------------------------------------------- */
/* METHODS
/* --------------------------------------------------------------------- */
// Generating a hash
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// Checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model(config.modelName.user, userSchema);