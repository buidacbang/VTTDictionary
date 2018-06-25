/////////////////////////// Author: tatdat ////////////////////////////////
module.exports = (app) => {

    /* --------------------------------------------------------------------- */
    /* LOAD EXTERNAL MODULES
    /* --------------------------------------------------------------------- */
    const categories = require('../controllers/category.controller.js');
    const catecaches = require('../controllers/catecache.controller.js');
    const languages = require('../controllers/language.controller.js');
    const dictionaries = require('../controllers/dictionary.controller.js');
    const translates = require('../controllers/translate.controller.js');
    const courses = require('../controllers/course.controller.js');
    const newwords = require('../controllers/newword.controller.js');
    const feedbacks = require('../controllers/feedback.controller.js');
    const settings = require('../controllers/setting.controller.js');

    /* --------------------------------------------------------------------- */
    /* USER
    /* --------------------------------------------------------------------- */
    // Create user
    app.post('/users', users.create);

    /* --------------------------------------------------------------------- */
    /* CATEGORY
    /* --------------------------------------------------------------------- */
    // Create a new Category
    app.post('/categories', categories.create);

    // Retrieve all Categories
    app.get('/categories', categories.findAll);

    // Retrieve a single Category with categoryId
    app.get('/categories/:categoryId', categories.findOne);

    // Retrievie child by parent id
    app.get('/subcategories/:parentId', categories.findChildByParentId);

    // Update a Category with categoryId
    app.put('/categories/:categoryId', categories.update);

    // Delete a Category with categoryId
    app.delete('/categories/:categoryId', categories.delete);

    // Calculate total item
    app.post('/categories/calculate-total-item', categories.calculateTotalItem);

    /* --------------------------------------------------------------------- */
    /* CATECACHE
    /* --------------------------------------------------------------------- */
    // Create a new CateCache
    app.post('/catecaches', catecaches.create);

    // Retrieve all CateCaches
    app.get('/catecaches', catecaches.findAll);

    // Retrieve a single CateCache with catecacheId
    app.get('/catecaches/:catecacheId', catecaches.findOne);

    // Update a CateCache with catecacheId
    app.put('/catecaches/:catecacheId', catecaches.update);

    // Delete a CateCache with catecacheId
    app.delete('/catecaches/:catecacheId', catecaches.delete);

    /* --------------------------------------------------------------------- */
    /* LANGUAGE
    /* --------------------------------------------------------------------- */
    // Create a new Language
    app.post('/languages', languages.create);

    // Retrieve all Languages
    app.get('/languages', languages.findAll);

    // Retrieve a single Language with code
    app.get('/languages/:code', languages.findByCode);

    // Update a Language with languageId
    app.put('/languages/:languageId', languages.update);

    // Delete a Language with languageId
    app.delete('/languages/:languageId', languages.delete);

    /* --------------------------------------------------------------------- */
    /* DICTIONARY
    /* --------------------------------------------------------------------- */
    // Create a new Dictionary
    app.post('/dictionaries', dictionaries.create);

    // Bulk create of update Dictionary
    app.post('/dictionaries/bulk-create-or-update', dictionaries.bulkCreateOrUpdateDictionary);
    app.post('/dictionaries/bulk-insert-or-update', dictionaries.bulkInsertOrUpdate);

    // Retrieve all dictionaries
    app.get('/dictionaries', dictionaries.findAll);

    // Retrieve a single Dictionary with keyword
    app.get('/dictionaries/:keyword', dictionaries.findByKeyword);

    // Update a Dictionary with dictionaryId
    app.put('/dictionaries/:dictionaryId', dictionaries.update);

    // Delete a Dictionary with dictionariesId
    app.delete('/dictionaries/:dictionaryId', dictionaries.delete);

    // Translate to target language
    app.get('/translate', dictionaries.translate);

    /* --------------------------------------------------------------------- */
    /* TRANSLATE
    /* --------------------------------------------------------------------- */

    // Retrieve all Translates
    app.get('/translates', translates.findAll);

    // Retrieve a single Translate with categoryId
    app.get('/translates/:translateId', translates.findOne);

    // Update a Translate with translateId
    app.put('/translates/:translateId', translates.update);

    // Delete a Translate with categoryId
    app.delete('/translates/:translateId', translates.delete);

    // Delete all Translates
    app.delete('/cleartranslates', translates.deleteAll);

    /* --------------------------------------------------------------------- */
    /* COURSE
    /* --------------------------------------------------------------------- */
    // Create a new Course
    app.post('/courses', courses.create);

    // Retrieve all Courses
    app.get('/courses', courses.findAll);

    // Update a Course with courseId
    app.put('/courses/:courseId', courses.update);

    // Delete a Course with courseId
    app.delete('/courses/:courseId', courses.delete);

    /* --------------------------------------------------------------------- */
    /* NEWWORD
    /* --------------------------------------------------------------------- */
    // Create a new NewWord
    app.get('/requestNewWord', newwords.create);

    // Retrieve all newwords
    app.get('/newword/getAll', newwords.findAll);

    // Retrieve a single NewWord with newwordId
    app.get('/newword/find/:newwordId', newwords.findOne);

    // Delete a NewWord with newwordId
    app.delete('/newword/delete/:newwordId', newwords.delete);

    /* --------------------------------------------------------------------- */
    /* FEEDBACK
    /* --------------------------------------------------------------------- */
    // Create a new FeedBack
    app.get('/sendFeedBack', feedbacks.create);

    // Retrieve all FeedBack
    app.get('/feedback/getAll', feedbacks.findAll);

    // Retrieve a single FeedBack with feedbackId
    app.get('/feedback/find/:feedbackId', feedbacks.findOne);

    // Delete a FeedBack with feedbackId
    app.delete('/feedback/delete/:feedbackId', feedbacks.delete);

    /* --------------------------------------------------------------------- */
    /* SETTING
    /* --------------------------------------------------------------------- */
    // Create a new Setting
    app.post('/settings', settings.create);

    // Retrieve all Settings
    app.get('/settings', settings.findAll);

    // Retrieve a single Setting with key
    app.get('/checkUpdateApp', settings.findOne);

    // Update a Setting with id
    app.put('/settings/:settingId', settings.update);

    // Delete a Setting with id
    app.delete('/settings/:settingId', settings.delete);
}