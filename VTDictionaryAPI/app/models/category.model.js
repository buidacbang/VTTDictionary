/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* CATEGORY SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
    name: { type: String, trim: true },
    resources: [{ _id: String, text: String }],
    parent: String,
    tree: [String],
    order: { type: Number, default: 1 },
    status: { type: Number, default: 1 },
    totalGlossary: { type: Number, default: 0 },
    totalCourse: { type: Number, default: 0 },
    type: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model(config.modelName.category, CategorySchema);