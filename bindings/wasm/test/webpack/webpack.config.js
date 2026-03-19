import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
    mode: "development",
    devtool: "source-map",

    entry: "./test/webpack/index.js",

    output: {
        path: path.resolve("./test/webpack/dist"),
        filename: "bundle.js",
        publicPath: "/"
    },

    experiments: {
        asyncWebAssembly: true
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: "./test/webpack/index.html"
        })
    ],

    devServer: {
        port: 8080,
        open: true
    }
};