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
        mwords = 5,
        hnav = $("#header nav").height(),
        activeMarker = null;

    $("body").css({"padding-top":hnav});
    
    var $container        = $("#main-container"),
        $form             = $("#form"),
        $inputs           = $form.find("input, button"),
        $must             = $("#must"),
        $must_not         = $("#must_not"),
        $submit           = $("#btn-submit"),
        $reset            = $("#btn-reset"),
        $wordcloud        = $("#word-cloud-container"),
        $generalWordCloud = $("#background")
        $map              = $("#map-container"),
        $cluster          = $("#cluster-container"),
        $list             = $("#list-container"),
        $modal            = $("#loading-modal"),
        $switch           = $("[name='toggle-map']"),
        $rss              = $("#rss");

    $inputs.prop('disabled',true);
    $inputs.on("input",updateRss);
    
    $switch.bootstrapSwitch();
    $switch.on('switchChange.bootstrapSwitch', function(event, state) {
        $container.toggle(!state);
    });


    function updateRss() {
        var s = $must.val(),
            w = $must_not.val(),
            l = activeMarker;
        $rss.attr("href", buildRss(s,w,l));
    }

    function buildRss(s,w,l) {
        return "feed/?search="+(s||"")+"&without="+(w||"")+"&location="+(l||"");
    }

    function track() {
        var s = $must.val(),
            w = $must_not.val(),
            l = activeMarker;
        $.get("tracker/", { search: s, without: w, location: l });
    }
    
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
    var mapSize = $map.width(),
        mapOptions = {
            scrollWheelZoom: false
        };
    $map.height(mapSize*1.2);
    albopop.map = L.map('map-container', mapOptions).setView([41.9, 12.5], 5);
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
        updateRss();
        
        // extract query
        var query = {
               "must": $must.val(),
               "must_not": $must_not.val()
            },
            today = new Date(),
            indices = getDates(addDays(today, -14), today)
                .map(function(dt) { return "albopop-v3-"+dt.toISOString().slice(0,10).replace(/-/g,"."); })
                .join(",");
        
        // loading...
        $modal.modal({
            backdrop: 'static',
            keyboard: false
        });

        $(".panel-heading .badge").text("");
        // ask elasticsearch
        albopop.elastic.search({
            index: indices,
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
                citiesWordClouds: response.aggregations.locations.buckets,
                clusterWordClouds: response.aggregations.clusters.buckets
            };

            if (!$("#elenco-comuni").text()) {
                $("#elenco-comuni").text(response.aggregations.locations.buckets.map(function(l) { return l.key; }).join(", "));
            };

            $("#word-cloud-panel .badge").text(response.aggregations.words.buckets.length);
            $("#list-panel .badge").text(response.hits.hits.length + "/" + response.hits.total);
            $("#map-panel .badge").text(response.aggregations.locations.buckets.length);
            
            // update UI
            updateAll();
        });

        track();
    });

    $reset.click(function(e) {
        $must.val("");
        $must_not.val("");
        $form.submit();
        e.preventDefault();
    });

    function cleanAll(){
        
        // delete old markers
        _.each(albopop.markers, function(m){
            albopop.map.removeLayer(m);
        });
        albopop.markers = [];
        
        // delete clouds
        $wordcloud.empty();
        $generalWordCloud.empty();
        $cluster.empty();
        
        // delete articles
        $list.empty();
    }

    function updateAll(){
        
        //populateGeneralCloud(albopop.data.citiesWordClouds); // general cloud as a background
        populateCloud(albopop.data.generalWordCloud);        // general cloud is initially run also in the small cloud box
        populateCluster(albopop.data.clusterWordClouds);
        populateMap(albopop.data.citiesWordClouds);
        populateMap(albopop.data.citiesWordClouds);
        populateList(albopop.data.generalListItems);
        
    }

    function populateCluster(items) {

        d3.select("#cluster-container p").remove();

        var clusters = d3.select("#cluster-container")
            .selectAll(".cluster")
            .data(items, function(d) { return d.key; });
        
        clusters
            .enter()
            .append("div")
            .attr("class","cluster col-xs-3")
            .on("click", function(d) {
                if (d3.select(this).classed("active")) {
                    populateList(albopop.data.generalListItems);
                    d3.select(this).classed("active",false);
                } else {
                    d3.select("#cluster-container").selectAll(".cluster").classed("active",false);
                    d3.select(this).classed("active",true);
                    var clusterData = _.find(albopop.data.clusterWordClouds, function(c){
                        return (c.key == d.key);
                    });
                    activeMarker = null;
                    _.each(albopop.markers, function(m){    // reset all markers' colors
                        m.setIcon(nonClickedMarker);
                        m.closePopup();
                    });
                    var clusterDocs  = clusterData.hits.hits.hits;
                    populateList(clusterDocs);
                }
            })
            .append("svg")
            .attr("width", function() { return Math.floor($(this).parent().width()); })
            .attr("height", function() { return Math.floor($(this).parent().width()); })
            .append("g")
            .attr("transform", function() {
                var w = +$(this).parent().attr("width");
                return "translate("+(w/2)+","+(w/2)+")";
            });

        clusters.exit().remove();

        d3.select("#cluster-container")
            .selectAll(".cluster")
            .select("svg > g")
            .each(function(d) {

                var cloud = d3.layout.cloud();

                var container = d3.select(this),
                    w = +$(this).parent().attr("width"),
                    items = d.words.buckets,
                    l = function(d) { return d.doc_count || 1; },
                    s = d3.scale.sqrt().domain(d3.extent(items.map(l))).range([8,32]),
                    c = d3.scale.category20();

                cloud
                    .size([w,w])
                    .words(items)
                    .text(function(d) { return d.key; })
                    .fontSize(function(d) { return s(l(d)); })
                    .font("Impact")
                    .rotate(function() { return ~~(Math.random() * 2) * 0; })
                    .padding(2)
                    .square(true)
                    .on('end', function(d) {

                        var words = container.selectAll('text')
                            .data(d, function(d) { return d.text; });

                        words
                            .attr('transform', function(d){
                                return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
                            })
                            .style('font-size', function(d){
                                return d.size + 'px';
                            })
                            /*.style('fill', function(d, i){
                                var colorIndex = i % 20;
                                return c(colorIndex);
                            })*/
                            .text(function(d){ return d.text });

                        words
                            .enter()
                            .append('text')
                            .attr('transform', function(d){
                                return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
                            })
                            .attr('text-anchor', 'middle')
                            .style('font-family', 'Impact')
                            .style('font-size', function(d){
                                return d.size + 'px';
                            })
                            .style('fill', function(d, i){
                                var colorIndex = i % 20;
                                return c(colorIndex);
                            })
                            .text(function(d){ return d.text });

                        words.exit().remove();

                    });

                cloud.start();
            });

        if (!items || !items.length) {
            d3.select("#cluster-container").append("p").text("Nessun cluster trovato...");
        }
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
        if (items && items.length) {
            _.each(items, function(doc){
                //console.log(doc);
                var d = doc['_source'];
                $list.append(
                    '<a href="'+d.link+'" target="_blank" class="list-group-item">' +
                        '<h4 class="list-group-item-heading">Da ' + d.source.title + ' il ' + d['@timestamp'] + '</h4>' +
                        '<p class="list-group-item-text">' + d.title + '</p>' +
                        '<p class="list-group-item-tags">'+d.source.tags.map(function(t) { return '<span class="label label-info">'+t+'</span>'; })+'</p>' + 
                    '</a>' 
                );
            });
        } else {
            $list.append(
                '<a href="#" class="list-group-item">' +
                    '<p class="list-group-item-text">Nessun documento trovato...</p>' +
                '</a>' 
            );
        }
        
    }
    
    function populateGeneralCloud(buckets) {

        var items = [],
            width = $generalWordCloud.width(),
            height = $generalWordCloud.height()-hnav,
            projection = d3.geo.albers()
                .center([0,40])
                .rotate([347,0])
                .parallels([35,45])
                .translate([width / 2, height / 2])
                .scale(6000);

        buckets.forEach(function(l,i) {
            if (_.has(albopop.poi,l.key)) {
                l.words.buckets.forEach(function(w,i) {
                    if (i < mwords) {
                        items.push({
                            "text": w.key,
                            "value": w.score,
                            "cluster": l.key,
                            "center": projection([+albopop.poi[l.key].lon,+albopop.poi[l.key].lat])
                        });
                    }
                });
            }
        });
        
        // build background word cloud
        var l = function(d) { return d.value || 1; },
            s = d3.scale.sqrt().domain(d3.extent(items.map(l))).range([10,42]);

        albopop.generalCloudLayout = d3.layout.cloud()
            .size([width,height])
            .words(items)
            .text(function(d){
                return d.text;
            })
            .fontSize(function(d) {
                return s(l(d));
            })
            .font("Impact")
            .rotate(function() { return ~~(Math.random() * 2) * 0; })
            .padding(2)
            .square(true)
            .on('end', drawGeneralCloud);

        albopop.generalCloudLayout.start();    // method 'start' not chainable (returns undefined)
    }
    
    function populateCloud(items) {

        if (items && items.length) {
            // build word cloud
            $wordcloud.find("p").remove();
            var cloudSize = $wordcloud.width(),
                l = function(d) { return d.score || d.doc_count || 1; },
                s = d3.scale.sqrt().domain(d3.extent(items.map(l))).range([10,36]);
            albopop.cloudLayout = d3.layout.cloud()
                .size([cloudSize, cloudSize])
                .words(items)
                .text(function(d){
                    return d.key;
                })
                .fontSize(function(d) {
                    return s(l(d));
                })
                .font("Impact")
                .rotate(0)
                .padding(2)
                .on('end', drawCloud);
            albopop.cloudLayout.start();    // method 'start' not chainable (returns undefined)
        } else {
            $wordcloud.append("p").text("Nessuna parola trovata...");
        }
    }

    function markerClicked(event){
        
        // highlight marker
        _.each(albopop.markers, function(m){    // reset all markers' colors
            m.setIcon(nonClickedMarker);
        });
        d3.select("#cluster-container").selectAll(".cluster").classed("active",false);

        if (activeMarker != this.options.title) {
            activeMarker = this.options.title;
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
            populateCloud(albopop.data.generalWordCloud);
            populateList(albopop.data.generalListItems);
        }

        updateRss();
        track();
        
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
        
        var layout = albopop.cloudLayout,
            s = d3.scale.category20();
        
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
            .style('font-family', 'Impact')
            .style('font-size', function(d){
                return d.size + "px";
            })
            .style('fill', function(d, i){
                var colorIndex = i % 20;
                return s(colorIndex);
            })
            .text(function(d){ return d.text })
            .on("mouseover", function(d) {
                $list.find("a").each(function() {
                    if ($(this).find(".list-group-item-text").text().toLowerCase().indexOf(d.text.toLowerCase()) > -1) {
                        $(this).addClass("active");
                    }
                });
            })
            .on("mouseout", function(d) {
                $list.find("a").removeClass("active");
            });
    }

    function drawGeneralCloud(words){
        
        var layout = albopop.generalCloudLayout;
        
        $generalWordCloud.empty();
        d3.select('#background').append('svg')
            .attr('width', layout.size()[0])
            .attr('height', layout.size()[1])
            .append('g')
            .attr('transform', 'translate(' + layout.size()[0]/2 + ',' + (layout.size()[1]/2+hnav) + ')')
            .selectAll('text')
            .data(words)
            .enter()
            .append('text')
            .attr('transform', function(d){
                return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
            })
            .attr('text-anchor', 'middle')
            .style('font-family', 'Impact')
            .style('font-size', function(d){
                return d.size + 'px';
            })
            .style('fill', '#666')
            .text(function(d){ return d.text });
    }
});

var getDates = function(startDate, endDate) {
  var dates = [],
      currentDate = startDate,
      addDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
      };
  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addDays.call(currentDate, 1);
  }
  return dates;
};

var addDays = function(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
