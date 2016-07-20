
var albopop = {
    poi: [
        {
            'name': 'Roma',
            'coords': [41.9, 12.5],
        },
        {
            'name': 'Firenze',
            'coords': [43.78, 11.25],
        },
        {
            'name': 'Genova',
            'coords': [44.41, 8.93],
        },
        {
            'name': 'Bologna',
            'coords': [44.49, 11.34],
        },
        {
            'name': 'Napoli',
            'coords': [40.85, 14.26],
        },
    ],
};
    

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
    
    // build word cloud
    var cloudWords = $('#howto').text().split(' ');
    var wordCounts = _.reduce(cloudWords, function(memo, w){
        if( _.has(memo, w) ){
            memo[w] += 1;
        } else {
            memo[w] = 1;
        }
        return memo;
        
    }, {});
    wordCounts = _.map(wordCounts, function(wc, w){
        return {
            text: w,
            size: wc * 10
        }
    });
    
    var cloudSize = $('#word-cloud-container').width();
    albopop.cloudLayout = d3.layout.cloud()
        .size([cloudSize, cloudSize])
        .words(wordCounts)
        .fontSize(function(d) { return d.size; })
        .rotate(0)
        .padding(5)
        .on('end', drawCloud);
    albopop.cloudLayout.start();    // method 'start' not chainable (returns undefined)
    
    // events
    $('#search').change(function(){
        
        // extract query
        var query = $('#search').val();
        
        // loading...
        $('#loading-modal').modal({
            backdrop: 'static',
            keyboard: false
        });
        
        // ask elasticsearch
        albopop.elastic.search({
            body: composeQuery(query)
        }, function(error, response){
            if(error){
                console.error(error);
            } else {
                console.log(response);
            }
            
            // close loading modal
            $('#loading-modal').modal('hide');
        });
        
    });
    // launch first click automagically
    $('#search').change();
});

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

    _.each(albopop.poi, function(p){
        var marker = L.marker(p.coords).addTo(albopop.map);
        marker.bindPopup(p.name);
    });
}

function drawCloud(words){
    
    var layout = albopop.cloudLayout;
    
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