# -*- encoding: utf-8 -*-

from elasticsearch import Elasticsearch, helpers
from elasticsearch_dsl import Search
from datetime import date, timedelta
import bbcluster
import csv

class Clustering:

    delimiter = ";"
    clusters = 8

    def __init__(self, prefix, days = 15, strf = "%Y.%m.%d"):
        self.es = Elasticsearch()
        self.s = Search(
            using = self.es,
            index = self.indices(prefix,days,strf)
        ).query("match_all").params(ignore_unavailable=True)

    def indices(self, prefix, days, strf):
        today = date.today()
        dates = [today - timedelta(days=x) for x in range(0,days)]
        return ",".join([prefix+dt.strftime(strf) for dt in dates])

    def cluster(self, f = None):

        if f:
            writer = csv.DictWriter(f, fieldnames=["id","index","title"], delimiter=self.delimiter)
            writer.writeheader()
        else:
            print self.delimiter.join(["id","index","title"])

        docs = []
        for item in self.s.scan():
            title = item.title.replace(self.delimiter,",").encode('utf-8')
            doc = { "id": item.meta.id, "index": item.meta.index, "title": title }
            docs.append(doc)
            if f:
                writer.writerow(doc)
            else:
                print self.delimiter.join([item.meta.id,item.meta.index,title]).encode('utf-8')

        clusters = bbcluster.kmeans(docs, self.clusters)
        #clusters = bbcluster.NMFactorization(docs, self.clusters)
        #clusters = bbcluster.LatentDA(docs, self.clusters) # Not available in Debian 7 Wheezy

        helpers.bulk(
            self.es,
            [
                {
                    "_op_type": "update",
                    "_index": cluster["index"],
                    "_type": "rss_item",
                    "_id": cluster["id"],
                    "doc": { "cluster": cluster["cluster"] }
                }
                for cluster in clusters
            ]
        )

if __name__ == "__main__":
    prefix = "albopop-v3-"
    days = 15
    strf = "%Y.%m.%d"
    last_day = date.today()
    first_day = last_day - timedelta(days=days)
    c = Clustering(prefix,days,strf)
    with open(prefix+first_day.strftime(strf)+"-"+last_day.strftime(strf)+".csv","w") as f:
        c.cluster(f)
