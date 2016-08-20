import random
import csv
from sklearn.feature_extraction.text import TfidfVectorizer

def cluster(docs):

    # data preparation
    vectorizer = TfidfVectorizer(tokenizer=tokenizeAndClean, max_features=1000)
    corpus = []
    for doc in docs:
        corpus.append(doc['title'])
    vectorizedCorpus = vectorizer.fit_transform(corpus)

    print vectorizer.get_feature_names()

    print corpus[0], vectorizer.inverse_transform(vectorizedCorpus[0])


    # run k-means with different nCluster and random seed
    #for nCluster in range(4,20):
    #    for seed in range(0,10):

            # run k-means
            #print nCluster, seed

            # store inertia and clusters

    # take best run of k-means (minimal inertia)

    # assign each document a cluster and yield
    for doc in docs:
        doc["cluster"] = 23
        yield doc

def tokenizeAndClean(text):

    # substitute all numbers with a special token

    # substitute all FUUUUUUUUUUCK

    return text.split(' ')

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
        2#print d
