import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
  mode: "development",
  devtool: "source-map",

  entry: "./test/webpack/index.js",

  output: {
    path: path.resolve("./test/webpack/dist"),
    filename: "bundle.js",
    publicPath: "/",
    clean: true
  },

  experiments: {
    asyncWebAssembly: true
  },

  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: "asset/resource" //ensures wasm is emitted correctly
      }
    ]
  },

  resolve: {
    fallback: {
      fs: false //prevent Node-only modules from breaking browser build
    }
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./test/webpack/index.html"
    })
  ],

  devServer: {
    port: 8080,
    open: true,

    static: {
      directory: path.resolve("./test/webpack/dist")
    },

    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  }
};