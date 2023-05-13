#!/bin/bash

cd "$(dirname "$0")"
mkdir -p logs
npm ci
node ./app.js >> "$(date +%F).txt"