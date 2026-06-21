var WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
    devtool: 'source-map',
    entry: {
        app: './src/entry/app.js'
    },
    output: {
        path: __dirname + '/editions/free/src',
        filename: '[name].bundle.js'
    },
    performance: {
        hints: false
    },
    watchOptions: {
        ignored: ["node_modules", "editions/free/src/app.bundle.js*"]
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: /node_modules/,
                loaders: ['strip-sourcemap-loader']
            },
            {
                loader: 'babel-loader',
                exclude: /node_modules/,
                test: /\.jsx?$/,
                query: {
                    presets: ['es2015', 'stage-3']
                }
            }
        ]
    },
    plugins: [
        new WebpackNotifierPlugin({
            title: "ScratchJr",
            alwaysNotify: true
        })
    ]
};
