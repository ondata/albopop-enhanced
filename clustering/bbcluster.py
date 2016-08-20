import random
import csv

def cluster(docs):
    num = 10
    hashes = ['C'+str(random.getrandbits(128)) for i in range(1,num+1)]
    for doc in docs:
        doc["cluster"] = random.choice(hashes)
        yield doc


if __name__ == '__main__':

    # load docs
    docs = []
    with open("albopop-v3-2016.08.05-2016.08.20.csv", "rb") as f:
        csvFile = csv.reader(f, delimiter=';')
        csvFile.next()  # skip first line
        for row in csvFile:
            # build document dict
            doc = { "id": row[0], "index": row[1], "title": row[2] }
            docs.append(doc)

    # cluster the docs
    for d in cluster(docs):
        print d
