#!/usr/bin/env sh

esbuild --bundle main.js --format=esm --minify --external:colorjs.io >bundle.js

