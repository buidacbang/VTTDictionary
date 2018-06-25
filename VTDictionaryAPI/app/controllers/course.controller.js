/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');
const Category = require('../models/category.model.js');
const CateCache = require('../models/catecache.model.js');
const Course = require('../models/course.model.js');
const logger = require('../common/logger.common.js');
const stringHelper = require("../../app/common/string-helper.common.js");

/* --------------------------------------------------------------------- */
/* CREATE AND SAVE A NEW COURSE
/* --------------------------------------------------------------------- */
exports.create = (req, res) => {
    // Create an Course
    var course = new Course({
        name: req.body.name,
        categoryid: req.body.categoryid,
        category: req.body.category,
        description: req.body.description,
        author: req.body.author,
        images: req.body.images,
        url: req.body.url.replace(/ /g, "%20")
    });

    // Save Course in the database
    course.save()
        .then(data => {
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Course->create", err);
            res.status(500).send({ code: 400, message: "Some error occurred while creating the Course." });
        });
};

/* --------------------------------------------------------------------- */
/*  RETRIEVE AND RETURN ALL COURSES FROM THE DATABASE
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    Course.find()
        .then(data => { res.send({ code: 200, message: data }); })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Course->findAll", err);
            res.status(500).send({ code: 400, message: "Some error occurred while retrieving categories." });
        });
};

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN COURSES FROM THE DATABASE BY CONDITIONS
/* --------------------------------------------------------------------- */
exports.findAll = (req, res) => {
    var _findQuery;
    var _keyword = req.query.keyword;
    var _categoryId = req.query.category;
    var _pageNumber = parseInt(req.query.page);
    _pageNumber = Number.isInteger(_pageNumber) ? _pageNumber : 1;
    var _pageSize = parseInt(req.query.pageSize);
    _pageSize = Number.isInteger(_pageSize) ? _pageSize : config.paginate.minPageSize;
    _pageSize = _pageSize > config.paginate.maxPageSize ? config.paginate.maxPageSize : _pageSize;

    // Check for input conditions
    if ((_categoryId === undefined) && (_keyword === undefined)) {
        // No condition -> Find all
        findAll();
    } else if (_keyword === undefined) {
        // No input keyword -> Find by Category
        findByCategory();
    } else if (_categoryId === undefined) {
        // No input category -> Find by Keyword
        findByKeyword();
    } else {
        // Find by both keyword & category
        findByKeywordAndCategory();
    }

    // Find all
    function findAll() {
        // Check pagination            
        _findQuery = _pageNumber === undefined ? Course.find().sort('name').limit(_pageSize)
            : Course.find().sort('name').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
        var countQuery = Course.count();

        // Execute the queries
        executeCountQuery(countQuery)
            .then(totalRecord => {
                executeFindQuery(totalRecord);
            })
            .catch(err => {
                logger.error("Error at function: CourseController.findAll", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Find by keyword
    function findByKeyword() {
        // escape special chars from keyword
        _keyword = stringHelper.escapeSpecialCharacters(_keyword);
        // Check pagination
        _findQuery = _pageNumber === undefined ? Course.find({ 'name': { $regex: new RegExp(_keyword, "i") } }).sort('name').limit(_pageSize)
            : Course.find({ 'name': { $regex: new RegExp(_keyword, "i") } }).sort('name').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
        var countQuery = Course.count({ 'name': { $regex: new RegExp(_keyword, "i") } });

        // Execute the queries
        executeCountQuery(countQuery)
            .then(totalRecord => {
                executeFindQuery(totalRecord);
            })
            .catch(err => {
                logger.error("Error at function: CourseController.findAll->findByKeyword", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Find by category
    function findByCategory() {
        getSubByCategoryId()
            .then(subcate_ids => {
                // Check pagination
                _findQuery = _pageNumber === undefined ? Course.find({ $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('name').limit(_pageSize)
                    : Course.find({ $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('name').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
                var countQuery = Course.count({ $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] });

                // Execute the queries
                executeCountQuery(countQuery)
                    .then(totalRecord => {
                        executeFindQuery(totalRecord);
                    })
                    .catch(err => {
                        logger.error("Error at function: CourseController.findAll->findByCategory", err);
                        return res.send({ code: 400, message: "Data not found!" });
                    })
            })
            .catch(err => {
                logger.error("Error at function: CourseController.findAll->findByCategory", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Find by keyword & category
    function findByKeywordAndCategory() {
        // escape special chars from keyword
        _keyword = stringHelper.escapeSpecialCharacters(_keyword);
        getSubByCategoryId()
            .then(subcate_ids => {
                // Check pagination
                _findQuery = _pageNumber === undefined ? Course.find({ 'name': { $regex: new RegExp(_keyword, "i") }, $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('name').limit(_pageSize)
                    : Course.find({ 'name': { $regex: new RegExp(_keyword, "i") }, $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('name').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
                var countQuery = Course.count({ 'name': { $regex: new RegExp(_keyword, "i") }, $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] });

                // Execute the queries
                executeCountQuery(countQuery)
                    .then(totalRecord => {
                        executeFindQuery(totalRecord);
                    })
                    .catch(err => {
                        logger.error("Error at function: CourseController.findAll->findByKeywordAndCategory", err);
                        return res.send({ code: 400, message: "Data not found!" });
                    })
            })
            .catch(err => {
                logger.error("Error at function: CourseController.findAll->findByKeywordAndCategory", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Get subcates by categoryId
    function getSubByCategoryId() {
        return new Promise((resolve, reject) => {
            Category.find({ tree: _categoryId }).select('_id').exec()
                .then(result => {
                    // Filter to get clean array of id
                    var subcate_ids = result.map(x => x._id);
                    resolve(subcate_ids);
                })
                .catch(err => {
                    return reject(err);
                })
        })
    }

    // Execute the count query
    function executeCountQuery(query) {
        return new Promise((resolve, reject) => {
            query.exec((err, data) => {
                if (err) return reject(err);
                if (!data) return resolve(0);
                resolve(data);
            })
        });
    }

    // Execute the find query
    function executeFindQuery(totalRecord) {
        // selecting fields
        //_findQuery.select('keyword kaudio transcription categoryid category description daudio daudios image images video videos quiz');

        _findQuery.exec(function (err, data) {
            if (err) {
                // Log the error
                logger.error("Error at function: CourseController.findAll-> executeQuery", err);
                return res.send({ code: 400, message: "Data not found!" });
            }
            if (!data) {
                return res.send({ code: 200, message: [] });
            }
            res.send({
                code: 200, message: data, pagination:
                    { currentPage: _pageNumber, totalPage: Math.ceil(totalRecord / _pageSize) }
            });
        });
    }
};

/* --------------------------------------------------------------------- */
/*  UPDATE AN COURSE IDENTIFIED BY THE COURSEID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.update = (req, res) => {
    var courseId = req.body._id || req.params.courseId;
    Course.findByIdAndUpdate(courseId, {
        name: req.body.name,
        categoryid: req.body.categoryid,
        category: req.body.category,
        description: req.body.description,
        author: req.body.author,
        images: req.body.images,
        url: req.body.url.replace(/ /g, "%20"),
        favouriteCount: req.body.favouriteCount,
        enrollmentCount: req.body.enrollmentCount,
        status: req.body.status
    }, { new: true })
        .then(data => {
            if (!data) {
                // Log the error
                logger.error("Can not update Course with id " + req.params.courseId);
                return res.status(404).send({ code: 400, message: "Course not found with id " + req.params.courseId });
            }
            res.send({ code: 200, message: data });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Course->update", err);
            if (err.kind === 'ObjectId') {
                return res.status(404).send({ code: 400, message: "Course not found with id " + req.params.courseId });
            }
            return res.status(500).send({ code: 400, message: "Error updating Course with id " + req.params.courseId });
        });
};

/* --------------------------------------------------------------------- */
/*  DELETE A COURSE WITH THE SPECIFIED COURSEID IN THE REQUEST
/* --------------------------------------------------------------------- */
exports.delete = (req, res) => {
    Course.findByIdAndRemove(req.params.courseId)
        .then(data => {
            if (!data) {
                // Log the error
                logger.error("Can not update Course with id " + req.params.courseId);
                return res.status(404).send({ code: 400, message: "Course not found with id " + req.params.courseId });
            }
            res.send({ code: 200, message: "Course deleted successfully!" });
        })
        .catch(err => {
            // Log the error
            logger.error("Error at function: Course->delete", err);
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({ code: 400, message: "Course not found with id " + req.params.courseId });
            }
            return res.status(500).send({ code: 400, message: "Could not delete Course with id " + req.params.courseId });
        });
};
