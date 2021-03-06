/*
 * express-fluent-logger
 * Copyright(c) 2014-2015 Toshiya SAITOH
 */

var logger = require('fluent-logger');
var debug = require('debug')('express-fluent-logger');

/**
 * Create a fluent logger middleware.
 *
 * @public
 * @param {String|Function} tag
 * @param {Object} options
 * @return {Function}
 */
exports = module.exports = function expressFluentLogger(tag, options) {
  if (typeof tag === 'object') {
    options = tag;
    tag = 'debug';
  }

  if (typeof tag === 'undefined') {
    tag = 'debug';
  }

  options = options || { host: '127.0.0.1', port: 24224, timeout: 3.0 };

  logger.configure(tag, options);

  logger.on('error', debug);

  return function(req, res, next) {
    var start = new Date();
    function emitHandler() {
      res.removeListener('finish', emitHandler);
      res.removeListener('close',  emitHandler);
      var logObject = {
        'timestamp':      start.getTime(),
        'remote-address': req.ip,
        'method':         req.method,
        'url':            req.protocol + '://' + req.get('host') + req.url,
        'http-version':   req.httpVersion,
        'status':         res.statusCode,
        'content-length': res.get('content-length'),
        'referrer':       req.get('referrer') || req.get('referer') || '',
        'response-time':  new Date() - start
      };

      // logging request headers.
      Object.keys(req.headers)
        .filter(function(key) {
          return key !== 'host' && key !== 'connection' && key !== 'referrer' && key != 'referer';
        })
        .forEach(function(key) {
          key = key.toLowerCase();
          logObject[key] = req.get(key);
        });

      // logging response headers.
      options.responseHeaders = options.responseHeaders || [];
      options.responseHeaders
        .filter(function(key) {
          return res.get(key);
        })
        .forEach(function(key) {
          key = key.toLowerCase();
          logObject[key.toLowerCase()] = res.get(key);
        });

      logger.emit('access', logObject);
    }

    res.on('finish', emitHandler);
    res.on('close',  emitHandler);
    next();
  };
};
