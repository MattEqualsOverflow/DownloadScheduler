#!/bin/bash

cd "$(dirname "$0")"
mkdir -p logs
npm ci
node "$(pwd)/download-scheduler.js" >> "logs/$(date +%F).txt" 2>&1