/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');
const Category = require('../models/category.model.js');
const CateCache = require('../models/catecache.model.js');
const Dictionary = require('../models/dictionary.model.js');
const Translate = require('../models/translate.model.js');
const logger = require('../common/logger.common.js');
const decode = require('unescape');
const googleTTS = require('google-tts-api');// Prepare the google translate object
const Transaction = require('mongoose-transactions')

/* --------------------------------------------------------------------- */
/* COMMON FUNCTIONS
/* --------------------------------------------------------------------- */

// Check exist Dictionary by keyword
function checkExistDictionary(keyword) {
    return new Promise((resolve, reject) => {
        var query = Dictionary.find({ 'keyword': { $regex: new RegExp('^' + keyword + '$', "i") } });
        query.select('keyword');

        // execute the query
        query.exec(function (err, data) {
            if (err) reject(err);
            if (data.length <= 0) resolve(false); // not existed                
            else resolve(true); //existed
        });
    });
}

// Get audio for the keyword
function getKeywordAudio(keyword) {
    return new Promise((resolve, reject) => {
        // Call to google translate service to get audio for the keyword (kurl)
        googleTTS(keyword, "en", 1) // speed normal = 1 (default), slow = 0.24
            // Got k-audio link   
            .then(kurl => { resolve(kurl); })
            .catch(err => { reject(err); });
    });
}

// Get audio for the description
function getDescriptionAudio(kurl, description) {
    return new Promise((resolve, reject) => {
        // Get the d-audio link
        /// Validate the length of the description
        var _description = description;
        _description = _description.length >= 200 ? _description.substring(0, 199) : _description;
        googleTTS(_description, "en", 1) // speed normal = 1 (default), slow = 0.24
            // Got the d-audio link
            .then(durl => { resolve({ kurl: kurl, durl: durl }); })
            .catch(err => { reject(err); });
    });
}

/* --------------------------------------------------------------------- */
/* BULK CREATE OR UPDATE
/* --------------------------------------------------------------------- */
function bulkCreateOrUpdateDictionary(req, res) {
    var inputDictionaries = req.body;
    var i = 0;
    var transaction = new Transaction(true);

    // Validate input
    // Check empty
    if (!inputDictionaries.length) return res.send({ code: 400, message: "Invalid input data!" });
    // Check duplicate


    // Check all input Keywords then insert or update to the db
    var dictionary = inputDictionaries[i];
    // Correct input data
    dictionary.keyword = dictionary.keyword.trim();
    dictionary.description = dictionary.description.trim();
    // Check exist & prepare the transaction
    checkExist(dictionary, transaction)
        .then(result => {
            // On checking done
            console.log("On finish checking existence of Dictionary");
        })
        .catch(err => {
            logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->checkExistAndPrepareTransaction", err);
            return onTransactionError();
        })

    // Start executing the transaction
    function finishTransaction() {
        transaction.run()
            .then(result => {
                //console.log(result);
                res.send({ code: 200, message: "All the dictionary were saved or updated" });
                transaction.clean();
            })
            .catch(err => {
                transaction.rollback().catch(console.error);
                transaction.clean();
            })
    }

    // onCompletePrepareTransaction
    function onCompletePrepareTransaction() {
        i = i + 1;
        if (i < inputDictionaries.length) {
            // Continue with the orther dictionary in the input list            
            dictionary = inputDictionaries[i];
            // Check exist & prepare the transaction            
            checkExist(dictionary, transaction)
                .then(result => {
                    // On checking done
                    console.log("On finish checking existence of Dictionary", result);
                })
                .catch(err => {
                    logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->checkExistAndPrepareTransaction", err);
                    return onTransactionError();
                })
        } else {
            return finishTransaction();
        }
    }

    // Send error to client
    function onTransactionError(err) {
        logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->onTransactionError", err);
        res.send({ code: 400, message: "Can not save or update dictionaries" });
    }

    // Check exist dictionary to insert or update
    function checkExist(dictionary, transaction) {
        return new Promise((resolve, reject) => {
            var _keyword = dictionary.keyword.trim().toLowerCase();
            var query = Dictionary.find({ 'keyword': { $regex: new RegExp('^' + _keyword + '$', "i") } });

            // execute the query
            query.exec(function (err, dictionaries) {
                if (err) reject(err);
                if (dictionaries.length <= 0) { // Case of create new                    
                    prepareDictionaryAndTransaction(dictionary, transaction, false)
                        .then(result => {
                            setTimeout(onCompletePrepareTransaction, config.translate.delay);
                        })
                        .catch(err => {
                            logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->checkExistAndPrepareTransaction(Insert)", err);
                            onTransactionError(err);
                        })
                } else { // Case of update existing object
                    dictionary._id = dictionaries[0]._id; // Get the existed object'is and pass to the new dictionary (using for later update)
                    prepareDictionaryAndTransaction(dictionary, transaction, true)
                        .then(result => {
                            setTimeout(onCompletePrepareTransaction, config.translate.delay);
                        })
                        .catch(err => {
                            logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->checkExistAndPrepareTransaction(Update)", err);
                            onTransactionError(err);
                        })
                }
                resolve(dictionaries);
            });
        });
    }

    // Prepare the dictionary to insert/update
    function prepareDictionaryAndTransaction(dictionary, transaction, isUpdate) {
        return new Promise((resolve, reject) => {
            getKeywordAudio(dictionary.keyword)
                .then(kurl => {
                    getDescriptionAudio(kurl, dictionary.description)
                        .then(urls => {
                            // Finish getting audios --> Update the urls to dictionary object
                            dictionary.kaudio = urls.kurl;
                            dictionary.daudio = urls.durl;
                            dictionary.daudios = [urls.durl]; // HASHCODE <---------
                            //resolve(dictionary);
                            // Check condition to prepare corresponding transaction
                            if (!isUpdate) transaction.insert('Dictionary', dictionary);
                            else transaction.update('Dictionary', dictionary._id, dictionary);
                            resolve(dictionary);
                        })
                        .catch(err => {
                            logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->getDescriptionAudio", err);
                            reject(err);
                        })
                })
                .catch(err => {
                    logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->getKeywordAudio", err);
                    reject(err);
                })
        })
    }
}
exports.bulkCreateOrUpdateDictionary = bulkCreateOrUpdateDictionary;

