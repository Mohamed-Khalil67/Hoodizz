const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const webpack = require('webpack');
const { join } = require('path');

// Optional dependencies that NestJS / Apollo / GraphQL soft-require but
// we don't actually use. They aren't installed and we want webpack to
// skip them entirely rather than fail or leave external require()s in
// the bundle that crash at cold-start.
const OPTIONAL_MODULES = new RegExp(
  '^(' +
    [
      '@apollo/subgraph',
      '@apollo/gateway',
      '@as-integrations/fastify',
      'ts-morph',
      'class-transformer/storage',
      '@nestjs/microservices',
      '@nestjs/websockets',
      '@grpc/grpc-js',
      '@grpc/proto-loader',
      'amqplib',
      'amqp-connection-manager',
      'nats',
      'mqtt',
      'ioredis',
      'kafkajs',
      'cache-manager',
      'bufferutil',
      'utf-8-validate',
    ].join('|') +
    ')(/.*)?$',
);

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    // Expose exports from main.ts so the Vercel serverless wrapper at
    // api/[...slug].js can require('../dist/main.js').createApp.
    library: { type: 'commonjs2' },
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  ignoreWarnings: [
    { module: /node_modules\/source-map-loader/ },
    { module: /node_modules\/ws/ },
  ],
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      // Bundle every real dependency into main.js so the Vercel function
      // can load a single self-contained file from disk without ncc
      // re-bundling 80 MB of @nestjs/* + firebase-admin + prisma.
      externalDependencies: 'none',
    }),
    new webpack.IgnorePlugin({
      checkResource(resource) {
        return OPTIONAL_MODULES.test(resource);
      },
    }),
  ],
};
