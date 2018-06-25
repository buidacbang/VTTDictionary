/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* FEEDBACK SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const FeedbackSchema = mongoose.Schema({
    email: String,
    name: String,
    phonenumber: String,
    content:String
}, {
    timestamps: true
});

module.exports = mongoose.model(config.modelName.feedback, FeedbackSchema);