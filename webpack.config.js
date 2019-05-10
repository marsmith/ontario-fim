var path = require('path');
var webpack = require('webpack');
var pkg = require('./package.json');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

var PATHS = {
    dist: path.join(__dirname, 'dist/'),
    src: path.join(__dirname, 'src/')
  };

module.exports = {
    entry: PATHS.src + 'app.js',
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist')
    },
    optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendors',
					chunks: 'all'
				}
			}
		}
	},
    module: {
        rules: [
            { test: /\.css$/, use: ['style-loader', 'css-loader' ] },
            { test: /\.png$/, loader: 'url-loader?limit=8192', query: { mimetype: 'image/png' } },
            { test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/, loader: 'url-loader' },
            { test: /\.js?$/, exclude: /node_modules/, use: {
                loader: "babel-loader",
            } },
            { test: /\.html$/, loader: 'raw-loader' }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            '$': 'jquery',
            'Util': "exports-loader?Util!bootstrap/js/dist/util"
        }),
        new webpack.DefinePlugin( {'VERSION': JSON.stringify(pkg.version) }),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            inject: 'head',
            template: './src/index.html'
        }),
        new CleanWebpackPlugin(),
        new CopyPlugin([
            { from: './src/*.json', to: './', flatten: true },
            { from: './src/images', to: './images' }
        ]),
        //new BundleAnalyzerPlugin()
    ],
    devServer: {
        open: true,
        contentBase: PATHS.src,
        watchContentBase: true,
        port: 8008
    }
};