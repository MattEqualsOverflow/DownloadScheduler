#!/usr/bin/python

# pip install transmission-rpc -U
from transmission_rpc import Client
from datetime import datetime, timedelta
import sys

c = Client(host='localhost', port=9091)
to_delete = []
cutoff_date = (datetime.today() - timedelta(days=30))
for download in c.get_torrents():
    remove = False
    if download.status == "stopped":
        remove = True
    elif download.added_date.timestamp() < cutoff_date.timestamp():
        remove = True
    if remove == True:
        c.remove_torrent(download.hashString)
        print(download.hashString)
