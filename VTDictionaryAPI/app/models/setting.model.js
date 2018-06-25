/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');

/* --------------------------------------------------------------------- */
/* SETTING SCHEMA
/* --------------------------------------------------------------------- */
const mongoose = require('mongoose');

const SettingSchema = mongoose.Schema({
    key: { type: String, unique: true },
    value: {}
}, {
        timestamps: true
    });

module.exports = mongoose.model(config.modelName.setting, SettingSchema);