/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const Translate = require('../models/translate.model.js');
const logger = require('../common/logger.common.js');

/* --------------------------------------------------------------------- */
/* CREATE AND SAVE A NEW TRANSLATE
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {

};

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN ALL TRANSLATE FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    Translate.find()
        .then(data => {
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: TranslateController.findAll", err);
            res.status(500).send({ code: 400, message: "Some error occurred while retrieving translates" });
        });
};

/* --------------------------------------------------------------------- */
/* FIND A SINGLE TRANSLATE WITH A TRANSLATEID
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    Translate.findById(req.params.translateId)
        .then(data => {
            if (!data) {
                return res.status(404).send({ code: 400, message: "translate not found with id " + req.params.translateId });
            }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: TranslateController.findOne", err);
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "translate not found with id " + req.params.translateId }); }
            return res.status(500).send({ code: 400, message: "Error retrieving translate with id " + req.params.translateId });
        });
};

/* --------------------------------------------------------------------- */
/* UPDATE AN TRANSLATE IDENTIFIED BY THE TRANSLATEID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.update = (req, res) => {
    // Find translate and update it with the request body
    Translate.findByIdAndUpdate(req.params.translateId, {
        keyword: req.body.keyword,
        code: req.body.code,
        translated: req.body.translated
    }, { new: true })
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "translate not found with id " + req.params.translateId }); }
            res.send({ code: 200, message: data });
        }).catch(err => {
            // Log the error
            logger.error("Error at function: TranslateController.update", err);
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "translate not found with id " + req.params.translateId }); }
            return res.status(500).send({ code: 400, message: "Error updating translate with id " + req.params.translateId });
        });
};

/* --------------------------------------------------------------------- */
/* DELETE A TRANSLATE WITH THE SPECIFIED TRANSLATEID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    Translate.findByIdAndRemove(req.params.translateId)
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "translate not found with id " + req.params.translateId }); }
            res.send({ code: 200, message: "translate deleted successfully!" });
        }).catch(err => {
            // Log the error
            logger.error("Error at function: TranslateController.delete", err);
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({ code: 400, message: "translate not found with id " + req.params.translateId });
            }
            return res.status(500).send({ code: 400, message: "Could not delete translate with id " + req.params.translateId });
        });
};

/* --------------------------------------------------------------------- */
/* DELETE ALL TRANSLATED
/* --------------------------------------------------------------------- */
exports.deleteAll = (req, res) => {
    Translate.remove()
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "Can't delete all translated" }); }
            res.send({ code: 200, message: "Translates deleted successfully!" });
        }).catch(err => {
            // Log the error
            logger.error("Error at function: TranslateController.deleteAll", err);
            if (err.kind === 'ObjectId' || err.name === 'NotFound') { return res.status(404).send({ code: 400, message: "Can't delete all translated" }); }
            return res.status(500).send({ code: 400, message: "Can't delete all translated" });
        });
};
