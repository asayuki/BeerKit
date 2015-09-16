# BeerKit

A Hapi version of [VodkaKit](https://github.com/Arood/VodkaKit).

<p style="text-align: center"><img src="https://cdn.rawgit.com/asayuki/BeerKit/master/beerkit.png" height="400" style="height: 566px" /></p>

## Getting started

1.  Install BeerKit globally

        npm install -g beerkit

2.  Create a new project folder and `cd` into id

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

Then you can either run `npm run watch:css` to watch for changes and compile css, or just run `npm run build:css` just to build it once.

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

### this.views

### this.statics

### this.plugins

### this.loadPlugins

### this.logging

### this.mongodb

### this.sessions

### start
