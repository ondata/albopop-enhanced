
import random
import numpy as np
import csv
from sklearn.cluster.k_means_ import KMeans
import string
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import NMF, LatentDirichletAllocation


# glorious kmeans
def kmeans(docs, n_clusters):

    model = KMeans(n_clusters=n_clusters, random_state=0)
    return cluster(docs, model, kmeansAssignation)

# matrix factorization
def NMFactorization(docs, n_clusters):
    model = NMF(n_components=n_clusters, random_state=0)
    return cluster(docs, model, argMaxAssignation)

# latent allocation
def LatentDA(docs, n_clusters):
    model = LatentDirichletAllocation(n_topics=n_clusters, random_state=0)
    return cluster(docs, model, argMaxAssignation)


def kmeansAssignation(model, vector):
    prediction = model.predict(vector)
    return prediction[0]

def argMaxAssignation(model, vector):
    transform = model.transform(vector)
    return np.argmax(transform[0])


def cluster(docs, model, assignationFunction):

    # data preparation
    vectorizer = TfidfVectorizer(tokenizer=tokenizeAndClean, min_df=0.01, max_df=0.5, max_features=1000)
    corpus = []
    for doc in docs:
        corpus.append(doc['title'])
    vectorizedCorpus = vectorizer.fit_transform(corpus)

    # run clustering
    model.fit(vectorizedCorpus)

    # assign each document a cluster and yield
    for i, doc in enumerate(docs):

        # run prediction
        vectorizedTitle = vectorizedCorpus[i]
        doc['cluster']  = assignationFunction(model, vectorizedTitle)

        #print 'original text:', doc['title']
        #print 'decodedTitle', vectorizer.inverse_transform(vectorizedTitle)
        #print 'CLUSTER:', doc['cluster']

        yield doc

def tokenizeAndClean(text):

    # all lowercase
    text = text.lower()

    # take away punctuation and numbers
    symbols = string.punctuation + '1234567890'
    for symbol in symbols:
        text = text.replace(symbol, ' ')

    tokens = text.split(' ')

    #return tokens with more than 4 letters
    return filter(lambda w: len(w) > 4, tokens)

def getMostImportantWords(centroid, vectorizer):

    labels = vectorizer.get_feature_names()

    weightedWords = {}
    for i, weight in enumerate(centroid):
        word = labels[i]
        weightedWords[word] = weight

    bestWords = sorted(weightedWords, key=weightedWords.__getitem__)
    return bestWords[:5]

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

    # cluster the docs with generator
    for d in kmeans(docs, 5):
    #for d in LatentDA(docs, 5):
    #for d in NMFactorization(docs, 5):
        print d['cluster']
