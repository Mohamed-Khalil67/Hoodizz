const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const webpack = require('webpack');
const { join } = require('path');

// Optional dependencies that NestJS / Apollo / GraphQL / firebase-admin
// soft-require but we don't actually use. They aren't installed (or have
// ESM-only exports webpack can't resolve in CJS mode) and we want webpack
// to skip them entirely rather than fail the build.
const OPTIONAL_MODULES = new RegExp(
  '^(' +
    [
      // NestJS optional transports we don't use
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
      // Apollo federation we don't use
      '@apollo/subgraph',
      '@apollo/gateway',
      '@as-integrations/fastify',
      // GraphQL tooling not needed at runtime
      'ts-morph',
      'class-transformer/storage',
      // ws optional native modules
      'bufferutil',
      'utf-8-validate',
      // pg optional native binding (we use the pure-JS path)
      'pg-native',
      // firebase-admin transitively pulls Firestore/Storage/GAX but we
      // only use Auth — strip the rest to keep the bundle building.
      '@google-cloud/firestore',
      '@google-cloud/storage',
      '@google-cloud/paginator',
      '@google-cloud/projectify',
      '@google-cloud/promisify',
      'google-gax',
      'gtoken',
      'teeny-request',
      'proto3-json-serializer',
      // file-type is ESM-only via package.json exports field
      'file-type',
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
