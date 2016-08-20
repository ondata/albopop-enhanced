<?php

# Standard libs loading by composer:
# https://getcomposer.org/doc/00-intro.md
require_once __DIR__ . '/vendor/autoload.php';

use Elasticsearch\Client;

function toEs($search,$without,$location) {

	# Query last items from Elasticsearch documents:
	# https://www.elastic.co/guide/en/elasticsearch/client/php-api/current/_search_operations.html
	$client = new Elasticsearch\Client();

	$today = new DateTime();
    $prefix = "albopop-tracker-v1";

    $body = [
        "timestamp" => $today->getTimestamp(),
        "search" => $search,
        "without" => $without,
        "location" => $location,
        "ua" => $_SERVER['HTTP_USER_AGENT'],
        "ip" => filter_var($_SERVER['REMOTE_ADDR'], FILTER_VALIDATE_IP, FILTER_NULL_ON_FAILURE),
        "get" => !empty($_GET) ? $_GET : null,
        "post" => !empty($_POST) ? $_POST : null
    ];

	$params = [
		"index" => $prefix . "-" . $today->format('Y.m.d'),
        "type" => "tracked_event",
		"body" => $body
	];

	return $client->index($params);

}
?>