/* --------------------------------------------------------------------- */
/* CREATE DICTIONARY
/* --------------------------------------------------------------------- */
function createDictionary(req, res) {
    // Step by step get data then save to the database using Promise (.then)
    checkExistDictionary(req.body.keyword.trim().toLowerCase())
        .then(existed => {
            if (!existed) {
                getKeywordAudio(req.body.keyword.trim().toLowerCase())
                    .then(kurl => {
                        getDescriptionAudio(kurl, req.body.description)
                            .then(urls => { saveDictionary(urls); })
                            .catch(err => {
                                logger.error("Error at function: DictionaryController.create->getDescriptionAudio", err);
                                res.send({ code: 400, message: "Can not create the Dictionary" });
                            })
                    })
                    .catch(err => {
                        logger.error("Error at function: DictionaryController.create->getKeywordAudio", err);
                        res.send({ code: 400, message: "Can not create the Dictionary" });
                    })
            } else { res.send({ code: 400, message: "Keyword is already existed" }); }
        })
        .catch(err => {
            logger.error("Error at function: DictionaryController.create->createDictionary->checkExist", err);
            res.send({ code: 400, message: "Can not create the Dictionary" });
        })

    // Save dictionary object to the db
    function saveDictionary(urls) {
        // Create a Dictionary object
        var dictionary = new Dictionary({
            keyword: req.body.keyword.trim(),
            kaudio: urls.kurl,
            transcription: req.body.transcription.trim(),
            categoryid: req.body.categoryid,
            category: req.body.category,
            description: req.body.description,
            daudio: urls.durl,
            daudios: [urls.durl], // HASHCODE <---------------
            image: req.body.image.replace(/ /g, "%20"),
            images: req.body.images,
            video: req.body.video.replace(/ /g, "%20"),
            vdieos: req.body.videos,
            quiz: req.body.quiz.replace(/ /g, "%20"),
            translation: req.body.translation
        });

        // Save Dictionary in the database
        dictionary.save()
            .then(data => { res.send({ code: 200, message: data }); })
            .catch(err => {
                // Log the error 
                logger.error("Error while saving dictionary to the database", err);
                res.send({ code: 400, message: err });
            });
    }
};
// Export function
exports.create = createDictionary;

