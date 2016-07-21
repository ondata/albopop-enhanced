<?php

# Constants
define('PARAM_FORMAT', 'format');
define('DEFAULT_FORMAT', 'rss');
define('PARAM_SEARCH', 'search');
define('DEFAULT_SEARCH', '');
define('PARAM_WITHOUT', 'without');
define('DEFAULT_WITHOUT', '');
define('PARAM_LOCATION', 'location');
define('DEFAULT_LOCATION', '');
define('PARAM_SIZE', 'size');
define('DEFAULT_SIZE', 25);

# Customization by GET params
$format = isset($_GET[PARAM_FORMAT]) ? $_GET[PARAM_FORMAT] : DEFAULT_FORMAT;
$search = isset($_GET[PARAM_SEARCH]) ? $_GET[PARAM_SEARCH] : DEFAULT_SEARCH;
$without = isset($_GET[PARAM_WITHOUT]) ? $_GET[PARAM_WITHOUT] : DEFAULT_WITHOUT;
$location = isset($_GET[PARAM_LOCATION]) ? $_GET[PARAM_LOCATION] : DEFAULT_LOCATION;
$size = (isset($_GET[PARAM_SIZE]) and is_numeric($_GET[PARAM_SIZE])) ? (int)$_GET[PARAM_SIZE] : DEFAULT_SIZE;

require __DIR__ . '/fromes.inc.php';

switch($format) {
	case 'json':
		require __DIR__ . '/tojson.inc.php';
		header('Content-type: application/json');
		echo toJson(fromEs($search,$without,$location,$size));
		break;
	case 'rss':
	default:
		require __DIR__ . '/torss.inc.php';
		header('Content-type: application/rss+xml');
		echo toRss(fromEs($search,$without,$location,$size));
		break;
}
?>
