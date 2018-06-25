/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* TRANSLATE SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const TranslateSchema = mongoose.Schema({
    keyword: { type: String, index: true },
    code: String,
    translated: {
        word: String,
        waudio: String,
        category: String,
        description: String,
        daudio: String,
        daudios: [],
        image: String,
        images: [],
        video: String,
        videos: [],
        quiz: String
    }
}, {
        timestamps: true
    });

module.exports = mongoose.model(config.modelName.translate, TranslateSchema);