/* --------------------------------------------------------------------- */
/* RETRIEVE AND RETURN DICTIONARIES FROM THE DATABASE BY CONDITIONS
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
        _findQuery = _pageNumber === undefined ? Dictionary.find().sort('keyword').limit(_pageSize)
            : Dictionary.find().sort('keyword').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
        var countQuery = Dictionary.count();

        // Execute the queries
        executeCountQuery(countQuery)
            .then(totalRecord => {
                executeFindQuery(totalRecord);
            })
            .catch(err => {
                logger.error("Error at function: DictionaryController.findAll", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Find by keyword
    function findByKeyword() {
        // Check pagination
        _findQuery = _pageNumber === undefined ? Dictionary.find({ 'keyword': { $regex: new RegExp(_keyword, "i") } }).sort('keyword').limit(_pageSize)
            : Dictionary.find({ 'keyword': { $regex: new RegExp(_keyword, "i") } }).sort('keyword').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
        var countQuery = Dictionary.count({ 'keyword': { $regex: new RegExp(_keyword, "i") } });

        // Execute the queries
        executeCountQuery(countQuery)
            .then(totalRecord => {
                executeFindQuery(totalRecord);
            })
            .catch(err => {
                logger.error("Error at function: DictionaryController.findAll->findByKeyword", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Find by category
    function findByCategory() {
        getCateCacheByCategory()
            .then(catecaches => {
                // Check pagination
                _findQuery = _pageNumber === undefined ? Dictionary.find({ 'categoryid': { $in: catecaches } }).sort('keyword').limit(_pageSize)
                    : Dictionary.find({ 'categoryid': { $in: catecaches } }).sort('keyword').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
                var countQuery = Dictionary.count({ 'categoryid': { $in: catecaches } });

                // Execute the queries
                executeCountQuery(countQuery)
                    .then(totalRecord => {
                        executeFindQuery(totalRecord);
                    })
                    .catch(err => {
                        logger.error("Error at function: DictionaryController.findAll->findByCategory", err);
                        return res.send({ code: 400, message: "Data not found!" });
                    })
            })
            .catch(err => {
                logger.error("Error at function: DictionaryController.findAll->findByCategory", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Find by keyword & category
    function findByKeywordAndCategory() {
        getCateCacheByCategory()
            .then(catecaches => {
                // Check pagination
                _findQuery = _pageNumber === undefined ? Dictionary.find({ 'keyword': { $regex: new RegExp(_keyword, "i") }, 'categoryid': { $in: catecaches } }).sort('keyword').limit(_pageSize)
                    : Dictionary.find({ 'keyword': { $regex: new RegExp(_keyword, "i") }, 'categoryid': { $in: catecaches } }).sort('keyword').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
                var countQuery = Dictionary.count({ 'keyword': { $regex: new RegExp(_keyword, "i") }, 'categoryid': { $in: catecaches } });

                // Execute the queries
                executeCountQuery(countQuery)
                    .then(totalRecord => {
                        executeFindQuery(totalRecord);
                    })
                    .catch(err => {
                        logger.error("Error at function: DictionaryController.findAll->findByKeywordAndCategory", err);
                        return res.send({ code: 400, message: "Data not found!" });
                    })
            })
            .catch(err => {
                logger.error("Error at function: DictionaryController.findAll->findByKeywordAndCategory", err);
                return res.send({ code: 400, message: "Data not found!" });
            })
    }

    // Get catecaches by categoryId
    function getCateCacheByCategory() {
        return new Promise((resolve, reject) => {
            CateCache.findOne({ 'key': _categoryId }).exec((err, data) => {
                if (err) return reject(err);
                if (!data) return reject(err);
                resolve(data.value);
            })
        });
    }

    // Execute the count query
    function executeCountQuery(query) {
        return new Promise((resolve, reject) => {
            query.exec((err, data) => {
                if (err) return reject(err);
                if (!data) return reject(err);
                resolve(data);
            })
        });
    }

    // Execute the find query
    function executeFindQuery(totalRecord) {
        // selecting fields
        _findQuery.select('keyword kaudio transcription categoryid category description daudio daudios image images video videos quiz');

        _findQuery.exec(function (err, data) {
            if (err) {
                // Log the error
                logger.error("Error at function: DictionaryController.findAll-> executeQuery", err);
                return res.send({ code: 400, message: "Data not found!" });
            }
            if (!data) {
                return res.send({ code: 400, message: "Data not found!" });
            }
            res.send({
                code: 200, message: data, pagination:
                    { currentPage: _pageNumber, totalPage: Math.ceil(totalRecord / _pageSize) }
            });
        });
    }
};

/* --------------------------------------------------------------------- */
/* FIND A SINGLE DICTIONARY WITH A ID
/* --------------------------------------------------------------------- */
exports.findOne = (req, res) => {
    Dictionary.findById(req.params.dictionaryId)
        .then(data => {
            if (!data) { return res.status(404).send({ code: 400, message: "Dictionary not found with id " + req.params.dictionaryId }); }
            res.send({ code: 200, message: data });
        }).catch(err => {
            if (err.kind === 'ObjectId') { return res.status(404).send({ code: 400, message: "Dictionary not found with id " + req.params.dictionaryId }); }
            return res.status(500).send({ code: 400, message: "Error retrieving Dictionary with id " + req.params.dictionaryId });
        });
};

