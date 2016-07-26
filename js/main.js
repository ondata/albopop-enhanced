$(function(){

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

    var queue = 0,
        mqueue = 2,
        activeMarker = null;
    
    var $form = $("#form-container"),
        $inputs = $form.find("input, button"),
        $must = $("#must"),
        $must_not = $("#must_not"),
        $submit = $("#submit"),
        $wordcloud = $("#word-cloud-container"),
        $map = $("#map-container"),
        $list = $("#list-container"),
        $modal = $("#loading-modal");

    $inputs.prop('disabled',true);
    
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
            if (++queue === mqueue) {
                $inputs.prop('disabled',false);
                $form.submit();
            }
        }
    });
    
    // events
    $form.submit(function(e){

        e.preventDefault();
        
        // clean up UI
        cleanAll();
        
        // extract query
        var query = {
            "must": $must.val(),
            "must_not": $must_not.val()
        };
        
        // loading...
        $modal.modal({
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
                return;
            }
            console.log(response);
            
            // close loading modal
            $modal.modal('hide');
            
            // store data for word clouds and docs list
            albopop.data = {
                generalListItems: response.hits.hits,
                generalWordCloud: response.aggregations.words.buckets,
                citiesWordClouds: response.aggregations.locations.buckets
            };
            
            // update UI
            updateAll();
        });        
    });

    function cleanAll(){
        
        // delete old markers
        _.each(albopop.markers, function(m){
            albopop.map.removeLayer(m);
        });
        albopop.markers = [];
        
        // delete cloud
        $wordcloud.empty();
        
        // delete articles
        $list.empty();
    }

    function updateAll(){

        populateCloud(albopop.data.generalWordCloud);
        populateMap(albopop.data.citiesWordClouds);
        populateList(albopop.data.generalListItems);
        
    }

    function populateMap(items) {
        // draw new markers
        _.each(items, function(city){
            var cityName = city.key;
            var cityLat  = _.has(albopop.poi,cityName) ? albopop.poi[cityName].lat : 0;
            var cityLon  = _.has(albopop.poi,cityName) ? albopop.poi[cityName].lon : 0;
            
            if (cityLat && cityLon) {
                var marker = L.marker(
                        [cityLat, cityLon],
                        {
                            title: cityName
                        }
                ).addTo(albopop.map);
                marker
                    .bindPopup(cityName,{closeButton:false})
                    .on('click', markerClicked);
                albopop.markers.push(marker);
            }
        });
    }

    function populateList(items) {
        // populate articles list
        $list.empty();
        _.each(items, function(doc){
            //console.log(doc);
            var d = doc['_source'];
            $list.append(
                '<a href="'+d.link+'" target="_blank" class="list-group-item">' +
                    '<h4 class="list-group-item-heading">' + d.updated + '</h4>' +
                    '<p class="list-group-item-text">' + d.title + '</p>' +
                    '<p class="list-group-item-tags">'+d.source.tags.map(function(t) { return '<span class="label label-info">'+t+'</span>'; })+'</p>' + 
                '</a>' 
            );
        });
        
    }
    
    function populateCloud(items) {
        // build word cloud
        var cloudSize = $wordcloud.width();
        albopop.cloudLayout = d3.layout.cloud()
            .size([cloudSize, cloudSize])
            .words(items)
            .text(function(d){
                return d.key;
            })
            .fontSize(function(d) {
                return d.score || d.doc_count || 1;
            })
            .rotate(0)
            .padding(5)
            .on('end', drawCloud);
        albopop.cloudLayout.start();    // method 'start' not chainable (returns undefined)
    }

    function markerClicked(event){
        
        // highlight marker
        _.each(albopop.markers, function(m){    // reset all markers' colors
            m.setIcon(nonClickedMarker);
        });

        if (activeMarker != this._leaflet_id) {
            activeMarker = this._leaflet_id;
            this.setIcon(clickedMarker);
            
            // prepare data
            var cityName = this.options.title;
            var cityData = _.find(albopop.data.citiesWordClouds, function(c){
                return (c.key == cityName);
            });
            var cityWords = cityData.words.buckets;
            var cityDocs  = cityData.hits.hits.hits;

            populateList(cityDocs);
            populateCloud(cityWords);
        } else {
            activeMarker = null;
            updateAll();
        }
        
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
        
        if (++queue === mqueue) {
            $inputs.prop('disabled',false);
            $form.submit();
        }
    }

    function drawCloud(words){
        
        var layout = albopop.cloudLayout;
        
        $wordcloud.empty();
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
});

