var composeQuery = function(query){
    
    if(!query){
        queryCommand = {
            "match_all": {}
        }
    } else {
        queryCommand = {
            "match": {
                "title": query
            }
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
            "words": {
                "terms": {
                    "field": "title",
                    "size": 25
                }
            },
            "locations": {
                "terms": {
                    "field": "source.location",
                    "size": 0
                },
                "aggs": {
                    "words": {
                        "significant_terms": {
                            "field": "title",
                            "min_doc_count": 1,
                            "size": 25
                        },
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
                        }
                    },
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
            }
        }
    }
}