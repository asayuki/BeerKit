// Load modules

var Crypto = require('crypto');
var Fs = require('fs');
var Path = require('path');
var Stream = require('stream');

var Hoek = require('hoek');
var Joi = require('joi');
var Moment = require('moment');
var Squeeze = require('good-squeeze').Squeeze;
var SafeJson = require('good-squeeze').SafeJson;

var Schema = require('./schema');

// Declare internals

var internals = {
    defaults: {
        directory: {
            format: 'YYYY-MM-DD',
            extension: '.log',
            prefix: 'good-file'
        }
    },
    timeMap: {
        hourly: 'hour',
        daily: 'day',
        weekly: 'week',
        monthly: 'monthly',
        yearly: 'year'
    },
    sanitize: new RegExp(Hoek.escapeRegex(Path.sep), 'g'),
    MAX_TIME: 2147483647 // 2^31-1
};

internals.setUpRotate = function (reporter, period) {

    var now = Moment.utc();

    period = period.toLowerCase();

    // match [1] user string
    now.endOf(internals.timeMap[period]);

    var timeout = now.valueOf() - Date.now();
    timeout = Math.min(timeout, internals.MAX_TIME);

    reporter._state.timeout = setTimeout(function () {

        internals.rotate(reporter, period);
    }, timeout);
};


internals.rotate = function (reporter, period) {

    internals.tearDown(reporter._streams);
    reporter._streams.write = reporter._buildWriteStream();
    internals.pipeLine(reporter._streams);
    internals.setUpRotate(reporter, period);
};


internals.tearDown = function (streams) {

    streams.stringify.unpipe(streams.write);
    streams.squeeze.unpipe(streams.stringify);
    streams.read.unpipe(streams.squeeze);
};


internals.pipeLine = function (streams) {

    streams.read.pipe(streams.squeeze).pipe(streams.stringify).pipe(streams.write);
};


module.exports = internals.GoodFile = function (events, config) {

    if (!(this instanceof internals.GoodFile)) {
        return new internals.GoodFile(events, config);
    }

    var settings;

    config = config || false;

    Joi.assert(config, Schema.options);

    if (typeof config === 'string') {
        settings = {
            file: config
        };
    }
    else {
        settings = Hoek.applyToDefaults(internals.defaults.directory, config);
    }

    if (settings.file) {

        this.getFile = function () {

            return settings.file;
        };
    }
    else {

        settings.extension = !settings.extension || settings.extension[0] === '.' ? settings.extension : '.' + settings.extension;


        // Replace any path separators with a "-"
        settings.format = settings.format.replace(internals.sanitize, '-');
        settings.prefix = settings.prefix.replace(internals.sanitize, '-');
        settings.extension = settings.extension.replace(internals.sanitize, '-');

        this.getFile = function () {

            var dateString = Moment.utc().format(settings.format);
            var name = [settings.prefix, dateString, Crypto.randomBytes(5).toString('hex')].join('-');

            name = settings.extension ? name + settings.extension : name;

            return Path.join(settings.path, name);
        };
    }

    this._settings = settings;

    this._state = {
        timeout: null
    };
    this._streams = {
        squeeze: Squeeze(events),
        stringify: SafeJson(null, { separator: '\n' })
    };
};


internals.GoodFile.prototype.init = function (stream, emitter, callback) {

    var self = this;

    emitter.on('stop', function () {

        clearTimeout(self._state.timeout);
    });

    if (this._settings.rotate) {
        internals.setUpRotate(this, this._settings.rotate);
    }

    this._streams.write = this._buildWriteStream();
    this._streams.read = stream;

    internals.pipeLine(this._streams);

    callback();
};


internals.GoodFile.prototype._buildWriteStream = function () {

    var result = Fs.createWriteStream(this.getFile(), { flags: 'a', end: false, encoding: 'utf8' });
    var self = this;

    result.once('error', function (err) {

        console.error(err);
        internals.tearDown(self._streams);
    });

    return result;
};
