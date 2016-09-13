<?php

# Standard libs loading by composer:
# https://getcomposer.org/doc/00-intro.md
require_once __DIR__ . '/vendor/autoload.php';

use Elasticsearch\Client;

function fromEs($search,$without,$location,$tags,$size) {

    if ($search or $without or $location or $tags[0]) {

        $query = [ "bool" => [] ];

        if ($search) {
            $query['bool']['must'] = $query['bool']['must'] or [];
            $query['bool']['must'][] = [
                "match" => [
                    "title" => $search
                ]
            ];
        }

        if ($without) {
            $query['bool']['must_not'] = $query['bool']['must_not'] or [];
            $query['bool']['must_not'][] = [
                "match" => [
                    "title" => $without
                ]
            ];
        }

        if ($location) {
            $query['bool']['must'] = $query['bool']['must'] or [];
            $query['bool']['must'][] = [
                "term" => [
                    "source.location" => $location
                ]
            ];
        }

        if ($tags[0]) {
            $query['bool']['must'] = $query['bool']['must'] or [];
            $query['bool']['must'][] = [
                "terms" => [
                    "source.tags" => $tags
                ]
            ];
        }

    } else {

        $query = [ "match_all" => [] ];
        
    }

	# Query last items from Elasticsearch documents:
	# https://www.elastic.co/guide/en/elasticsearch/client/php-api/current/_search_operations.html
	$client = new Elasticsearch\Client();

    $tomorrow = (new DateTime())->add(DateInterval::createFromDateString('tomorrow'));
    $fourteendaysago = (new DateTime())->add(DateInterval::createFromDateString('14 days ago'));
	$prefix = "albopop-v3";
    $indices = [];
    $dts = new DatePeriod(
        $fourteendaysago,
        new DateInterval('P1D'),
        $tomorrow
    );

    foreach ($dts as $dt) {
        $indices[] = $prefix . "-" . $dt->format('Y.m.d');
    }

    $body = [
        "query" => $query
    ];

	$body["size"] = $size;
	$body["sort"] = [ [ "@timestamp" => "desc" ] ];

	$params = [
		"index" => join(",",$indices),
        "type" => "rss_item",
        "ignore_unavailable" => true,
		"body" => $body
	];

	return $client->search($params);

}
?>
