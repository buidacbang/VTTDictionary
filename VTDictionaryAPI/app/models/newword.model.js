/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* NEWWORD SCHEMA
/* --------------------------------------------------------------------- */

const mongoose = require('mongoose');

const NewWordSchema = mongoose.Schema({
    email: String,
    name: String,
    phonenumber: String,
    content: String
}, { timestamps: true });

module.exports = mongoose.model(config.modelName.newword, NewWordSchema);