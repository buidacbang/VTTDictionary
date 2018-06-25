const Language = require('../models/language.model.js');

// Create and Save a new Language
exports.create = (req, res) => {
    // Create a Language
    const language = new Language({
        language: req.body.language,
        code: req.body.code,
        image: req.body.image,
        resources: req.body.resources
    });

    // Save Language in the database
    language.save()
        .then(data => {
            res.send({
                code: 200,
                message: data
            });
        }).catch(err => {
            res.status(500).send({
                code:400,
                message: err.message || "Some error occurred while creating the Language."
            });
        });
};

// Retrieve and return all language from the database.
exports.findAll = (req, res) => {
    Language.find()
        .then(data => {
            res.send({
                code:200,
                message:data
            });
        }).catch(err => {
            res.status(500).send({
                code:400,
                message: err.message || "Some error occurred while retrieving languages."
            });
        });
};

// Find a single language with a languageId
exports.findOne = (req, res) => {
    Language.findById(req.params.languageId)
        .then(data => {
            if (!data) {
                return res.status(404).send({
                    code:400,
                    message: "Language not found with id " + req.params.languageId
                });
            }
            res.send(data);
        }).catch(err => {
            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    code: 400,
                    message: "Language not found with id " + req.params.languageId
                });
            }
            return res.status(500).send({
                message: "Error retrieving language with id " + req.params.languageId
            });
        });
};

// Find languages with code name
exports.findByCode = (req, res) => {
    // find by code
    var query = Language.findOne({ 'code': req.params.code });

        // selecting fields
        query.select('language code image');

        // execute the query at a later time
        query.exec(function (err, data) {
            if (err) return res.status(500).send({
                code: 400,
                message: "Error retrieving language with code " + req.params.code
            });
            if (!data) {
                return res.status(404).send({
                    code: 400,
                    message: "Language not found with code " + req.params.code
                });
            }
            res.send({
                code: 200,
                message: data
            });
        });
}

// Update a language identified by the languageId in the request
exports.update = (req, res) => {
    var id = req.body._id || req.params.languageId;
    // Find language and update it with the request body
    Language.findByIdAndUpdate(id, {
        language: req.body.language,
        code: req.body.code,
        image: req.body.image,
        resources: req.body.resources
    }, { new: true })
        .then(data => {
            if (!data) {
                return res.status(404).send({
                    code: 400,
                    message: "Language not found with id " + req.params.languageId
                });
            }
            res.send({
                code: 200,
                message: data
            });
        }).catch(err => {
            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    code: 400,
                    message: "Language not found with id " + req.params.languageId
                });
            }
            return res.status(500).send({
                code: 400,
                message: "Error updating language with id " + req.params.languageId
            });
        });
};

// Delete a language with the specified languageId in the request
exports.delete = (req, res) => {
    Language.findByIdAndRemove(req.params.languageId)
        .then(data => {
            if (!data) {
                return res.status(404).send({
                    code: 400,
                    message: "Language not found with id " + req.params.languageId
                });
            }
            res.send({ code:200, message: "Language deleted successfully!" });
        }).catch(err => {
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({
                    code: 400,
                    message: "Language not found with id " + req.params.languageId
                });
            }
            return res.status(500).send({
                code: 400,
                message: "Could not delete language with id " + req.params.languageId
            });
        });
};
