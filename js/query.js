var composeQuery = function(query){
    
    if(!query || (!query.must && !query.must_not && !query.must_tags.length)){

        queryCommand = {
            "match_all": {}
        };

    } else {

        queryCommand = {
            "bool": {}
        };

        if(query.must) {
            queryCommand.bool.must = queryCommand.bool.must || [];
            queryCommand.bool.must.push({
                "match": {
                    "title": query.must
                }
            });
        }

        if(query.must_tags.length) {
            queryCommand.bool.must = queryCommand.bool.must || [];
            queryCommand.bool.must.push({
                "terms": {
                    "tags": query.must_tags
                }
            });
        }

        if(query.must_not) {
            queryCommand.bool.must_not = queryCommand.bool.must_not || [];
            queryCommand.bool.must_not.push({
                "match": {
                    "title": query.must_not
                }
            });
        }

    }
    console.log('Query:', queryCommand);
    
    return {
        "size": 25,
        "sort": [
            {
                "@timestamp": {
                    "order": "desc"
                }
            }
        ],
        "query": queryCommand,
        "aggs": {
            "clusters": {
                "terms": {
                    "field": "cluster",
                    "size": 8
                },
                // Word cloud per cluster
                "aggs": {
                    "words": {
                        "terms": {
                            "field": "title",
                            "size": 25
                        }
                    },
                    // Documenti per cluster
                    "hits": {
                        "top_hits": {
                            "size": 25,
                            "sort": [
                                {
                                    "@timestamp": {
                                        "order": "desc"
                                    }
                                }
                            ]
                        }
                    }
                }
            },
            // Word cloud generale
            "words": {
                "terms": {
                    "field": "title",
                    "size": 25
                }
            },
            "tags": {
                "terms": {
                    "field": "tags",
                    "size": 0
                }
            },
            "locations": {
                "terms": {
                    "field": "source.title",
                    "size": 0
                },
                "aggs": {
                    // Word cloud per comune
                    "words": {
                        "significant_terms": {
                            "field": "title",
                            "min_doc_count": 1,
                            "size": 25
                        }/*,
                        "aggs": {
                            "hits": {
                                "top_hits": {
                                    "size": 25,
                                    "fields": [],
                                    "sort": [
                                        {
                                            "@timestamp": {
                                                "order": "desc"
                                            }
                                        }
                                    ]
                                }
                            }
                        }*/
                    },
                    // Documenti per comune
                    "hits": {
                        "top_hits": {
                            "size": 25,
                            "sort": [
                                {
                                    "@timestamp": {
                                        "order": "desc"
                                    }
                                }
                            ]
                        }
                    }
                }
            }/*,
            "hits": {
                "top_hits": {
                    "size": 25,
                    "fields": [],
                    "sort": [
                        {
                            "@timestamp": {
                                "order": "desc"
                            }
                        }
                    ]
                }
            }*/
        }
    };
}
