#!/bin/sh
cd ..;
NODE_OPTIONS=--openssl-legacy-provider node ./node_modules/webpack/bin/webpack.js --mode=production
# NODE_OPTIONS=--openssl-legacy-provider node ./node_modules/webpack/bin/webpack.js --mode=development
