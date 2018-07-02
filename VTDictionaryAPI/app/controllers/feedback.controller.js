/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const FeedBack = require('../models/feedback.model.js');
const logger = require('../common/logger.common.js');

/* --------------------------------------------------------------------- */
/* CREATE & SAVE FEEDBACK
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {
    // Validate email first   

    // Create FeedBack obj
    const feedback = new FeedBack({ email: req.query.email, name: req.query.name, phonenumber: req.query.phone, content: req.query.content });

    // Save FeedBack in the database
    feedback.save()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error while saving the feedback", err);
            res.status(500).send({ code: 400, message: err });
        });
};

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN ALL FEEDBACK FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    FeedBack.find()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error while get all the feedback", err);
            res.status(500).send({ code: 400, message: err });
        });
};

/* --------------------------------------------------------------------- */
/* FIND A SINGLE FEEDBACK WITH A FEEDBACKID
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    FeedBack.findById(req.params.feedbackId)
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "FeedBack not found with id " + req.params.feedbackId }); }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error while get feedback by id", err);
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "FeedBack not found with id " + req.params.feedbackId }); }
            return res.status(500).send({ code: 400, message: "Error retrieving FeedBack with id " + req.params.feedbackId });
        });
};

/* --------------------------------------------------------------------- */
/* DELETE A FEEDBACK WITH THE SPECIFIED FEEDBACKID
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    FeedBack.findByIdAndRemove(req.params.feedbackId)
        .then(data => {
            if (!data) {
                // Log the error
                logger.error("FeedBack not found", err);
                return res.status(404).send({ code: 400, message: "FeedBack not found with id " + req.params.feedbackId });
            }
            res.send({ code: 200, message: "FeedBack deleted successfully!" });
        })
        .catch(err => {
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                // Log the error
                logger.error("FeedBack not found", err);
                return res.status(404).send({ code: 400, message: "FeedBack not found with id " + req.params.feedbackId });
            }
            // Log the error
            logger.error("Could not delete FeedBack", err);
            return res.status(500).send({ code: 400, message: "Could not delete FeedBack with id " + req.params.feedbackId });
        });
};