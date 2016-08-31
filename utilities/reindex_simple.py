# -*- coding: utf-8 -*-

import requests, sys
requests.packages.urllib3.disable_warnings()
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch()

if len(sys.argv) > 2:
    index_old = sys.argv[1]
    index_new = sys.argv[2]
    helpers.reindex(
        es,
        index_old,
        index_new
    )
else:
    print "You must input from-index and to-index"

