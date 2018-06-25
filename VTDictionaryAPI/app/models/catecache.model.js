/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* CATECACHE SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const CateCacheSchema = mongoose.Schema({
    key: { type: String, index: { unique: true } },
    value: [String]
}, { timestamps: true });

module.exports = mongoose.model(config.modelName.catecache, CateCacheSchema);