/////////////////////////// Author: tatdat ////////////////////////////////

/* --------------------------------------------------------------------- */
/* LOAD EXTERNAL MODULES
/* --------------------------------------------------------------------- */
const config = require('../../config/app.config.js');
const events = require('events');

/* --------------------------------------------------------------------- */
/* GLOBAL EVENT
/* --------------------------------------------------------------------- */

module.exports = new events.EventEmitter();