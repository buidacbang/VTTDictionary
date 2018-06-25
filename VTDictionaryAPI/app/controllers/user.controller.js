/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const bcrypt = require('bcrypt-nodejs');
const User = require('../models/user.model.js');
const logger = require('../common/logger.common.js');

/* --------------------------------------------------------------------- */
/* CREATE & SAVE USER
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {

    // Create User obj
    const user = new User({
        username: req.,
        password: String,
        isAdmin: Boolean,
        fullName: String,
        email: String,
        phonenumber: String,
        birthday: Date });

    // Save User in the database
    user.save()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error while saving the user", err);
            res.status(500).send({ code: 400, message: err });
        });
};

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN ALL USER FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    User.find()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error while get all the user", err);
            res.status(500).send({ code: 400, message: err });
        });
};

/* --------------------------------------------------------------------- */
/* FIND A SINGLE USER WITH A USER
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    User.findById(req.params.userId)
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "USER not found with id " + req.params.userId }); }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error while get user by id", err);
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "user not found with id " + req.params.userId }); }
            return res.status(500).send({ code: 400, message: "Error retrieving user with id " + req.params.userId });
        });
};

/* --------------------------------------------------------------------- */
/* DELETE A USER WITH THE SPECIFIED USERID
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    User.findByIdAndRemove(req.params.userId)
        .then(data => {
            if (!data) {
                // Log the error
                logger.error("User not found", err);
                return res.status(404).send({ code: 400, message: "User not found with id " + req.params.userId });
            }
            res.send({ code: 200, message: "User deleted successfully!" });
        })
        .catch(err => {
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                // Log the error
                logger.error("User not found", err);
                return res.status(404).send({ code: 400, message: "User not found with id " + req.params.userId });
            }
            // Log the error
            logger.error("Could not delete User", err);
            return res.status(500).send({ code: 400, message: "Could not delete User with id " + req.params.userId });
        });
};