#!/bin/bash

pid=$(ps aux | grep "${pwd}/download.scheduler.js" | grep node | awk '{print $2}')
if [[ -n "${pid// /}" ]]; then
        kill "$pid"
fi