
var albopop = {};

var nonClickedMarker = L.icon({
    iconUrl: 'node_modules/leaflet/dist/images/marker-icon.png',
    shadowUrl: 'node_modules/leaflet/dist/images/marker-shadow.png',
    popupAnchor: [0, -35],
});
        
var clickedMarker = L.icon({
    iconUrl: 'assets/marker-icon-red.png',
    shadowUrl: 'node_modules/leaflet/dist/images/marker-shadow.png',
    popupAnchor: [0, -35],
});
    

$(document).ready(function(){
    
    // connect to elasticsearch
    albopop.elastic = new elasticsearch.Client({
        host: [{
            host: 'es.dataninja.it',
            port: 80,
            auth: 'albopop:albobob'
        }],
        log: 'info'
    });
    
    // build and draw map
    albopop.map = L.map('map-container').setView([41.9, 12.5], 5);
    $.get('assets/italy-regions.json', {}, drawMap);
    
    // load Comuni and their coordinates
    d3.csv('assets/comuni.csv', function(comuni){
        if(comuni){
            albopop.poi = comuni.reduce(function(memo, c){
                memo[c.label] = c;
                return memo;
            }, {});
        }
    });
    
    // events
    $('#search').change(function(){
        
        // clean up UI
        cleanAll();
        
        // extract query
        var query = $('#search').val();
        
        // loading...
        $('#loading-modal').modal({
            backdrop: 'static',
            keyboard: false
        });
        
        // ask elasticsearch
        albopop.elastic.search({
            index: "albopop-v3-*",
            type: "rss_item",
            body: composeQuery(query)
        }, function(error, response){
            if(error){
                console.error(error);
            }
            console.log(response);
            
            // close loading modal
            $('#loading-modal').modal('hide');
            
            // store data for word clouds and docs list
            albopop.data = {
                generalWordCloud: response.aggregations.words.buckets,
                citiesWordClouds: response.aggregations.locations.buckets
            };
            
            // update UI
            updateAll();
        });        
    });
    // launch first click automagically
    $('#search').change();
});

function cleanAll(){
    
    // delete old markers
    _.each(albopop.markers, function(m){
        albopop.map.removeLayer(m);
    });
    albopop.markers = [];
    
    // delete cloud
    $('#word-cloud-container svg').remove();
    
    // delete articles
    $('#search-results').empty();
}

function updateAll(){
    
    // draw new markers
    _.each(albopop.data.citiesWordClouds, function(city){
        var cityName = city.key;
        var cityLat  = albopop.poi[cityName].lat;
        var cityLon  = albopop.poi[cityName].lon;
        
        var marker = L.marker(
                [cityLat, cityLon],
                {
                    title: cityName
                }
        ).addTo(albopop.map);
        marker.bindPopup(cityName);
        marker.on('click', markerClicked);
        albopop.markers.push(marker);
    });
}

function markerClicked(event){
    
    // highlight marker
    _.each(albopop.markers, function(m){    // reset all markers' colors
        m.setIcon(nonClickedMarker);
    });
    this.setIcon(clickedMarker);
    
    // prepare data
    var cityName = this.options.title;
    var cityData = _.find(albopop.data.citiesWordClouds, function(c){
        return (c.key == cityName);
    });
    var cityWords = cityData.words.buckets;
    var cityDocs  = cityData.hits.hits.hits;
    
    // populate articles list
    $('#search-results').empty();
    _.each(cityDocs, function(doc){
        //console.log(doc);
        $('#search-results').append(
            '<div>' +
                //'<h4>' + doc._source.message + '</h4>' +
                '<p>' + doc._source.title + '</p>' +
            '</div><hr/>' 
        );
    });
    
    // build word cloud
    var cloudSize = $('#word-cloud-container').width();
    albopop.cloudLayout = d3.layout.cloud()
        .size([cloudSize, cloudSize])
        .words(cityWords)
        .text(function(d){
            return d.key;
        })
        .fontSize(function(d) {
            return d.score;// d.doc_count
        })
        .rotate(0)
        .padding(5)
        .on('end', drawCloud);
    albopop.cloudLayout.start();    // method 'start' not chainable (returns undefined)
}

function drawMap(italyGeoJSON){
        
    /*L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        maxZoom: 18,
    }).addTo(albopop.map);*/

    L.geoJson(italyGeoJSON, {
        style: function(feat){
            return {
                weight: 1,
                color: 'black',
                fillOpacity: 0.05
            }
        }
    }).addTo(albopop.map);
}

function drawCloud(words){
    
    var layout = albopop.cloudLayout;
    
    $('#word-cloud-container svg').remove();
    d3.select('#word-cloud-container').append('svg')
        .attr('width', layout.size()[0])
        .attr('height', layout.size()[1])
        .append('g')
        .attr('transform', 'translate(' + layout.size()[0]/2 + ',' + layout.size()[1]/2 + ')')
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .attr('transform', function(d){
            return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
        })
        .attr('text-anchor', 'middle')
        .style('font-size', function(d){
            return d.size;
        })
        .style('fill', function(d, i){
            var colorIndex = i % 20;
            return d3.schemeCategory20[colorIndex];
        })
        .text(function(d){ return d.text });
}