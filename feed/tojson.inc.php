<?php
function toJson($results) {
	function getSource($doc) {
		return $doc['_source'];
	}
	return json_encode(array_map('getSource',$results['hits']['hits']));
}
?>
