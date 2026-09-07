import { fileURLToPath } from 'node:url'

import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import skewProtection from '@netlify/unplugin-skew-protection/webpack'

/** @type {(env: unknown, argv: { mode?: string }) => import('webpack').Configuration} */
export default (_env, argv) => {
  const isProduction = argv.mode === 'production'

  return {
    devServer: {
      static: './dist',
      port: 5175,
    },
    entry: './src/index.js',
    module: {
      rules: [
        {
          exclude: /node_modules/,
          test: /\.jsx?$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { runtime: 'automatic', development: !isProduction }],
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
          ],
        },
      ],
    },
    output: {
      chunkFilename: '[name].[contenthash].chunk.js',
      clean: true,
      filename: '[name].[contenthash].js',
      path: fileURLToPath(new URL('dist', import.meta.url)),
      publicPath: '/',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
      new MiniCssExtractPlugin({
        chunkFilename: '[name].[contenthash].chunk.css',
        filename: '[name].[contenthash].css',
      }),
      skewProtection(),
    ],
    resolve: {
      extensions: [
        '.js',
        '.jsx',
      ],
    },
  }
}
