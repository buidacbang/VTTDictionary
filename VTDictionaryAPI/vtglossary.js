/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./app/common/logger.common.js');
const config = require('./config/app.config.js');
const stringHelper = require('./app/common/string-helper.common.js');
const jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens

/* --------------------------------------------------------------------- */
/* CONFIGURE EXPRESS APPLICATION
/* --------------------------------------------------------------------- */
// create express app
const app = express();

// parse application/x-www-form-urlencoded
//app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
//app.use(bodyParser.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// configure static folder
app.use(express.static(__dirname + '/public'));

/* --------------------------------------------------------------------- */
/* CONFIGURE MONGO DB
/* --------------------------------------------------------------------- */
// Configuring the database
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

// Connecting to the database
mongoose.connect(config.database.url)
    .then(() => {
        logger.info("Successfully connected to the database");
    })
    .catch(err => {
        logger.info('Could not connect to the database. Exiting now...', err);
        process.exit();
    });

/* --------------------------------------------------------------------- */
/* CONFIGURE ROUTES
/* --------------------------------------------------------------------- */
// define a simple route
app.get('/', (req, res) => {
    res.json({ "message": "Welcome to Dictionary application." });
});
require('./app/routes/app.routes.js')(app);

/* --------------------------------------------------------------------- */
/* START THE SERVER
/* --------------------------------------------------------------------- */
// listen for requests
app.listen(config.app.port, () => {
    logger.info("Server is listening on port: " + config.app.port);
});