/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* LANGUAGE SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const LanguageSchema = mongoose.Schema({
    language: String,
    code: String,
    image: String,
    resources: {},
    status: { type: Number, default: 1 }
}, {
    timestamps: true
});

module.exports = mongoose.model(config.modelName.language, LanguageSchema);