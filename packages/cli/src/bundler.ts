
import { createBundlerServerMessenger, stylusGlobals } from "@escad/bundler"
import { parentProcessConnection } from "@escad/messages"
import webpack, { EnvironmentPlugin } from "webpack"
import NodePolyfillPlugin from "node-polyfill-webpack-plugin"

createBundlerServerMessenger(
  parentProcessConnection(),
  (options, entryPaths) =>
    webpack({
      entry: entryPaths,
      output: {
        path: options.outDir,
        filename: "bundle.js",
        sourceMapFilename: "bundle.js.map",
      },
      optimization: {
        minimize: false,
      },
      module: {
        rules: [
          {
            test: /^.*\.styl$/,
            use: [
              { loader: require.resolve("style-loader") },
              { loader: require.resolve("css-loader") },
              {
                loader: require.resolve("stylus-loader"),
                options: {
                  stylusOptions: {
                    define: stylusGlobals,
                  },
                },
              },
            ],
          },
        ],
      },
      devtool: "source-map",
      mode: "development",
      plugins: [
        new NodePolyfillPlugin(),
        new EnvironmentPlugin(["DEV_MODE"]),
      ],
    }),

)
