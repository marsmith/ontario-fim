const request = require('request');
var parseString = require('xml2js').parseString;

var siteListRDG = ['0421964005','04219768','0422018605','04220259','0423205040','0423207760','04232133','04250516','04260535'];
var siteListPermanant = ['04219796','04220209','04220253','0423205342','0423207760','04232093','04249071','04250772'];

var siteServiceURL = 'https://waterservices.usgs.gov/nwis/site';

var featureCollection = {
    "type": "FeatureCollection",
    "features": []
}

request({url:siteServiceURL, qs:{format: 'mapper', sites: siteListRDG.join(',')}}, (err, res, body) => {
  if (err) { return console.log(err); }
  parseString(body, function (err, result) {
    for (let sites of result.mapper.sites) {

        for (let site of sites.site) {
            var siteData = site['$'];
            console.log('sites',JSON.stringify(siteData))
            siteData.type = 'RDG';
            var feature = {
                'type': 'Feature',
                'geometry': {
                   'type': 'Point',
                   'coordinates':  [ parseFloat(siteData.lng), parseFloat(siteData.lat) ]
                },
                'properties': siteData
            };
            featureCollection.features.push(feature)

        }
    }
  });
});

request({url:siteServiceURL, qs:{format: 'mapper', sites: siteListPermanant.join(',')}}, (err, res, body) => {
    if (err) { return console.log(err); }
    parseString(body, function (err, result) {
      for (let sites of result.mapper.sites) {
  
          for (let site of sites.site) {
              var siteData = site['$'];
              console.log('sites',JSON.stringify(siteData))
              siteData.type = 'Permanant';
              var feature = {
                  'type': 'Feature',
                  'geometry': {
                     'type': 'Point',
                     'coordinates':  [ parseFloat(siteData.lng), parseFloat(siteData.lat) ]
                  },
                  'properties': siteData
              };
              featureCollection.features.push(feature)
  
          }
      }
    });

    console.log(JSON.stringify(featureCollection))
  });



