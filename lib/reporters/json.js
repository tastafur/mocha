'use strict';

/**
 * Module dependencies.
 */

var Base = require('./base');
var utils = require('../utils');
var inherits = utils.inherits;
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

/**
 * Expose `JSON`.
 */

exports = module.exports = JSONReporter;

/**
 * Initialize a new `JSON` reporter.
 *
 * @api public
 * @param {Runner} runner
 */
function JSONReporter (runner, options) {
  Base.call(this, runner);

  var self = this;
  var tests = [];
  var pending = [];
  var failures = [];
  var passes = [];

  if (options && options.reporterOptions && options.reporterOptions.output) {
    if (!fs.createWriteStream) {
      throw new Error('file output not supported in browser');
    }

    mkdirp.sync(path.dirname(options.reporterOptions.output));
    self.fileStream = fs.createWriteStream(options.reporterOptions.output);
  }

  runner.on('test end', function (test) {
    tests.push(test);
  });

  runner.on('pass', function (test) {
    passes.push(test);
  });

  runner.on('fail', function (test) {
    failures.push(test);
  });

  runner.on('pending', function (test) {
    pending.push(test);
  });

  runner.on('end', function () {
    var obj = {
      stats: self.stats,
      tests: tests.map(clean),
      pending: pending.map(clean),
      failures: failures.map(clean),
      passes: passes.map(clean)
    };

    runner.testResults = obj;

    self.write(JSON.stringify(obj, null, 2));
  });
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(JSONReporter, Base);

/**
 * Override done to close the stream (if it's a file).
 *
 * @param failures
 * @param {Function} fn
 */
JSONReporter.prototype.done = function (failures, fn) {
  if (this.fileStream) {
    this.fileStream.end(function () {
      fn(failures);
    });
  } else {
    fn(failures);
  }
};

/**
 * Write out the given stream.
 *
 * @param {string} stream
 */
JSONReporter.prototype.write = function (stream) {
  if (this.fileStream) {
    this.fileStream.write(stream);
  } else if (typeof process === 'object' && process.stdout) {
    process.stdout.write(stream);
  } else {
    console.log(stream);
  }
};

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @api private
 * @param {Object} test
 * @return {Object}
 */
function clean (test) {
  return {
    title: test.title,
    fullTitle: test.fullTitle(),
    duration: test.duration,
    currentRetry: test.currentRetry(),
    err: errorJSON(test.err || {})
  };
}

/**
 * Transform `error` into a JSON object.
 *
 * @api private
 * @param {Error} err
 * @return {Object}
 */
function errorJSON (err) {
  var res = {};
  Object.getOwnPropertyNames(err).forEach(function (key) {
    res[key] = err[key];
  }, err);
  return res;
}
