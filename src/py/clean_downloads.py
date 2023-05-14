#!/usr/bin/python

# pip install transmission-rpc -U
from transmission_rpc import Client
from datetime import datetime, timedelta
import sys

c = Client(host='localhost', port=9091)
to_delete = []
cutoff_date = (datetime.today() - timedelta(days=30))
print(cutoff_date)
for download in c.get_torrents():
        if download.status == "stopped":
                c.remove_torrent(download.hashString)
        elif download.added_date.timestamp() < cutoff_date.timestamp():
                c.remove_torrent(download.hashString)
        s  = '%s %s %s %s' % (download.hashString, download.status, download.done_date, download.added_date)
        print(s)
