# BeerKit

A Hapi version of [VodkaKit](https://github.com/Arood/VodkaKit).

<p style="text-align: center"><img src="https://cdn.rawgit.com/asayuki/BeerKit/master/beerkit.png" height="400" style="height: 566px" /></p>

## Getting started

1.  Install BeerKit globally

        npm install -g beerkit

2.  Create a new project folder and `cd` into it

        mkdir myProject && cd myProject

3.  Initialize BeerKit

        beerkit init

4.  Install required dependencies

        npm install

5.  Start the application

        npm start


## File structure

### Statics

Here you can put your static files.

Default path: `frontend/statics/`
Override with: `this.statics`

### Plugins

Here your plugins will be stored.

Default path: `backend/plugins/`
Override with: `this.plugins`

### Views

This is where your HTML-template are stored. BeerKit is using [HandleBars](http://handlebarsjs.com/) as the template-ing system.

Default path: `frontend/views`
Override with: `this.views`

### Javascript

At the moment there is no compiler for Javascript in place. Will be added in a future version of BeerKit.

### Stylesheets

By default there is no compiler for CSS in place in BeerKit. I strongly advice that you compile this with npm scripts. A folder is created (`assets/scss`) which is more of a suggestion where you can put your SCSS, for example.

Install the npm-modules `node-sass` and `watch` and enter the following (or similar) in the scripts-area of `package.json`:

        "build:css": "node-sass --output-style nested assets/scss/style.scss -o frontend/statics/",
        "watch:css": "watch \"npm run build:css\" assets/scss/",

Then you can either run `npm run watch:css` to watch for changes and compile css, or just run `npm run build:css` to build it once.

## Plugins

Creating a Plugin is very simple. For more information on how to create Plugins visit [Hapi's tutorialpage](http://hapijs.com/tutorials/plugins).

In BeerKit you will need at least two files in your plugin.

* mainfile.js
* package.json

BeerKit will go through all directories in the Pluginspath (default: backend/plugins/) and look for a file named package.json. It will then extract `mainRequire` of that file and use whats in that attribute when registering the plugin.

Here is an example for each file:

package.json

    {
      "name": "My Plugin",
      "version": "1.0.0",
      "description": "My plugin",
      "main": "mainfile.js",
      "mainRequire": "mainfile",
      "author": "Author",
      "license": "MIT"
    }

mainfile.js

    exports.register = function (plugin, options, next) {
      plugin.route([
        {
          method: 'GET',
          path: '/beer',
          config: {
            handler: function (req, rep) {
              rep.view('beer', {numOfBeer: 20});
            }
          }
        }
      ]);
      next();
    };

    exports.register.attributes = {
      pkg: require('./package.json')
    };

### Load other plugins

If you want to load plugins that you have installed with npm or they are in another directory you can use `this.loadPlugins`

Example:

    this.loadPlugins([
      {
        register: require('plugin-to-load'),
        options: {}
      }
    ]);

## Routes

If you want to add route(s) without having to involve Plugins you can just add a callbackfunction to start in `index.js`.

Instead of it being just:

    start();

You can change it to:

    start(function (app) {
      app.route({
        method: 'GET',
        path: '/myRoute',
        handler: function (req, res) {
          res({status: true});
        }
      });
    });

## Reference

TODO

### this.port

`(int)` Port that the application will listen to. Defaults to `process.env.PORT` and `8000

### this.views

`(string)` Path to view/templates files. Defaults to `./frontend/views`

### this.statics

`(string)` Path to static assets. Defaults to `./frontend/statics`

### this.plugins

`(string)` Path to your plugins. Defaults to `./backend/plugins`

### this.loadPlugins

`(array)` Array with objects that loads external plugins. [Example here.](#load-other-plugins)

### this.logging

`(object)` This property should be an object with one or both of the following keys:

* `this.logging.file` `(bool)` - Set to true if you want to log errors to file. Logpath is `./logs/app-good.log`. Default is false
* `this.logging.console` `(bool)` - Set to true if you want to log requests and errors in console. Default is false

### this.mongodb

`(object)` If defined, BeerKit will setup a Mongo-instance. Ths property should be and object with the following keys:

* `url` - Hostname to the MongoDB-server. Example: `mongodb://localhost:27017/beerkit`

To use MongoDB in your route-handlers use
* `var db = req.server.plugins['hapi-mongodb'].db;` - To get access the database
* `var ObjectID = req.server.plugins['hapi-mongodb'].ObjectID;` - To get access to the ObjectID-function

### this.sessions

`(object)` If defined, BeerKit will setup a Redis-instance where it will save your sessions. This property should be and object with the following key and subkeys:

* `redis` `(object)`
 * `name` `(string)` - Name of your session
 * `host` `(string)` - Hostname to the redis-server
 * `partition` `(string)` - Partition on the redis-server

To use caching, check [this tutorial](http://hapijs.com/tutorials/caching) on hapijs.com

### start(callback)

`(function)` Method to start your server.

* `callback` - If you use callback function you can set your own routes etc. without having to create a plugin. Check the (Routes)[#routes] section for this.
