<?php

# Standard libs loading by composer:
# https://getcomposer.org/doc/00-intro.md
require_once __DIR__ . '/vendor/autoload.php';

use Suin\RSSWriter\Channel;
use Suin\RSSWriter\Feed;
use Suin\RSSWriter\Item;

function toRss($results) {

	# Following official documentation:
	# https://github.com/suin/php-rss-writer#suinrsswriter
	$feed = new Feed();
	$channel = new Channel();

	# Feed meta-data
	$channel
		->title("AlboPOP Enhanced")
		->description("Lista degli ultimi documenti pubblicati negli albi pretori italiani")
		->url("http://albopop.it/")
		->appendTo($feed);

	# Feed population
	foreach ($results['hits']['hits'] as $result) {

		$doc = $result['_source'];
        $id = $result['_id'];
        $title = substr($doc['title'],0,177);
		$item = new Item();

		$item
			->title("[" . $doc['source']['location'] . "] " . $title . ($title == $doc['title'] ? "" : "..."))
            ->description($doc['title']);

        if (isset($doc['source']['tags'])) {
            foreach ($doc['source']['tags'] as $tag) {
                $item->category($tag);
            }
        }

        if (strpos(parse_url($doc['link'], PHP_URL_PATH), '.pdf') !== false) {
            $item->enclosure($doc['link'], rand(1000,10000), 'application/pdf');
        }

		$item
			->guid($id)
			->pubDate(strtotime($doc['@timestamp']))
			->url($doc['link'])
			->appendTo($channel);

	}

	return $feed;

}
?>
