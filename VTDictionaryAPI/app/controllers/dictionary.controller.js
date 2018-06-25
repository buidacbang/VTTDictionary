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
const Transaction = require('mongoose-transactions');
const googleTTS = require("../../app/common/google-tts.common.js");
const stringHelper = require("../../app/common/string-helper.common.js");
const events = require('events');

/* --------------------------------------------------------------------- */
/* DEFINE EVENTS
/* --------------------------------------------------------------------- */

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
    return googleTTS.getAudioUrls(keyword, config.app.originalLanguage)
        .then(result => {
            var returnUrls = result.map(x => x.url);
            return returnUrls[0];
        })
        .catch(err => { throw err; })
}

// Get audio for the description
function getDescriptionAudio(kurl, description) {
    return new Promise((resolve, reject) => {
        if (String.isNullOrEmpty(description)) return resolve({ kurl: kurl, durl: [] });
        googleTTS.getAudioUrls(description, config.app.originalLanguage)
            .then(result => {
                var returnUrls = result.map(x => x.url);
                resolve({ kurl: kurl, durl: returnUrls });
            })
            .catch(err => {
                reject(err);
            })
    })
}

/* --------------------------------------------------------------------- */
/* BULK CREATE OR UPDATE
/* --------------------------------------------------------------------- */
exports.bulkInsertOrUpdate = (req, res) => {
    var localEvent = new events.EventEmitter();
    var BulkEvent = { FINISH_CHECK: "finish-check" };
    var inputDicts = {};
    const maxCheckCount = 2;
    var taskCount = 0;

    // Verify and insert/update dictionary one by one
    req.body.forEach(dict => {
        // Validate input data here
        delete dict._id;
        inputDicts[dict.keyword] = dict;
        // 1.Check exist dict by keyword
        Dictionary.find({ 'keyword': { $regex: new RegExp('^' + stringHelper.escapeSpecialCharacters(dict.keyword) + '$', "i") } })
            .then(data => {
                // Get the input dict & update data
                inputDict = inputDicts[dict.keyword];
                // Grab the _id using for update later
                if (data.length > 0) inputDict._id = data[0]._id;
                // Fire finish check event             
                localEvent.emit(BulkEvent.FINISH_CHECK, inputDict.keyword);
            })
            .catch(err => {
                // Grab the error
                inputDict = inputDicts[dict.keyword];
                inputDict.err = err;
                // Fire finish check event             
                localEvent.emit(BulkEvent.FINISH_CHECK, inputDict.keyword);
                // Log the error
                logger.error('Error at function: Dictionary.bulkInsertOrUpdate -> find', err, dict);
            })
        // 2.Get k-audio
        googleTTS.getAudioUrls(dict.keyword, config.app.originalLanguage)
            .then(urls => {
                // Get the input dict & update data
                inputDict = inputDicts[dict.keyword];
                var returnUrls = urls.map(x => x.url);
                inputDict.kaudio = returnUrls[0];
                localEvent.emit(BulkEvent.FINISH_CHECK, inputDict.keyword);
            })
            .catch(err => {
                // Get the err
                inputDict = inputDicts[dict.keyword];
                inputDict.err = err;
                // Fire finish check event             
                localEvent.emit(BulkEvent.FINISH_CHECK, inputDict.keyword);
                // Log the error
                logger.error('Error at function: Dictionary.bulkInsertOrUpdate -> get k-audio', err, dict);
            })
        // 3.Get d-audio
        googleTTS.getAudioUrls(dict.description, config.app.originalLanguage)
            .then(urls => {
                // Get the input dict & update data
                inputDict = inputDicts[dict.keyword];
                var returnUrls = urls.map(x => x.url);
                inputDict.daudios = returnUrls;
                // Fire finish check event             
                localEvent.emit(BulkEvent.FINISH_CHECK, inputDict.keyword);
            })
            .catch(err => {
                // Get the err
                inputDict = inputDicts[dict.keyword];
                inputDict.err = err;
                // Fire finish check event             
                localEvent.emit(BulkEvent.FINISH_CHECK, inputDict.keyword);
                // Log the error
                logger.error('Error at function: Dictionary.bulkInsertOrUpdate -> get d-audio', err, dict);
            })
    });

    // HANDLE THE EVENTS
    // On finish all task -> Save/Update the dictionary to the DB
    localEvent.on(BulkEvent.FINISH_CHECK, (keyword => {
        var dict = inputDicts[keyword];
        dict.checkCount = dict.checkCount === undefined ? 0 : ++dict.checkCount;
        if ((dict.checkCount < maxCheckCount) || dict.err || dict.isFinished) return;

        // Check insert/update       
        if (!dict._id) {
            // Case of insert
            Dictionary.create(dict)
                .then(result => {
                    // UPDATE PROGRESS TO CLIENT HERE
                    dict.isFinished = true;
                    if (++taskCount == Object.keys(inputDicts).length) res.send(inputDicts);
                })
                .catch(err => {
                    // Log the error 
                    logger.error('Error at function: Dictionary.bulkInsertOrUpdate -> save dictionary', err, dict);
                    dict.isFinished = true;
                    dict.err = err;
                    if (++taskCount == Object.keys(inputDicts).length) res.send(inputDicts);
                });
        } else {
            // Case of update
            Dictionary.findByIdAndUpdate(dict._id, dict)
                .then(result => {
                    // UPDATE PROGRESS TO CLIENT HERE
                    dict.isFinished = true;
                    if (++taskCount == Object.keys(inputDicts).length) res.send(inputDicts);
                })
                .catch(err => {
                    // Log the error 
                    logger.error('Error at function: Dictionary.bulkInsertOrUpdate -> update dictionary', err, dict);
                    dict.isFinished = true;
                    dict.err = err;
                    if (++taskCount == Object.keys(inputDicts).length) res.send(inputDicts);
                });
        }
    }));
}

