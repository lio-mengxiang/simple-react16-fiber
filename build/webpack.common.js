const path = require('path');
const WebpackBar = require('webpackbar'); // 产生打包时的进度条UI效果
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // 生成html的插件


const plugins = [
  new WebpackBar(), // webpack打包进度条
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, '../src', 'index.ejs'),
    filename: 'index.html',
    hash: true, // 防止缓存,
    title: process.env.TITLE,
    minify: {
      removeAttributeQuotes: true, // 压缩 去掉引号
    },
  }),
];


const commonConfig = {
  entry: {
    index: path.resolve(__dirname, '../src', 'index.js'),
  },
  output: {
    filename: '[name].[hash].js', // 同步文件的名字
    chunkFilename: '[name].[chunkhash:8].async.js', // 异步文件的名字
    path: path.resolve(__dirname, '../dist'), // 打包后文件夹存放路径
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  module: {// 让 webpack 能够去处理那些非 JavaScript 文件
    rules: [
      {
        test: /\.jsx?$/, // 注意这里要写正确，不然useBuiltIns不起作用
        use: [
          'thread-loader',
          {
            loader: 'babel-loader?cacheDirectory', // 只是babel和webpack之间的桥梁，并不会将代码转译
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.less$/,
        use: ['style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                mode: 'local',
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
              },
            },
          }, 'postcss-loader',
          {
            loader: 'less-loader',
            options: {
              javascriptEnabled: true,
              modifyVars: {
                'primary-color': '#4C84FF',
                'tint-color': '#83859A',
              },
            },
          }],
        include: /src/,
      },
      {
        test: /\.less$/,
        use: ['style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              importLoaders: 1,
            },
          }, 'postcss-loader',
          {
            loader: 'less-loader',
            options: {
              javascriptEnabled: true,
              'primary-color': '#4C84FF',
              'tint-color': '#83859A',
            },
          }],
        include: /node_modules/,
      },
    ],
  },
  plugins,
};

module.exports = commonConfig;
