/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const Category = require('../models/category.model.js');
const CateCache = require('../models/catecache.model.js');
const Dictionary = require('../models/dictionary.model.js');
const Course = require('../models/course.model.js');
const logger = require('../common/logger.common.js');
const config = require('../../config/app.config.js');
const Transaction = require('mongoose-transactions');
const events = require('events');

/* --------------------------------------------------------------------- */
/* CREATE AND SAVE A NEW CATEGORY
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {
    // Create an Category
    const category = new Category({
        name: req.body.name.trim(),
        parent: req.body.parent,
        tree: req.body.tree,
        resources: req.body.resources,
        order: req.body.order,
        status: req.body.status
    });

    // Save Category in the database
    category.save()
        .then(data => {
            res.send({ code: 200, message: data });
            //recursiveCreateCateCache(data);
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Category->create", err);
            res.status(500).send({ code: 400, message: "Some error occurred while creating the Category." });
        });

    // Finish creating the caches
    function finishCreateCache() {
        // Send response
        res.send({ code: 200, message: category });
    }

    // Create the cache recursively
    function recursiveCreateCateCache(category) {
        // Get cache of the category first
        CateCache.findOne({ 'key': category._id })
            .then(catecache => {
                // Check for new catecache
                if (!catecache) {
                    // Prepare new catecache
                    catecache = new CateCache({ key: category._id, value: category._id });
                    catecache.save()
                        .then(result => {
                            if (!result) {
                                // Log the error
                                logger.error("Error at function: CateCacheController.create->recursiveCreateCateCache->saveNewCateCache", "Can not create new catecache");
                                return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
                            } else {
                                // Check for parent
                                if (!category.parent) return finishCreateCache(); //no parent --> finish
                                else { //has parent
                                    // Get parent's cache & update
                                    updateParentCateCache(category, category._id);
                                }
                            }
                        })
                        .catch(err => {
                            // Log the error
                            logger.error("Error at function: CateCacheController.create->recursiveCreateCateCache->saveNewCateCache", err);
                            return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
                        })
                }
            })
            .catch(err => {
                // Log the error
                logger.error("Error at function: CateCacheController.create->recursiveCreateCateCache->findParentCategory", err);
                return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
            })

        // Update parent's catecache
        function updateParentCateCache(category, key) {
            // Finde parent's catecache first
            CateCache.findOne({ 'key': category.parent })
                .then(catecache => {
                    // Push this categoryId to parent's values
                    catecache.value.push(key);
                    // Then update the parent's cache
                    CateCache.findByIdAndUpdate(catecache._id, catecache, { new: true })
                        .then(result => {
                            if (!result) {
                                // Log the error
                                logger.error("Error at function: CateCacheController.create->Update parent's catecache", "Can not update catecache");
                                return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
                            } else {
                                // Get parent's category
                                Category.findById(category.parent)
                                    .then(category => {
                                        if (!category) {
                                            // Log the error
                                            logger.error("Error at function: CateCacheController.create->updateParentCateCache", "Can not get parent's category");
                                            return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
                                        } else {
                                            // Continue update the parent if neccessary
                                            if (!category.parent) return finishCreateCache(); //no parent --> finish
                                            else { updateParentCateCache(category, key); }
                                        }
                                    })
                                    .catch(err => {
                                        // Log the error
                                        logger.error("Error at function: CateCacheController.create->updateParentCateCache", "Can not get parent's category");
                                        return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
                                    })
                            }
                        })
                        .catch(err => {
                            // Log the error
                            logger.error("Error at function: CateCacheController.create->recursiveCreateCateCache", err);
                            return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
                        });
                })
                .catch(err => {
                    // Log the error
                    logger.error("Error at function: CateCacheController.create->saveNewCateCache->getParentCategory", err);
                    return res.status(500).send({ code: 400, message: "Some error occurred while creating the CateCache" });
                })
        }
    }
};

/* --------------------------------------------------------------------- */
/*  RETRIEVE AND RETURN ALL CATEGORIES FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    Category.find()
        .then(data => {
            // Check input country
            var country = req.query.country || config.app.originalLanguage;
            if (!String.isNullOrEmpty(country)) {
                var result = data.map(category => {
                    var resource = category.resources.find(function (resource) { return resource._id === country; });
                    category.name = resource.text;
                    // Delete unnecessary fields
                    //category.resources = undefined;
                    //delete category.resources;
                    return category;
                });
                //console.log(result);
                data = result;
            }
            // Count total data here
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Category->findAll", err);
            res.status(500).send({ code: 400, message: "Some error occurred while retrieving categories." });
        });
};

/* --------------------------------------------------------------------- */
/*  FIND A SINGLE CATEGORY WITH A CATEGORYID
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    Category.findById(req.params.categoryId)
        .then(data => {
            if (!data) {
                return res.status(404).send({ code: 400, message: "Category not found with id " + req.params.categoryId });
            }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Category->findOne", err);
            if (err.kind === 'ObjectId') {
                return res.status(404).send({ code: 400, message: "Category not found with id " + req.params.categoryId });
            }
            return res.status(500).send({ code: 400, message: "Error retrieving category with id " + req.params.categoryId });
        });
};

/* --------------------------------------------------------------------- */
/*  FIND CHILD BY PARENT ID
/* --------------------------------------------------------------------- */
exports.findChildByParentId = (req, res) => {
    var query = Category.find({ 'parent': req.params.parentId });

    // execute the query
    query.exec(function (err, data) {
        if (err) {
            // Log the error
            logger.error("Error at function: Category->findChildByParentId", err);
            return res.status(500).send({ code: 400, message: "Error retrieving language with code " + req.params.parentId });
        }
        if (!data) {
            return res.status(404).send({ code: 400, message: "Language not found with code " + req.params.parentId });
        }
        res.send({ code: 200, message: data });
    });
}

