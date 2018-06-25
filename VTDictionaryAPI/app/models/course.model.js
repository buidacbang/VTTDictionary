/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* COURSE SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const CourseSchema = mongoose.Schema({
    name: { type: String, trim: true },
    categoryid: String,
    category: String,
    languageCode: { type: String, default: "en" },
    description: String,
    author: String,
    images:[],
    url: String,
    favouriteCount: { type: Number, default: 1 },
    enrollmentCount: { type: Number, default: 1 },
    viewCount: { type: Number, default: 1 },
    status: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model(config.modelName.course, CourseSchema);