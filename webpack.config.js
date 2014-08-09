var webpack = require('webpack')
  , path = require('path');

module.exports = {
    entry: "./example/app.js",
    output: { filename: "./example/bundled.js" },
    plugins: [
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.OccurenceOrderPlugin(true),
      new webpack.optimize.UglifyJsPlugin()
    ]
}