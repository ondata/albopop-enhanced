<?php

# Standard libs loading by composer:
# https://getcomposer.org/doc/00-intro.md
require_once __DIR__ . '/vendor/autoload.php';

use Elasticsearch\Client;

function fromEs($search,$location,$size) {

    if ($search or $location) {

        $query = [
            "bool" => [
                "must" => []
            ]
        ];

        if ($search) {
            $query['bool']['must'][] = [
                "match" => [
                    "title" => $search
                ]
            ];
        }

        if ($location) {
            $query['bool']['must'][] = [
                "term" => [
                    "source.location" => $location
                ]
            ];
        }

    } else {

        $query = [ "match_all" => [] ];
        
    }

	# Query last items from Elasticsearch documents:
	# https://www.elastic.co/guide/en/elasticsearch/client/php-api/current/_search_operations.html
	$client = new Elasticsearch\Client();

	$today = new DateTime();
    $fifteendaysago = (new DateTime())->add(DateInterval::createFromDateString('15 days ago'));
	$prefix = "albopop-v2";
    $indices = [];
    $dts = new DatePeriod(
        $fifteendaysago,
        new DateInterval('P1D'),
        $today
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
		"index" => "albopop-v2-*", //join(",",$indices),
		"type" => "rss_item",
		"body" => $body
	];

	return $client->search($params);

}
?>
