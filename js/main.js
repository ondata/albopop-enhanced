
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
    
    // build and draw map
    albopop.map = L.map('map-container').setView([41.9, 12.5], 5);
    $.get('assets/italy-regions.json', {}, drawMap);
    
    // build word cloud
    albopop.wordCloud = 
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