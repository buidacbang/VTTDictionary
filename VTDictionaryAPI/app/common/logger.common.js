/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* CREATE THE LOGGER
/* --------------------------------------------------------------------- */
const winston = require('winston');
require('winston-daily-rotate-file');

const moment = require('moment');
const tsFormat = () => moment().format('YYYY-MM-DD hh:mm:ss').trim();

var transport = new (winston.transports.DailyRotateFile)({
    filename: 'logs/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    timestamp: tsFormat,
    zippedArchive: false
});

var console = new (winston.transports.Console)({
    timestamp: tsFormat,
    colorize: true
});

//transport.on('rotate', function (oldFilename, newFilename) {
//    // do something
//});

var logger = new (winston.Logger)({
    transports: [
        transport,
        console
    ]
});

module.exports = logger;