/* --------------------------------------------------------------------- */
/* FIND DICTIONARY WITH KEYWORD
/* --------------------------------------------------------------------- */
exports.findByKeyword = (req, res) => {
    // find by key word
    var _keyword = req.params.keyword.trim().toLowerCase();
    var query = Dictionary.find({ 'keyword': { $regex: new RegExp(_keyword, "i") } });

    // selecting fields
    query.select('keyword kaudio transcription categoryid category description daudio daudios image images video videos quiz');

    // execute the query at a later time
    query.exec(function (err, data) {
        if (err) return res.status(500).send({ code: 400, message: "Error retrieving Dictionary with keyword " + _keyword });
        if (!data) { return res.status(404).send({ code: 400, message: "Dictionary not found with keyword " + _keyword }); }
        res.send({ code: 200, message: data });
    });
}

/* --------------------------------------------------------------------- */
/* FIND WORD BY KEY WORD AND LANGUAGE-CODE
/* --------------------------------------------------------------------- */
exports.translateTo = (req, res) => {
    // find by key word
    var _keyword = req.query.keyword.trim().toLowerCase();
    var _languageCode = req.query.country.trim().toLowerCase();

    // Call to google translate service to get data then save to the local db
    //var query = Dictionary.findOne({ 'keyword': _keyword });
    //var query = Dictionary.findOne({ 'keyword': { $regex: new RegExp(_keyword, "i") } });
    var query = Dictionary.findOne({ 'keyword': { $regex: new RegExp(_keyword, "i") } });

    // prepare translated object
    var _translated = new Translate({
        keyword: req.query.keyword.trim(),
        code: _languageCode,
        translated: {
            word: "",
            waudio: "",
            category: "",
            description: "",
            daudio: "",
            daudios: [],
            image: "",
            images: [],
            video: "",
            videos: [],
            quiz: ""
        }
    });

    // selecting fields
    query.select('keyword kaudio transcription categoryid category description daudio daudios image images video videos quiz');

    // execute the query at a later time
    query.exec(function (err, dictionary) {
        if (err) return res.status(500).send({
            code: 400,
            message: "Error retrieving Dictionary with keyword " + _keyword
        });
        if (!dictionary) {
            return res.status(404).send({
                code: 400,
                message: "Dictionary not found with keyword " + _keyword
            });
        }

        // Check if the word/phrase is already existed in the db
        var query = Translate.find({ 'keyword': { $regex: new RegExp(_keyword, "i") }, 'code': _languageCode });

        // execute the query
        query.exec(function (err, data) {

            if (data.length == 0) {
                // put data to the translate object
                _translated.translated.image = dictionary.image;
                _translated.translated.images = dictionary.images;
                _translated.translated.video = dictionary.video;
                _translated.translated.videos = dictionary.videos;
                _translated.translated.quiz = dictionary.quiz;
                // get category in string here

                // translate keyword first
                var q = dictionary.keyword;
                var source = "en";
                var target = _languageCode;
                var key = "AIzaSyCPOsaGBuHbEpaAcnGHvEioaLZS7lbKHok" //hashcode;
                var request = require('request');
                // Configure the request
                var options = {
                    url: config.translate.url,
                    method: 'GET',
                    qs: { 'q': q, 'source': source, 'target': target, 'key': key }
                }

                // Start the request       
                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        // Print out the response body
                        //console.log(body)
                        var result = JSON.parse(decode(body));
                        //logger.info("translate keyword", result);

                        //res.send({
                        //    code: 200,
                        //    message: JSON.parse(body)
                        //});

                        // grab translated-word and put to the translated object
                        _translated.translated.word = result.data.translations[0].translatedText;
                        // then continue tranlate category
                        q = dictionary.category;
                        options.qs.q = q;
                        // Start the request
                        request(options, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                // Print out the response body
                                //console.log(body)
                                var result = JSON.parse(decode(body));
                                //logger.info("translate category", result);
                                // grab translated-category and put to the translated object
                                //_translated.translated.category = result.data.translations[0].translatedText.replace(/&gt;/g,">");
                                _translated.translated.category = result.data.translations[0].translatedText;

                                // then continue tranlate the descripton
                                q = dictionary.description;
                                options.qs.q = q;
                                // Start the request
                                request(options, function (error, response, body) {
                                    if (!error && response.statusCode == 200) {
                                        // Print out the response body
                                        //console.log(body)
                                        var result = JSON.parse(decode(body));
                                        //logger.info("translate descripton", result);
                                        // grab translated-descripton and put to the translated object
                                        //_translated.translated.descripton = result.data.translations[0].translatedText.replace(/&gt;/g,">");
                                        _translated.translated.description = result.data.translations[0].translatedText;

                                        // save the translate object
                                        // Save Dictionary in the database
                                        // Check exist befor save
                                        _translated.save()
                                            .then(data => {
                                                // log info
                                                //logger.info("translate obj is saved", _translated);
                                                // then return result to client
                                                res.send({
                                                    code: 200,
                                                    message: [data]
                                                });
                                            }).catch(err => {
                                                // log error
                                                logger.error(err.message);
                                                res.status(500).send({
                                                    code: 400,
                                                    message: err.message || "Some error occurred while creating the Dictionary."
                                                });
                                            });
                                    }///
                                });///
                            }///
                        });///
                    }
                    else {
                        logger.error(error);
                        res.send({
                            code: 400,
                            message: error
                        });
                    }
                })
            }
            if (data.length > 0) {
                // if the keyword is existed already        
                res.send({
                    code: 200,
                    message: data
                });
            }
        });
    });
}

