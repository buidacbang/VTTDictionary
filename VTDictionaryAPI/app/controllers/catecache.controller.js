/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const Category = require('../models/category.model.js');
const CateCache = require('../models/catecache.model.js');
const logger = require('../common/logger.common.js');
const events = require('events');

/* --------------------------------------------------------------------- */
/* CREATE ALL CACHES
/* --------------------------------------------------------------------- */
exports.createAll = (req, res) => {
    var categoryArr = [];
    // Get root categories first
    var query = Category.find({ 'parent': '' });
    // BEING CONTRUCTION

    // Get categories by query
    function getCategoriesByQuery(query) {
        return new Promise((resolve, reject) => {
            query.exec((err, data) => {
                if (err) return reject(err);
                if (!data) return reject(err);
                resolve(data);
            })
        });
    }        
};

/* --------------------------------------------------------------------- */
/* CREATE AND SAVE
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {
    // Create an CateCache
    const catecache = new CateCache({ key: req.body.key, value: req.body.value });

    // Save CateCache in the database
    catecache.save()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error at function: CateCacheController.create", err);
            res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
        });
};

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN ALL CATECACHES FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    CateCache.find()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error at function: CateCacheController.findAll", err);
            res.status(500).send({ code: 400, message: "Some error occurred while retrieving catecache." });
        });
};

/* --------------------------------------------------------------------- */
/* FIND A SINGLE CATECACHE WITH A CATECACHEID
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    CateCache.findById(req.params.catecacheId)
        .then(data => {
            if (!data) {
                return res.status(404).send({ code: 400, message: "CateCache not found with id " + req.params.catecacheId });
            }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: CateCacheController.findOne", err);
            if (err.kind === 'ObjectId') {
                return res.status(404).send({ code: 400, message: "CateCache not found with id " + req.params.catecacheId });
            }
            return res.status(500).send({ code: 400, message: "Error retrieving CateCache with id " + req.params.catecacheId });
        });
};

/* --------------------------------------------------------------------- */
/* UPDATE AN CATECACHE IDENTIFIED BY THE CATECACHEID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.update = (req, res) => {
    // Find CateCache and update it with the request body
    var catecacheId = req.body._id || req.params.catecacheId;
    CateCache.findByIdAndUpdate(catecacheId, {
        key: req.body.key,
        value: req.body.value
    }, { new: true })
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "CateCache not found with id " + req.params.catecacheId }); }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: CateCacheController.update", err);
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "CateCache not found with id " + req.params.catecacheId }); }
            return res.status(500).send({ code: 400, message: "Error updating CateCache with id " + req.params.catecacheId });
        });
};

/* --------------------------------------------------------------------- */
/* DELETE A CATECACHE WITH THE SPECIFIED CATECACHEID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    CateCache.findByIdAndRemove(req.params.catecacheId)
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "CateCache not found with id " + req.params.catecacheId }); }
            res.send({ code: 200, message: "CateCache deleted successfully!" });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: CateCacheController.delete", err);
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({ code: 400, message: "CateCache not found with id " + req.params.catecacheId });
            }
            return res.status(500).send({ code: 400, message: "Could not delete CateCache with id " + req.params.catecacheId });
        });
};
