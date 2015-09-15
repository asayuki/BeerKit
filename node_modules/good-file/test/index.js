// Load modules

var EventEmitter = require('events').EventEmitter;
var Fs = require('fs');
var Os = require('os');
var Path = require('path');
var Stream = require('stream');

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Hoek = require('hoek');
var GoodFile = require('..');


// Declare internals

var internals = {
    tempDir: Os.tmpDir()
};

internals.removeLog = function (path) {

    if (Fs.existsSync(path)) {
        Fs.unlinkSync(path);
    }
};


internals.getLog = function (path, callback) {

    Fs.readFile(path, { encoding: 'utf8' }, function (error, data) {

        if (error) {
            return callback(error);
        }

        var results = JSON.parse('[' + data.replace(/\n/g, ',').slice(0, -1) + ']');
        callback(null, results);
    });
};


internals.readStream = function (done) {

    var result = new Stream.Readable({ objectMode: true });
    result._read = Hoek.ignore;

    if (typeof done === 'function') {
        result.once('end', done);
    }

    return result;
};

// Lab shortcuts

var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('GoodFile', function () {

    it('allows creation without using new', function (done) {

        var reporter = GoodFile({ log: '*' }, Hoek.uniqueFilename(internals.tempDir));
        expect(reporter._streams).to.exist();
        done();
    });

    it('allows creation using new', function (done) {

        var reporter = new GoodFile({ log: '*' }, Hoek.uniqueFilename(internals.tempDir));
        expect(reporter._streams).to.exist();
        done();
    });

    it('validates the options argument', function (done) {

        expect(function () {

            var reporter = new GoodFile({ log: '*' });
        }).to.throw(Error, /value must be a (string|number)/);

        done();
    });

    it('will clear the timeout on the "stop" event', function (done) {

        var reporter = new GoodFile({ request: '*' }, {
            path: internals.tempDir,
            rotate: 'daily'
        });

        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._state.timeout).to.exist();

            read.push({ event: 'request', id: 1, timestamp: Date.now() });
            read.push(null);

            ee.emit('stop');

            reporter._streams.write.on('finish', function () {

                expect(reporter._streams.write.bytesWritten).to.equal(53);
                expect(reporter._streams.write._writableState.ended).to.be.true();
                expect(reporter._state.timeout._idleTimeout).to.equal(-1);

                internals.removeLog(reporter._streams.write.path);

                done();
            });
        });
    });

    it('logs an error if one occurs on the write stream and tears down the pipeline', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var logError = console.error;
        var read = internals.readStream();

        console.error = function (value) {

            console.error = logError;
            expect(value.message).to.equal('mock error');
            internals.removeLog(reporter._streams.write.path);
            done();
        };

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            reporter._streams.write.emit('error', new Error('mock error'));
        });
    });

    it('properly sanitizes `format`, `prefix` and `extension`', function (done) {

        var sep = Path.sep;
        var reporter = new GoodFile({ log: '*' }, {
            path: internals.tempDir,
            format: 'Y' + sep + 'M' + sep,
            extension: 'foo' + sep + 'bar'
        });

        expect(reporter._settings.format).to.equal('Y-M-');
        expect(reporter._settings.extension).to.equal('.foo-bar');

        done();
    });

    it('writes to the current file and does not create a new one', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._streams.write.path).to.equal(file);

            reporter._streams.write.on('finish', function () {

                expect(error).to.not.exist();
                expect(reporter._streams.write.bytesWritten).to.equal(1260);

                internals.removeLog(reporter._streams.write.path);

                done();
            });

            for (var i = 0; i < 20; ++i) {
                read.push({ event: 'request', statusCode: 200, id: i, tag: 'my test ' + i });
            }

            read.push(null);
        });
    });

    it('handles circular references in objects', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();

            var data = {
                id: 1,
                event: 'request',
                timestamp: Date.now()
            };

            data._data = data;

            reporter._streams.write.on('finish', function () {

                internals.getLog(reporter._streams.write.path, function (error, results) {

                    expect(error).to.not.exist();
                    expect(results.length).to.equal(1);
                    expect(results[0]._data).to.equal('[Circular ~]');

                    internals.removeLog(reporter._streams.write.path);

                    done();
                });
            });

            read.push(data);
            read.push(null);
        });
    });

    it('can handle a large number of events', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._streams.write.path).to.equal(file);

            reporter._streams.write.on('finish', function () {

                expect(reporter._streams.write.bytesWritten).to.equal(907873);
                internals.removeLog(reporter._streams.write.path);

                done();
            });

            for (var i = 0; i <= 10000; i++) {
                read.push({ event: 'request', id: i, timestamp: Date.now(), value: 'value for iteration ' + i });
            }
            read.push(null);
        });
    });

    it('will log events even after a delay', function (done) {

        var file = Hoek.uniqueFilename(internals.tempDir);
        var reporter = new GoodFile({ request: '*' }, file);
        var ee = new EventEmitter();
        var read = internals.readStream();

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();
            expect(reporter._streams.write.path).to.equal(file);

            reporter._streams.write.on('finish', function () {

                expect(reporter._streams.write.bytesWritten).to.equal(17134);
                internals.removeLog(reporter._streams.write.path);
                done();
            });

            for (var i = 0; i <= 100; i++) {
                read.push({ event: 'request', id: i, timestamp: Date.now(), value: 'value for iteration ' + i });
            }

            setTimeout(function () {

                for (var i = 0; i <= 100; i++) {
                    read.push({ event: 'request', id: i, timestamp: Date.now(), value: 'inner iteration ' + i });
                }

                read.push(null);
            }, 500);
        });
    });

    it('rotates logs on the specified internal', function (done) {

        var reporter = new GoodFile({ request: '*' }, {
            path: internals.tempDir,
            rotate: 'daily',
            format: 'YY#DDDD#MM',
            extension: ''
        });
        var ee = new EventEmitter();
        var min = Math.min;
        var read = internals.readStream();

        var files = [];

        var pathOne = Path.join(internals.tempDir, 'rotate1');
        var pathTwo = Path.join(internals.tempDir, 'rotate2');

        Math.min = function () {

            Math.min = min;
            return 100;
        };

        var getFile = reporter.getFile;

        reporter.getFile = function () {

            var result = getFile.call(this);

            files.push(result);

            return result;
        };

        reporter.init(read, ee, function (error) {

            expect(error).to.not.exist();

            for (var i = 0; i < 10; ++i) {

                read.push({ event: 'request', statusCode: 200, id: i, tag: 'my test 1 - ' + i });
            }

            setTimeout(function () {

                reporter._streams.write.on('finish', function () {

                    internals.getLog(files[0], function (err, fileOne) {

                        expect(err).to.not.exist();

                        internals.getLog(files[1], function (err, fileTwo) {

                            expect(err).to.not.exist();

                            var one = fileOne[0];
                            var two = fileTwo[0];

                            expect(fileOne).to.have.length(10);
                            expect(fileTwo).to.have.length(10);

                            expect(one).to.deep.equal({
                                event: 'request',
                                statusCode: 200,
                                id: 0,
                                tag: 'my test 1 - 0'
                            });
                            expect(two).to.deep.equal({
                                event: 'request',
                                statusCode: 200,
                                id: 0,
                                tag: 'my test 2 - 0'
                            });

                            for (var i = 0, il = files.length; i < il; ++i) {
                                expect(/good-file-\d+#\d+#\d+-[\w,\d]+$/g.test(files[i])).to.be.true();
                                internals.removeLog(files[i]);
                            }

                            done();
                        });
                    });
                });

                for (var i = 0; i < 10; ++i) {
                    read.push({ event: 'request', statusCode: 200, id: i, tag: 'my test 2 - ' + i });
                }

                read.push(null);
            }, 200);
        });
    });

    describe('init()', function () {

        it('properly sets up the path and file information if the file name is specified', function (done) {

            var file = Hoek.uniqueFilename(internals.tempDir);
            var reporter = new GoodFile({ log: '*' }, file);
            var ee = new EventEmitter();
            var stream = internals.readStream();

            reporter.init(stream, ee, function (error) {

                expect(error).to.not.exist();

                expect(reporter._streams.write.path).to.equal(file);

                internals.removeLog(reporter._streams.write.path);
                done();
            });
        });

        it('properly creates a random file if the directory option is specified', function (done) {

            var reporter = new GoodFile({ log: '*' }, { path: internals.tempDir });
            var ee = new EventEmitter();
            var stream = internals.readStream();

            reporter.init(stream, ee, function (error) {

                expect(error).to.not.exist();
                expect(/good-file-\d+-.+.log/g.test(reporter._streams.write.path)).to.be.true();

                internals.removeLog(reporter._streams.write.path);
                done();
            });
        });

        it('uses the options passed via directory', function (done) {

            var reporter = new GoodFile({ log: '*' }, {
                path: internals.tempDir,
                extension: 'fun',
                prefix: 'ops-log',
                format: 'YY$DDDD'
            });
            var ee = new EventEmitter();
            var stream = internals.readStream();

            reporter.init(stream, ee, function (error) {

                expect(error).to.not.exist();
                expect(/\/ops-log-\d{2}\$\d{3}-.+.fun/g.test(reporter._streams.write.path)).to.be.true();

                internals.removeLog(reporter._streams.write.path);
                done();
            });
        });
    });

});
