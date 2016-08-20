import random
def cluster(docs):
    num = 10
    hashes = ['C'+str(random.getrandbits(128)) for i in range(1,num+1)]
    for doc in docs:
        doc["cluster"] = random.choice(hashes)
        yield doc
