var BeerKit = function (init) {

  var self = this,
      dirname = require('path').dirname(require.main.filename),
      nodeDir = require('node-dir'),
      fs = require('fs'),
      hapi = require('hapi'),
      handlebars = require('handlebars'),
      good = require('good'),
      handlebarsLayouts = require('handlebars-layouts'),
      moment = require('moment'),
      util = require('util'),
      colors = require('colors'),
      htmlEngine = handlebars.create(),
      appVars = {},
      app = null;

  init.call(self, function(appBack) {
    if (this.sessions && this.sessions.redis) {
      util.log('[BeerKit]'.magenta + ' Sessions with Redis are enabled');
      appVars.cache = [];
      this.sessions.redis.engine = require('catbox-redis');
      appVars.cache.push(this.sessions.redis);
    }

    handlebarsLayouts.register(htmlEngine);

    if (this.handlebarHelpers && this.handlebarHelpers.length > 0) {
      [].forEach.call(this.handlebarHelpers, function (helper) {
        htmlEngine.registerHelper(helper.name, helper.func);
      });
    }

    app = new hapi.Server(appVars);

    /*
     * Include all users plugins
     */
    var pluginsToLoad = [];
    var pluginsDir = this.plugins || dirname + '/backend/plugins';
    nodeDir.subdirs(pluginsDir, function (err, subdirs) {
      if (err) throw err;
      subdirs.forEach(function (path) {
        nodeDir.readFiles(path, {
          match: /.json$/,
          exclude: /^\./
        }, function(err, content, next) {
          if (err) throw err;
          var packageJSON = JSON.parse(content);
          pluginsToLoad.push(path + '/' + packageJSON.main);
          app.register(require(path + '/' + packageJSON.main), function (err) {
            if (err) {
              util.log('[BeerKit]'.magenta + ' Failed to load plugin: '.red + err);
            } else {
              util.log('[BeerKit]'.magenta + ' Successfully loaded plugin: ' + packageJSON.name);
            }
          });
          next();
        }, function (err, files) {
          if (err) throw err;
        });
      });
    });

    if (typeof this.mongodb !== 'undefined') {
      app.register({
        register: require('hapi-mongodb'),
        options: this.mongodb
      }, function (err) {
        if (err) {
          util.log('[BeerKit]'.magenta + ' Failed to load mongoDB-plugin'.red);
        } else {
          util.log('[BeerKit]'.magenta + ' DB Storage with mongoDB are enabled');
        }
      });
    }

    var port = this.port || process.env.PORT || 8000;
    app.connection({
      port: this.port
    });

    app.views({
      engines: {
        html: {
          module: htmlEngine,
          isCached: (process.env.NODE_ENV === 'production') ? true : false
        }
      },
      compileMode: 'sync',
      relativeTo: dirname,
      path: this.views || './frontend/views',
      layoutPath: this.views || './frontend/views',
      partialsPath: this.views || './frontend/views',
    });

    app.route({
      method: 'GET',
      path: '/statics/{path*}',
      config: {
        handler: {
          directory: {
            path: this.statics || './frontend/statics'
          }
        },
        id: 'statics',
        state: {
          parse: false,
          failAction: 'ignore'
        }
      }
    });

    if (typeof this.logging !== 'undefined') {
      var reporters = [];
      if (this.logging.console) {
        reporters.push({
          reporter: require('good-console'),
          events: { response: '*' }
        });
      }
      if (this.logging.file) {
        reporters.push({
          reporter: require('good-file'),
          events: { error: '*' },
          config: dirname + '/logs/app-good.log'
        });
      }
      app.register({
        register: good,
        options: {
          reporters: reporters
        }
      }, function (err) {
        if (err) {
          util.log('[BeerKit]'.magenta + ' Failed to load logging-plugin'.red);
        } else {
          util.log('[BeerKit]'.magenta + ' Is now logging');
        }
        startServer();
      });
    } else {
      startServer();
    }

    function startServer() {
      app.start(function () {
        if (process.env.NODE_ENV === 'production') {
          util.log('BeerKit is now started at ' + app.info.uri + ' in '+'production'.underline.white+' mode');
        } else {
          util.log('BeerKit is now started at ' + app.info.uri + ' in development mode'.rainbow);
        }

        if(appBack && typeof appBack == 'function') {
          appBack(app);
        }

      });
    }
  });
  return this;
}

module.exports = BeerKit;
