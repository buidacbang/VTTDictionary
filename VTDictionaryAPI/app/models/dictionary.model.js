/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* DICTIONARY SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const DictionarySchema = mongoose.Schema({
    keyword: { type: String, index: { unique: true }, trim: true },
    kaudio: String,
    transcription: String,
    categoryid: String,
    category: String,
    description: String,
    daudio: String,
    daudios: [],
    image: String,
    images:[],
    video: String,
    videos: [],
    quiz: String,
    translation: {},
    status: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model(config.modelName.dictionary, DictionarySchema);