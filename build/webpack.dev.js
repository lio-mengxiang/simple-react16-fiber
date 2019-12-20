const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const commonConfig = require('./webpack.common.js');
const PORT = 2001;
const HOST = '127.0.0.1';
const devConfig = {
  mode: 'development', // 模式，表示dev环境
  devtool: 'cheap-module-eval-source-map',
  devServer: {
    index: 'refresh.html', // 用来指定默认的文件
    inline: true, // 打包后加入一个websocket客户端
    hot: true, // 热加载
    contentBase: path.resolve(__dirname, '../dist'), // 静态文件根目录
    port: PORT, // 端口
    host: HOST, // ip
    overlay: true, // 这个配置属性用来在编译出错的时候，在浏览器页面上显示错误
    compress: false, // 服务器返回浏览器的时候是否启动gzip压缩
    historyApiFallback: true, // 支持html5，history跳转
  },
  watchOptions: {
    ignored: /node_modules/, // 忽略不用监听变更的目录
    aggregateTimeout: 500, // 防止重复保存频繁重新编译,500毫米内重复保存不打包
    poll: 1000, // 每秒询问的文件变更的次数
  },
  plugins: [// 插件
    new webpack.NamedModulesPlugin(), // 用于启动HMR时可以显示模块的相对路径
    new webpack.HotModuleReplacementPlugin(), // 开启模块热更新，热加载和模块热更新不同，热加载是整个页面刷新
    new OpenBrowserPlugin({
      url: `http://${HOST}:${PORT}`,
    }),
  ],
};

module.exports = merge(commonConfig, devConfig);