/* --------------------------------------------------------------------- */
/*  UPDATE CATEGORY
/* --------------------------------------------------------------------- */
exports.update = (req, res) => {
    var transaction = new Transaction();
    var targetCategory = new Category({
        _id: req.body._id || req.params.categoryId,
        name: req.body.name.trim(),
        parent: req.body.parent,
        tree: req.body.tree,
        resources: req.body.resources,
        order: req.body.order,
        status: req.body.order,
        totalGlossary: req.body.totalGlossary,
        totalCourse: req.body.totalCourse
    });
    // Update target
    transaction.update(config.modelName.category, targetCategory._id, targetCategory);
    // Update sub-category    
    Category.find({ tree: targetCategory._id })
        .then(categories => {
            categories.forEach(category => {
                // Set new path for the sub-category                
                category.tree.splice(0, category.tree.indexOf(targetCategory._id.toString()));
                category.tree = targetCategory.tree.concat(category.tree);
                // Update the sub-category
                transaction.update(config.modelName.category, category._id, category);
            })

            // Execute transaction
            transaction.run()
                .then(result => {
                    transaction.clean();
                    res.send({ code: 200, message: "Category is updated: " + targetCategory._id });
                })
                .catch(err => {
                    transaction.rollback()
                        .then(result => {
                            res.send({ code: 200, message: "Category was not updated: " + targetCategory._id });
                            transaction.clean();
                        })
                        .catch(err => {
                            transaction.clean();
                            logger.error("Error at function: Category.update -> transaction.run()", err);
                        })
                })
        })
        .catch(err => {
            // Send erro to client
            return res.send({ code: 400, message: "Error updating Category with id " + targetCategory._id });
        })

    // Find category and update it with the request body
    //var categoryId = req.body._id || req.params.categoryId;
    //Category.findByIdAndUpdate(categoryId, {
    //    name: req.body.name.trim(),
    //    parent: req.body.parent,
    //    tree: req.body.tree,
    //    resources: req.body.resources,
    //    order: req.body.order,
    //    status: req.body.order,
    //    totalGlossary: req.body.totalGlossary,
    //    totalCourse: req.body.totalCourse
    //}, { new: true })
    //    .then(data => {
    //        if (!data) {
    //            return res.status(404).send({ code: 400, message: "Category not found with id " + req.params.categoryId });
    //        }
    //        res.send({ code: 200, message: data });
    //    })
    //    .catch(err => {
    //        // Log the error
    //        logger.error("Error at function: Category->update", err);
    //        if (err.kind === 'ObjectId') {
    //            return res.status(404).send({ code: 400, message: "Category not found with id " + req.params.categoryId });
    //        }
    //        return res.status(500).send({ code: 400, message: "Error updating Category with id " + req.params.categoryId });
    //    });

};