// Update a Dictionary identified by the dictionaryId in the request
exports.update = (req, res) => {
    // Validate Request
    //if(!req.body.content) {
    //    return res.status(400).send({
    //        message: "Note content can not be empty"
    //    });
    //}

    // Find Dictionary and update it with the request body
    Dictionary.findByIdAndUpdate(req.params.dictionaryId, {
        keyword: req.body.keyword.trim(),
        kaudio: req.body.kaudio,
        transcription: req.body.transcription,
        categoryid: req.body.categoryid,
        category: req.body.category,
        description: req.body.description,
        daudio: req.body.daudio,
        daudios: req.body.daudios,
        image: req.body.image.replace(/ /g, "%20"),
        images: req.body.images,
        video: req.body.video.replace(/ /g, "%20"),
        videos: req.body.videos,
        quiz: req.body.quiz.replace(/ /g, "%20"),
        translation: req.body.translation
    }, { new: true })
        .then(data => {
            if (!data) {
                return res.status(404).send({
                    code: 400,
                    message: "Dictionary not found with id " + req.params.dictionaryId
                });
            }
            res.send({ code: 200, message: data });
        }).catch(err => {
            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    code: 400,
                    message: "Dictionary not found with id " + req.params.dictionaryId
                });
            }
            return res.status(500).send({
                code: 400,
                message: "Error updating Dictionary with id " + req.params.dictionaryId
            });
        });
};

// Delete a Dictionary with the specified dictionaryId in the request
exports.delete = (req, res) => {
    Dictionary.findByIdAndRemove(req.params.dictionaryId)
        .then(data => {
            if (!data) {
                return res.status(404).send({
                    code: 400,
                    message: "Dictionary not found with id " + req.params.dictionaryId
                });
            }
            res.send({ code: 200, message: "Dictionary deleted successfully!" });
        }).catch(err => {
            // Log the error
            logger.error("Error while deleting dictionary by id", err);
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({
                    code: 400,
                    message: "Dictionary not found with id " + req.params.dictionaryId
                });
            }
            return res.status(500).send({
                code: 400,
                message: "Could not delete Dictionary with id " + req.params.dictionaryId
            });
        });
};

// Get audio from google translate service
exports.getAudioGT = (req, res) => {
    var text = req.query.text;
    var country = req.query.country;

    googleTTS(text, country, 1) // speed normal = 1 (default), slow = 0.24
        .then(function (url) { res.send({ code: 200, message: url }); })
        .catch(function (err) {
            // Log the error
            logger.error("Error while calling google's service to translate text", err);
            res.send({ code: 400, message: err });
        });
}

// Get text from google translate service
exports.getTextGT = (req, res) => {
    var q = req.query.q;
    var source = req.query.source;
    var target = req.query.target;

    var request = require('request');
    // Configure the request
    var options = {
        url: config.translate.url,
        method: 'GET',
        qs: { 'q': q, 'source': source, 'target': target, 'key': config.translate.key }
    }

    // Start the request
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send({ code: 200, message: JSON.parse(body) });
        }
        else {
            // Log the error
            logger.error("Error while calling google's service to translate text", error);
            res.send({ code: 400, message: error.message });
        }
    })
}