var BeerKit = function (init) {

  var self = this,
      dirname = require('path').dirname(require.main.filename),
      nodeDir = require('node-dir'),
      fs = require('fs'),
      hapi = require('hapi'),
      handlebars = require('handlebars'),
      handlebarsLayouts = require('handlebars-layouts'),
      moment = require('moment'),
      util = require('util'),
      colors = require('colors'),
      htmlEngine = handlebars.create(),
      appVars = {},
      app = null;

  this.db = null;

  init.call(self, function() {
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
    var pluginsDir = dirname + '/backend/plugins';
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
          next();
        }, function (err, files) {
          if (err) throw err;
          registerPlugins()
        });
      });
    });

    function registerPlugins() {
      [].forEach.call(pluginsToLoad, function (plugin) {
        app.register(require(plugin), function (err) {
          if (err) {
            util.log('[BeerKit]'.magenta + ' Failed to load plugin: '.red + err);
          }
        });
      });
    }

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
      layoutPath: './frontend/views',
      partialsPath: './frontend/views',
    });

    app.start(function () {
      if (process.env.NODE_ENV === 'production') {
        util.log('BeerKit is now started at ' + app.info.uri + ' in '+'production'.underline.white+' mode');
      } else {
        util.log('BeerKit is now started at ' + app.info.uri + ' in development mode'.rainbow);
      }
    });
  });
  return this;
}

module.exports = BeerKit;
