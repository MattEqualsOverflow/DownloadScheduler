#!/usr/bin/python

# pip install transmission-rpc -U
from transmission_rpc import Client
import sys

url = str(sys.argv[1])
path = str(sys.argv[2])

if (not url or not path):
    print('no url or path')
    exit()

c = Client(host='localhost', port=9091)
download = c.add_torrent(torrent = url, timeout=None, download_dir = path.replace("\\", "/"))

print(download.hashString)