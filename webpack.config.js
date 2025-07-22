const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './js/sidepanel/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/sidepanel/bundle.js',
      clean: true, // Clean the output directory before emit
    },
    devtool: isProduction ? false : 'source-map', // Source maps for development
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react']
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    }
  };
};