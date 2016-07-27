<?php

# Constants
define('PARAM_SEARCH', 'search');
define('DEFAULT_SEARCH', '');
define('PARAM_WITHOUT', 'without');
define('DEFAULT_WITHOUT', '');
define('PARAM_LOCATION', 'location');
define('DEFAULT_LOCATION', '');

# Customization by GET params
$search = isset($_GET[PARAM_SEARCH]) ? $_GET[PARAM_SEARCH] : DEFAULT_SEARCH;
$without = isset($_GET[PARAM_WITHOUT]) ? $_GET[PARAM_WITHOUT] : DEFAULT_WITHOUT;
$location = isset($_GET[PARAM_LOCATION]) ? $_GET[PARAM_LOCATION] : DEFAULT_LOCATION;

require __DIR__ . '/toes.inc.php';
require __DIR__ . '/tojson.inc.php';

header('Content-type: application/json');
echo toJson(toEs($search,$without,$location,$ua));

?>
