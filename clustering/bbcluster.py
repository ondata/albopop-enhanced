
import random
import csv
import string
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import NMF, LatentDirichletAllocation

def cluster(docs):

    # data preparation
    #vectorizer = TfidfVectorizer(tokenizer=tokenizeAndClean, min_df=0.01, max_df=0.5, max_features=1000)
    vectorizer = CountVectorizer(tokenizer=tokenizeAndClean, min_df=0.01, max_df=0.5, max_features=1000)
    corpus = []
    for doc in docs:
        corpus.append(doc['title'])
    vectorizedCorpus = vectorizer.fit_transform(corpus)

    # print vocabulary
    #for i, w in enumerate(vectorizer.get_feature_names()):
    #    print w, vectorizer.idf_[i]

    # run k-means with different nCluster and random seed
    for nCluster in range(4, 10):

        print '\n clusters:', nCluster

        for seed in range(0,1):

            ######### k-means ###########
            km = KMeans(n_clusters=nCluster, random_state=seed)
            km.fit(vectorizedCorpus)

            # store inertia and clusters
            print '\t seed:', seed, '\t-->', km.inertia_
            #for centroid in km.cluster_centers_:
            #    print '\t\t', getMostImportantWords(centroid, vectorizer)
            #############################

            ######### matrix factorization ###########
            #mf = NMF(n_components=nCluster, random_state=seed)
            #mf = LatentDirichletAllocation(n_topics=nCluster, random_state=seed)
            #mf.fit(vectorizedCorpus)

            # store inertia and clusters
            #print '\t seed:', seed#, '\t-->', mf.reconstruction_err_
            #for comp in mf.components_:
            #    print '\t\t', getMostImportantWords(comp, vectorizer)
            #############################

            ######## examples ###########
            #print '=============='
            #for i, doc in enumerate(corpus):
            #    print doc
            #    print mf.transform(vectorizedCorpus[i]), '\n'
            #print '==============\n'


    # take best run of k-means (minimal inertia)

    # assign each document a cluster and yield
    for doc in docs:
        doc["cluster"] = 23
        yield doc

def tokenizeAndClean(text):

    # all lowercase
    text = text.lower()

    # take away punctuation and numbers
    symbols = string.punctuation + '1234567890'
    for symbol in symbols:
        text = text.replace(symbol, ' ')

    tokens = text.split(' ')

    #return tokens
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

    # cluster the docs
    for d in cluster(docs):
        2#print d
