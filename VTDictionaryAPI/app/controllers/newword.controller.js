/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const NewWord = require('../models/newword.model.js');
const logger = require('../common/logger.common.js');

/* --------------------------------------------------------------------- */
/* CREATE & SAVE NEWWORD
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {

    // Create NewWord obj
    const newword = new NewWord({ email: req.query.email, name: req.query.name, phonenumber: req.query.phone, content: req.query.content });

    // Save NewWord in the database
    newword.save()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error while saving the newword", err);
            res.status(500).send({ code: 400, message: err });
        });
};

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN ALL NEWWORD FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    NewWord.find()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error while get all the newword", err);
            res.status(500).send({ code: 400, message: err });
        });
};

/* --------------------------------------------------------------------- */
/* FIND A SINGLE NEWWORD WITH A NEWWORD
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    NewWord.findById(req.params.newwordId)
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "NewWord not found with id " + req.params.newwordId }); }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error while get newword by id", err);
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "NewWord not found with id " + req.params.newwordId }); }
            return res.status(500).send({ code: 400, message: "Error retrieving NewWord with id " + req.params.newwordId });
        });
};

/* --------------------------------------------------------------------- */
/* DELETE A NEWWORD WITH THE SPECIFIED NEWWORDID
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    NewWord.findByIdAndRemove(req.params.newwordId)
        .then(data => {
            if (!data) {
                // Log the error
                logger.error("NewWord not found", err);
                return res.status(404).send({ code: 400, message: "NewWord not found with id " + req.params.newwordId });
            }
            res.send({ code: 200, message: "NewWord deleted successfully!" });
        })
        .catch(err => {
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                // Log the error
                logger.error("NewWord not found", err);
                return res.status(404).send({ code: 400, message: "NewWord not found with id " + req.params.newwordId });
            }
            // Log the error
            logger.error("Could not delete NewWord", err);
            return res.status(500).send({ code: 400, message: "Could not delete NewWord with id " + req.params.newwordId });
        });
};