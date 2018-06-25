/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* GLOSSARY SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const GlossarySchema = mongoose.Schema({
    keyword: { type: String, index: { unique: true }, trim: true },
    kaudio: String,
    transcription: String,
    categoryid: String,
    description: String,
    daudios: [],
    images:[],
    videos: [],
    quiz: String,
    status: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Glossary', GlossarySchema);