/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const Setting = require('../models/setting.model.js');
const logger = require('../common/logger.common.js');

/* --------------------------------------------------------------------- */
/* CREATE AND SAVE
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {
    // Create a Setting
    const setting = new Setting({
        key: req.body.key,
        value: req.body.value
    });

    // Save Setting in the database
    setting.save()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Setting.create", err);
            res.status(500).send({ code: 400, message: "Some error occurred while creating the Setting." });
        });
};

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN ALL SETTINGS FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    Setting.find()
        .then(data => {
            res.send({ code: 200, message: data });
        }).catch(err => {
            // Log the error
            logger.error("Error at function: Setting.findAll", err);
            res.status(500).send({ code: 400, message: "Some error occurred while retrieving setting." });
        });
};

/* --------------------------------------------------------------------- */
/* FIND A SINGLE SETTING WITH A KEY
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    // Grab the UUID
    var uuid = req.query.uuid;
    if (uuid) logger.info("Got device's UUID: ", uuid);
    var _key = req.query.key.trim().toLowerCase();
    Setting.findOne({ 'key': { $regex: new RegExp(_key, "i") } })
        .then(data => {
            if (!data) {
                return res.status(404).send({ code: 400, message: "Setting not found with key " + req.query.key });
            }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Setting.findOne", err);
            if (err.kind === 'ObjectId') {
                return res.status(404).sendsend({ code: 400, message: "Setting not found with id " + req.query.key });
            }
            return res.status(500).send({ code: 400, message: "Error retrieving Setting with id " + req.query.key });
        });
};

/* --------------------------------------------------------------------- */
/* UPDATE AN SETTING IDENTIFIED BY THE ID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.update = (req, res) => {
    // Find Setting and update it with the input key
    Setting.findByIdAndUpdate(req.params.settingId, {
        key: req.body.key,
        value: req.body.value
    }, { new: true })
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "Setting not found with id " + req.params.settingId }); }
            res.send({ code: 200, message: data });
        }).catch(err => {
            // Log the error
            logger.error("Error at function: Setting.update", err);
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "Setting not found with id " + req.params.settingId }); }
            return res.status(500).send({ code: 400, message: "Error updating Setting with id " + req.params.settingId });
        });
};

/* --------------------------------------------------------------------- */
/* DELETE A SETTING WITH THE SPECIFIED ID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    Setting.findByIdAndRemove(req.params.settingId)
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "Setting not found with id " + req.params.settingId }); }
            res.send({ code: 200, message: "Setting deleted successfully!" });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Setting.delete", err);
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({ code: 400, message: "Setting not found with id " + req.params.settingId });
            }
            return res.status(500).send({ code: 400, message: "Could not delete Setting with id " + req.params.settingId });
        });
};
