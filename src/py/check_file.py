#!/usr/bin/python

# pip install transmission-rpc -U
from transmission_rpc import Client
import sys

id = str(sys.argv[1])

if (not id):
    exit()

c = Client(host='localhost', port=9091)
try:
    download = c.get_torrent(torrent_id = id)
    print(download.status)
except Exception as e:
    print("Deleted " + e.message)