/* --------------------------------------------------------------------- */
/*  DELETE A CATEGORY WITH THE SPECIFIED CATEGORYID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    Category.findByIdAndRemove(req.params.categoryId)
        .then(data => {
            if (!data) {
                return res.status(404).send({ code: 400, message: "Category not found with id " + req.params.categoryId });
            }
            res.send({ code: 200, message: "Category deleted successfully!" });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Category->delete", err);
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({ code: 400, message: "Category not found with id " + req.params.categoryId });
            }
            return res.status(500).send({ code: 400, message: "Could not delete Category with id " + req.params.categoryId });
        });
};

/* --------------------------------------------------------------------- */
/*  CALCULATE TOTAL GLOSSARY & TOTAL COURSE
/* --------------------------------------------------------------------- */
exports.calculateTotalItem = (req, res) => {
    var localEvent = new events.EventEmitter();
    var Event = { FINISH_CHECK: "finish-check" };
    var categoryDict = {};
    var maxCheckCount = 1;
    var taskCount = 0;

    Category.find()
        .then(categories => {
            categories.forEach(category => {
                // Init item in the dictionary
                categoryDict[category._id] = category;
                // GET ALL SUBCATE'S ID FIRST
                Category.find({ tree: category._id }).select('_id').exec()                
                    .then(result => {
                        // Filter to get clean array of id
                        var subcate_ids = result.map(x => x._id);
                        // COUNT TOTAL IN THIS CATE & CATECACHES (SUBCATE)                
                        Dictionary.count({ $or: [{ categoryid: category._id }, { categoryid: { $in: subcate_ids } }] })
                            .then(dictCount => {
                                // Update data
                                categoryDict[category._id].totalGlossary = dictCount;
                                // Fire event
                                localEvent.emit(Event.FINISH_CHECK, category._id);
                            })
                            .catch(err => {
                                // Log the error
                                logger.error("Error at function: Category.calculateTotalItem->Dictionary.count()", err, category);
                                categoryDict[category._id].err = err;
                                // Fire event
                                localEvent.emit(Event.FINISH_CHECK, category._id);
                            })
                        Course.count({ $or: [{ categoryid: category._id }, { categoryid: { $in: subcate_ids } }] })
                            .then(courseCount => {
                                // Update data
                                categoryDict[category._id].totalCourse = courseCount;
                                // Fire event
                                localEvent.emit(Event.FINISH_CHECK, category._id);
                            })
                            .catch(err => {
                                // Log the error
                                logger.error("Error at function: Category.calculateTotalItem->Course.count()", err, category);
                                categoryDict[category._id].err = err;
                                // Fire event
                                localEvent.emit(Event.FINISH_CHECK, category._id);
                            })
                    })
                    .catch(err => {
                        // Log the error
                        logger.error("Error at function: Category.calculateTotalItem->Category.findSubCate()", err);
                        // Send response
                        return res.send({ code: 400, message: "Could not calculate the total item!" });
                    })
            })
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Category.calculateTotalItem->Category.findAll()", err);
            // Send response
            return res.send({ code: 400, message: "Could not calculate the total item!" });
        })

    // Handle the events
    localEvent.on(Event.FINISH_CHECK, (categoryid => {
        var category = categoryDict[categoryid];
        category.checkCount = category.checkCount === undefined ? 0 : ++category.checkCount;

        if ((category.checkCount < maxCheckCount) || category.isFinished) return;
        if (category.err) return taskCount++;

        // Update category to the DB
        Category.findByIdAndUpdate(category._id, category)
            .then(result => {
                // UPDATE PROGRESS TO CLIENT HERE
                category.isFinished = true;
                if (++taskCount == Object.keys(categoryDict).length) res.send(categoryDict);
            })
            .catch(err => {
                // Log the error 
                logger.error('Error at function: Dictionary.bulkInsertOrUpdate -> update dictionary', err, dict);
                category.isFinished = true;
                category.err = err;
                if (++taskCount == Object.keys(categoryDict).length) res.send(categoryDict);
            });
    }))
}