function bulkCreateOrUpdateDictionary(req, res) { // RECREATE THIS FUNCTION -> NON-BLOCKING & EVENT BASED
    var inputDictionaries = req.body;
    var i = 0;
    var transaction = new Transaction();

    // Validate input
    // Check empty
    if (!inputDictionaries.length) return res.send({ code: 400, message: "Invalid input data!" });
    // Check duplicate keyword in the input array

    // Check all input Keywords then insert or update to the db
    var dictionary = inputDictionaries[i];
    // Correct input data
    dictionary.keyword = dictionary.keyword.trim();
    dictionary.description = dictionary.description.trim();
    if (!String.isNullOrEmpty(dictionary.images)) {
        dictionary.images = dictionary.images.split(',');
    } else {
        dictionary.images = [];
    }
    //if (!String.isNullOrEmpty(dictionary.videos)) {
    //dictionary.videos = dictionary.videos.split(',');
    //} else {
    dictionary.videos = [];
    //}    
    // Check exist & prepare the transaction
    checkExist(dictionary, transaction)
        .then(dictionaries => {
            onFinishCheckingExist(dictionaries);
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
                transaction.clean();
                res.send({ code: 200, message: "All the dictionary were saved or updated" });
            })
            .catch(err => {
                transaction.rollback()
                    .then(result => {
                        transaction.clean();
                    })
                    .catch(err => {
                        transaction.clean();
                        logger.error("Error occurs while rolling back the transaction: ", err);
                    })
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
                .then(dictionaries => { onFinishCheckingExist(dictionaries); })
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
            var _keyword = dictionary.keyword.trim();
            // escape special chars from keyword
            _keyword = stringHelper.escapeSpecialCharacters(_keyword);
            var query = Dictionary.find({ 'keyword': { $regex: new RegExp('^' + _keyword + '$', "i") } });
            //var query = Dictionary.find({ 'keyword': _keyword });

            // execute the query
            query.exec(function (err, dictionaries) {
                if (err) reject(err);
                resolve(dictionaries);
            });
        });
    }

    function onFinishCheckingExist(dictionaries) {
        // On checking done
        console.log("On finish checking existence of Dictionary", dictionaries);
        if (dictionaries.length > 0) { // Case of update existing object
            dictionary._id = dictionaries[0]._id; // Get the existed object'is and pass to the new dictionary (using for later update)
        }

        prepareDictionaryAndTransaction(dictionary, transaction, dictionaries.length > 0)
            .then(result => {
                setTimeout(onCompletePrepareTransaction, config.translate.delay);
            })
            .catch(err => {
                logger.error("Error at function: DictionaryController.bulkCreateOrUpdateDictionary->checkExistAndPrepareTransaction", err);
                onTransactionError(err);
            })
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
                            dictionary.daudios = urls.durl;
                            //resolve(dictionary);
                            dictionary.videos = [];
                            // Check condition to prepare corresponding transaction
                            if (isUpdate == false) { // Insert new object
                                transaction.insert(config.modelName.dictionary, dictionary);

                            } else { // Update
                                transaction.update(config.modelName.dictionary, dictionary._id, dictionary);
                            }
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
            daudio: urls.durl[0],
            daudios: urls.durl,
            image: req.body.image.replace(/ /g, "%20"), //USE URL ENCODE HERE
            images: req.body.images,
            video: req.body.video.replace(/ /g, "%20"),//USE URL ENCODE HERE
            vdieos: req.body.videos,
            quiz: req.body.quiz.replace(/ /g, "%20"),//USE URL ENCODE HERE
            translation: req.body.translation
        });

        // Create transaction here to save Dictionary & Update totalGlossary in Category
        var transaction = new Transaction();
        // Prepare the queries
        // 1. Save Dict
        transaction.insert(config.modelName.dictionary, dictionary);
        // 2. Increase totalGlossary in all relevant categories
        // Cheats -> Using the catecache to get relevant categories
        CateCache.find({ value: dictionary.categoryid })
            .then(catecaches => {
                // Validate data
                if (catecaches.length > 0) {
                    // Prepare the queries and add to the transaction
                    catecaches.forEach(catecache => {
                        // Get the corresponding categories
                        transaction.update(config.modelName.category, catecache.key, { $inc: { totalGlossary: 1 } }, { new: true });
                    });
                    // Commit the transaction
                    transaction.run()
                        .then(result => {
                            transaction.clean();
                            return res.send({ code: 200, message: dictionary });
                        })
                        .catch(err => { // On transaction error
                            transaction.rollback()
                                .then(result => {
                                    transaction.clean();
                                })
                                .catch(err => {
                                    transaction.clean();
                                    logger.error("Error occurs while rolling back the transaction: ", err);
                                })
                            return res.send({ code: 400, message: "Can not create the dictionary" });
                        })
                } else {
                    // Errors
                    logger.error("Error at function: DictionaryController.saveDictionary->CateCache.find()", "CateCaches not found!");
                    return res.send({ code: 400, message: "Can not create the dictionary" });
                }
            })
            .catch(err => {
                // Log the error 
                logger.error("Error at function: DictionaryController.saveDictionary->CateCache.find()", err);
            })

        // Save Dictionary in the database
        //dictionary.save()
        //    .then(data => {
        //        res.send({ code: 200, message: data });
        //    })
        //    .catch(err => {
        //        // Log the error 
        //        logger.error("Error while saving dictionary to the database", err);
        //        res.send({ code: 400, message: err });
        //    });
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
        // escape special chars from keyword
        _keyword = stringHelper.escapeSpecialCharacters(_keyword);
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
        getSubByCategoryId()
            .then(subcate_ids => {
                // Check pagination
                _findQuery = _pageNumber === undefined ? Dictionary.find({ $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('keyword').limit(_pageSize)
                    : Dictionary.find({ $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('keyword').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
                var countQuery = Dictionary.count({ $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] });

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
        // escape special chars from keyword
        _keyword = stringHelper.escapeSpecialCharacters(_keyword);
        getSubByCategoryId()
            .then(subcate_ids => {
                // Check pagination
                _findQuery = _pageNumber === undefined ? Dictionary.find({ 'keyword': { $regex: new RegExp(_keyword, "i") }, $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('keyword').limit(_pageSize)
                    : Dictionary.find({ 'keyword': { $regex: new RegExp(_keyword, "i") }, $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] }).sort('keyword').skip((_pageNumber - 1) * _pageSize).limit(_pageSize);
                var countQuery = Dictionary.count({ 'keyword': { $regex: new RegExp(_keyword, "i") }, $or: [{ 'categoryid': _categoryId }, { 'categoryid': { $in: subcate_ids } }] });

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

    // Get subcates by categoryId
    function getSubByCategoryId() {
        return new Promise((resolve, reject) => {
            Category.find({ tree: _categoryId }).select('_id').exec()
                .then(result => {
                    //if (result.length == 0) return reject("CateCache not found with key: " + _categoryId);
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
        _findQuery.select('keyword kaudio transcription categoryid category description daudio daudios image images video videos quiz');

        _findQuery.exec(function (err, data) {
            if (err) {
                // Log the error
                logger.error("Error at function: DictionaryController.findAll-> executeQuery", err);
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
exports.translate = (req, res) => {
    var _keyword = req.query.keyword.trim();
    _keyword = stringHelper.escapeSpecialCharacters(_keyword);
    var _languageCode = req.query.country.trim().toLowerCase();

    // Prepare the query to find Dictionary by keyword
    var query = Dictionary.findOne({ 'keyword': { $regex: new RegExp(_keyword, "i") } });

    // prepare translated object
    var _translated = new Translate({
        keyword: req.query.keyword.trim(),
        code: _languageCode,
        translated: { word: "", waudio: "", category: "", description: "", daudio: "", daudios: [], image: "", images: [], video: "", videos: [], quiz: "" }
    });

    // selecting fields
    query.select('keyword kaudio transcription categoryid category description daudio daudios image images video videos quiz');

    // execute the query to get the object
    query.exec(function (err, dictionary) {
        if (err) {
            logger.error("Error at function: Dictionary.translate: ", err);
            return res.status(500).send({ code: 400, message: "Error retrieving Dictionary with keyword " + _keyword });
        }
        if (!dictionary) {
            logger.error("Error at function: Dictionary.translate", "Dictionary not found with keyword " + _keyword);
            return res.status(404).send({ code: 400, message: "Dictionary not found with keyword " + _keyword });
        }

        // Check if the word/phrase is already translated
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

                // translate keyword first
                var q = dictionary.keyword;
                var source = 'ko';
                var target = _languageCode;
                var key = config.translate.key;
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

                                        // Get waudio
                                        googleTTS.getAudioUrls(_translated.translated.word, _languageCode)
                                            .then(result => {
                                                var returnUrls = result.map(x => x.url);
                                                _translated.translated.waudio = returnUrls[0];

                                                // Then continue get daudios
                                                googleTTS.getAudioUrls(_translated.translated.description, _languageCode)
                                                    .then(result => {
                                                        var returnUrls = result.map(x => x.url);
                                                        _translated.translated.daudio = returnUrls[0];
                                                        _translated.translated.daudios = returnUrls;

                                                        // save the translate object
                                                        // Save Dictionary in the database
                                                        // Check exist befor save
                                                        _translated.save()
                                                            .then(data => { res.send({ code: 200, message: [data] }); })
                                                            .catch(err => {
                                                                // log the error
                                                                logger.error("Error at function: Dictionary.transalte-> _translate.save()", err);
                                                                res.status(500).send({ code: 400, message: "Some error occurred while creating the Translate object." });
                                                            });
                                                    })
                                                    .catch(err => {
                                                        // log the error
                                                        logger.error("Error at function: Dictionary.transalte-> get daudios", err);
                                                        res.status(500).send({ code: 400, message: "Some error occurred while creating the Translate object." });
                                                    });
                                            })
                                            .catch(err => {
                                                // log the error
                                                logger.error("Error at function: Dictionary.transalte-> get waudio", err);
                                                res.status(500).send({ code: 400, message: "Some error occurred while creating the Translate object." });
                                            });
                                    }
                                });
                            }
                        });
                    }
                    else {
                        // log the error
                        logger.error("Error at function: Dictionary.transalte", err);
                        res.status(500).send({ code: 400, message: "Some error occurred while creating the Translate object." });
                    }
                })
            }
            if (data.length > 0) {
                // if the keyword is existed already        
                res.send({ code: 200, message: data });
            }
        });
    });
}

// Update a Dictionary identified by the dictionaryId in the request
exports.update = (req, res) => {
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