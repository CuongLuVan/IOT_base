const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');


module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '/admin/',
    filename: 'bundle.js'
  },
  devServer: {
    contentBase: "./build",
    compress: true,
    port: 3030
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
       // use: ['babel-loader'],
        loader: 'babel-loader',
        options: {
          // This is a feature of `babel-loader` for webpack (not Babel itself).
          // It enables caching results in ./node_modules/.cache/babel-loader/
          // directory for faster rebuilds.
          cacheDirectory: true,
          plugins: ['react-hot-loader/babel'],
       },
      },
      { 
        test: /\.less$/,
        use: [ 
          'style-loader',
          'css-loader', 
          'less-loader',
        ],
      },
      {
        test: /\.(scss|css)$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      }
      ,
      {
        test : /\.(jpg|png)$/,
        exclude: /(node_modules)/,
        loader : 'file-loader'
      }
      ,{
        test : /\.(wav|mp3)$/,
        exclude: /(node_modules)/,
        loader : 'file-loader'
      },
      {
        test: /\.svg$/,
        use: {
            loader: 'svg-url-loader'
        }
      }
    ]
  },
  performance: {
    hints: false,
  },
  devServer: {
    historyApiFallback: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template:  path.resolve('./index.html'),
    }),
    new MiniCssExtractPlugin(),
    new OptimizeCssAssetsPlugin()
  ]
};

