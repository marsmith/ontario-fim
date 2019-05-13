// ------------------------------------------------------------------------------
// ----- Ontario FIM -----------------------------------------------------------------
// ------------------------------------------------------------------------------

// copyright:   2018 Martyn Smith - USGS NY WSC

// authors:  Martyn J. Smith - USGS NY WSC

// purpose:  Web Mapping interface for viewing Ontario FIM data

// updates:
// 04.17.2019 mjs - Created

//CSS imports
import 'bootstrap/dist/css/bootstrap.css';
import 'leaflet/dist/leaflet.css';
import 'marker-creator/public/css/markers.css';
import './styles/main.css';

//ES6 imports
import 'bootstrap/js/dist/util';
import 'bootstrap/js/dist/modal';
import 'bootstrap/js/dist/collapse';
import 'bootstrap/js/dist/tab';
import { map, control, tileLayer, Icon } from 'leaflet';
import { basemapLayer, dynamicMapLayer, identifyFeatures } from 'esri-leaflet';

import { config, library, dom } from '@fortawesome/fontawesome-svg-core';
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars';
import { faInfo } from '@fortawesome/free-solid-svg-icons/faInfo';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons/faExclamationCircle';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle';
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog';

import { faTwitterSquare } from '@fortawesome/free-brands-svg-icons/faTwitterSquare';
import { faFacebookSquare } from '@fortawesome/free-brands-svg-icons/faFacebookSquare';
import { faGooglePlusSquare } from '@fortawesome/free-brands-svg-icons/faGooglePlusSquare';
import { faGithubSquare } from '@fortawesome/free-brands-svg-icons/faGithubSquare';
import { faFlickr } from '@fortawesome/free-brands-svg-icons/faFlickr';
import { faYoutubeSquare } from '@fortawesome/free-brands-svg-icons/faYoutubeSquare';
import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';

library.add(faBars, faPlus, faMinus, faInfo, faExclamationCircle, faCog, faQuestionCircle, faTwitterSquare, faFacebookSquare,faGooglePlusSquare, faGithubSquare, faFlickr, faYoutubeSquare, faInstagram );
config.searchPseudoElements = true;
dom.watch();

//START user config variables
var MapX = '-77.0'; //set initial map longitude
var MapY = '43.4'; //set initial map latitude
var MapZoom = 8; //set initial map zoom
var sitesURL = './sites.json';
//END user config variables 

//START global variables
var theMap;
var layer, layerLabels;
var mapServer;
var RDGgageLayer,permGageLayer,queryLayer;
var visibleLayers = [];
var siteList = [];

var mapServerDetails =  {
  "url": "https://gis.usgs.gov/sciencebase2/rest/services/Catalog/5a7c9047e4b00f54eb231ae9/MapServer",
  //"url": "https://sparrowtest.wim.usgs.gov/arcgis/rest/services/NyOntario/NyOntario/MapServer",
	//"layers": [0,1,2,3,4,5,6,7,8,9,10,11,12,13], 
	"visible": false, 
	"opacity": 0.6,
};
var layersURL = mapServerDetails.url + '/layers?f=pjson';
var legendURL = mapServerDetails.url + '/legend?f=json';
//END global variables

//instantiate map
$(document).ready(function () {
  console.log('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);
  $('#appVersion').html('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);

  Icon.Default.imagePath = './images/';

  //create map
  theMap = map('mapDiv', { zoomControl: false });

  //add zoom control with your options
  control.zoom({ position: 'topright' }).addTo(theMap);
  control.scale().addTo(theMap);
  
  //basemap
  layer = tileLayer('https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  }).addTo(theMap);

  //set initial view
  theMap.setView([MapY, MapX], MapZoom);

  RDGgageLayer = L.featureGroup().addTo(theMap);
  permGageLayer = L.featureGroup().addTo(theMap);
  queryLayer = L.featureGroup().addTo(theMap);

	//add map layers
  parseBaseLayers();
  
  //load sites
  loadSites();

  /*  START EVENT HANDLERS */
  $('.basemapBtn').click(function () {
    $('.basemapBtn').removeClass('slick-btn-selection');
    $(this).addClass('slick-btn-selection');
    var baseMap = this.id.replace('btn', '');
    setBasemap(baseMap);
  });

  $('#legend').on("click", '.layerBtn', function (e) {
    // $('.layerBtn').removeClass('slick-btn-selection');
    // $(this).addClass('slick-btn-selection');
    // var layer = this.id.replace('btn', '');
    setLayer(this);
  });

  $('#mobile-main-menu').click(function () {
    $('body').toggleClass('isOpenMenu');
  });

  $('#resetView').click(function () {
    resetView();
  });

  $('#aboutButton').click(function () {
    $('#aboutModal').modal('show');
  });

  $('#baseLayerToggles').on("click", '.layerToggle', function(e) {

    theMap.removeLayer(mapServer);

    //turn off map click if its on
    theMap.off('click');

    //revert cursor
    $('.leaflet-container').css('cursor','');

    //clear any queryLayers
    queryLayer.clearLayers();

    //close all popups
    theMap.closePopup();
		
		var layerID = $(this).attr('value');
		var divID = $(this).attr('id');
		
		//clear all check marks
		$('.mapLayerBtn').removeClass('slick-btn-selection');
						
		//layer toggle
		console.log('current visible layers: ', visibleLayers);
		
		//if layer is already on the map
		if (visibleLayers == layerID) {
			console.log('map already has this layer: ',divID, layerID);
			visibleLayers = [];

			console.log('current visible layers: ', visibleLayers);
			
		} else {
			console.log('map DOES NOT have this layer: ',divID, layerID);
			$(this).addClass('slick-btn-selection');
			visibleLayers = [layerID];
			mapServer.setLayers(visibleLayers);
      theMap.addLayer(mapServer);
      
      //if this is a depth grid layer we just turned on, enable querying
      if (divID.indexOf('segment') !== -1) {

        $('.leaflet-container').css('cursor','crosshair');

        //turn on click listener
        theMap.on('click', function(e) {        
          //console.log("MAP CLICK",e,layerID); 
          queryRaster(e.latlng, layerID)  ;   
        });
      }

			console.log('current visible layers: ', visibleLayers);
		}
	});
  /*  END EVENT HANDLERS */
});

function queryRaster(point,layerID) {
  queryLayer.clearLayers();

  console.log('querying raster layer:',layerID)
  identifyFeatures({
    url: mapServerDetails.url
  })
  .on(theMap)
  .at(point)
  .returnGeometry(false)
  .layers('visible:' + layerID)
  .run(function(error, featureCollection, response){
      console.log("identify response:", featureCollection,response);

      var popupContent = '';

      if (featureCollection.features.length > 0 && featureCollection.features[0].properties['Pixel Value'] !== 'NaN') {

        var lNameItems = response.results[0].layerName.split('_');
        var lName = 'Depth ' + (lNameItems[1]/100).toFixed(1) + ' Feet';

        popupContent += '<b>Layer queried: </b>' + lName + '<br><b>Value: </b>' + (featureCollection.features[0].properties['Pixel Value']/100).toFixed(1) + ' feet';
      }

      else {
        popupContent += '<b>Value: </b>Not Found';
      }

      var classString = 'wmm-pin wmm-orange wmm-icon-noicon wmm-icon-white wmm-size-25';
      var icon = L.divIcon({ className: classString });
      var marker = L.marker(point, { icon: icon });

      var popup = L.popup()
        .setLatLng(point)
        .setContent(popupContent)
        .openOn(theMap);

      marker.bindPopup(popupContent);
      queryLayer.addLayer(marker);
      
  });
}

function loadSites() {

  $.ajax({
    url: sitesURL,
    success: function (data) {
      console.log('Sites data loaded:',data);

      $.each(data.features, function (shortKey, feature) {

        var popupContent = '';

        //look up better header
        $.each(feature.properties, function (shortKey, property) {

          //make sure we have something
          if (property.length > 0) {

            if(shortKey === 'Site ID') {
              popupContent += '<b>' + shortKey + ':</b>&nbsp;&nbsp;<a href="https://waterdata.usgs.gov/usa/nwis/uv?' + property + '" target="_blank">' + property + '</a></br>';
            }

            //otherwise add as normal
            if(shortKey === 'Station Name') {
              popupContent += '<b>' + shortKey + ':</b>&nbsp;&nbsp;' + property + '</br>';
            }

          }
        });

        //for main sites
        if (feature.properties.type === 'Permanant') {
          var classString = 'wmm-pin wmm-blue wmm-icon-circle wmm-icon-white wmm-size-25';
          addToLegend('Permanent Gage',classString, 'permGageLayer');
          var icon = L.divIcon({ className: classString });
          var marker = L.marker([feature.geometry.coordinates[1],feature.geometry.coordinates[0]], { icon: icon });
          marker.properties = feature.properties;
          marker.bindPopup(popupContent);
          permGageLayer.addLayer(marker);
        }

        //considtional classString
        if (feature.properties.type === 'RDG') {
          siteList.push(feature.properties["Site ID"]);
          var classString = 'wmm-pin wmm-red wmm-icon-circle wmm-icon-white wmm-size-25';
          addToLegend('Rapid Deployment Gage',classString, 'RDGgageLayer');
          var icon = L.divIcon({ className: classString });
          var marker = L.marker([feature.geometry.coordinates[1],feature.geometry.coordinates[0]], { icon: icon });
          marker.properties = feature.properties;
          marker.bindPopup(popupContent);
          RDGgageLayer.addLayer(marker);


        }
      });

      //hover
      // RDGgageLayer.on('mouseover', function(e){
      //   e.layer.openPopup();
      // });

      //Run initially
      addNWISdata();

      //Run every 5 minutes
      setTimeout(function(){ addNWISdata(); }, 300000);

    }
  });
}

function addNWISdata() {

  var text = 'Lake Elevation';
  var sites = siteList.join(',');

  var url = 'https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=72214&sites=' +  sites;

  $.ajax({
    url: url,
    success: function (data) {

      console.log('All NWIS results:', data);

      $.each(data.value.timeSeries, function (i, timeSeries) {


        var item = timeSeries.values[0];
        var siteID = timeSeries.name.split(':')[1];
        var qualifiers = false;

        //console.log('single timeseries',siteID, timeSeries);
  
        $.each(item.qualifier, function (i, qualifier) {
          //console.log('Qualifier:',qualifier)
          if (['Eqp','Mnt'].indexOf(qualifier.qualifierCode) !== -1) {
            qualifiers = true;
            console.log('Qualifier found:', timeSeries)
          }
        });
  
        if (!qualifiers) {
          var value = item.value[0].value;
          var date = new Date(item.value[0].dateTime);
          date = date.toLocaleString();

          RDGgageLayer.eachLayer(function (layer) {
            if (layer.properties['Site ID'] === siteID) {

              //if we already have water elevation, update it
              if (layer._popup._content.indexOf(text) !== -1) {
                //console.log('Update popup that already exists:',layer._popup._content);
                var newHTML = layer._popup._content.split('<div id="lakeElevation">')[0];
                var $popupContent = $('<div/>').html(newHTML);
                $popupContent.append('<div id="' + camelize(text) + '"><b>' + text + ':</b>&nbsp;&nbsp<b>' + value + ' </b>(' + date + ')</div>');
                layer._popup.setContent($popupContent.html());   
              }

              //otherwise, append it
              else {
                var $popupContent = $('<div/>').html(layer._popup._content);
                $popupContent.append('<div id="' + camelize(text) + '"><b>' + text + ':</b>&nbsp;&nbsp<b>' + value + ' </b>(' + date + ')</div>');
                layer._popup.setContent($popupContent.html());   
              }


            }
          });
        }

      });
    }
  });
}

function addToLegend(text, classString, id) {

  //check if this symbol is already in legend, if not add it
  if (document.getElementById(id) === null) {
    $("#legend").append('<button id="' + id + '" class="btn btn-default slick-btn layerBtn equalize"><icon class="' + classString + ' legendicon" /><span>' + text + '</span></button>');
  }
}


function parseBaseLayers() {

	mapServer = dynamicMapLayer(mapServerDetails);
  addMapLayer(mapServer, mapServerDetails);

}

function addMapLayer(mapServer, mapServerDetails) {

  $('#baseLayerToggles').append('<div class="alert alert-secondary" role="alert">Depth layers are grouped by correlated USGS gage.  Click the Site ID below to expand a list of depth layers.  Individual depth layers can be selected and queried by clicking on the map</div>');

  $.getJSON(layersURL, function (layerResponse) {

    $.getJSON(legendURL, function (legendResponse) {

      console.log('legend response:',legendResponse,'layer response:',layerResponse);

      var toggleGroup = '';
      var previousParent = '';
      var $groupContent;

      $.each(layerResponse.layers, function (iLayer,layerValue) {

        //add as a group heading
        if (layerValue.type === 'Group Layer') {
          console.log('Found a group layer:',layerValue);
          var lName = layerValue.name.split('_').join(' ');
          
          $('#baseLayerToggles').append('<h5 class="card-title groupLayerToggle" data-toggle="collapse" data-target="#' + layerValue.name + '"> ' + lName + '</h5><div id="' + layerValue.name + '" class="collapse"></div>');
        }

        //add as a regular layer
        else {
          //console.log('legend response:',legendResponse,iLayer, legendResponse.layers[iLayer])

          //get legend swatch
          $.each(legendResponse.layers, function (index,legendValue) {

            if (legendValue.layerId === iLayer) {
              //var legendValue = legendResponse.layers[iLayer];
                
              //console.log('Adding map layer to legend:',legendValue);

              if (layerValue.parentLayer) {

                //console.log('PARENT',layerValue.name,previousParent,layerValue.parentLayer.name);

                //we have a new parent
                if (previousParent !== layerValue.parentLayer.name) {
                  //$('#baseLayerToggles').append($groupContent);
                }

                previousParent = layerValue.parentLayer.name;

                


                if (legendValue.legend.length > 1) {

                  var lNameItems = legendValue.layerName.split('_');
                  var lName = lNameItems[0] + ' ' + (lNameItems[1]/100).toFixed(1) + ' Feet';
                  
                  var $legendContent = $('<div/>').html('<div class="ml-2"><button id="' + camelize('l' + legendValue.layerName) + '" class="btn btn-default slick-btn mapLayerBtn equalize layerToggle" value="' + legendValue.layerId + '">' + lName);

                  $.each(legendValue.legend, function (index,legendItem) {
                    if (legendItem.label !== '-3,460 - 0') {

                      var desc = legendItem.label.split(' Feet')[0];
                      var values = desc.split(' - ');
                      var value1 = values[0]/100;
                      if (value1 !== 0) {
                        value1 = '>' + parseInt(value1);
                      }
                      var value2 = values[1]/100;
    
                      //console.log('parsing',desc,values);
                      $($legendContent).append('<div class="ml-4 rasterLegend"><img alt="Legend Swatch" src="data:image/png;base64,' + legendItem.imageData + '" /><span class="ml-2">' + value1 + ' to ' + value2 + ' Feet</span></div>');
                    }
                  });

                  $($legendContent).append('</button></div>');

                  //console.log('CHECK DIV:', '#' + layerValue.parentLayer.name)
                  $('#' + layerValue.parentLayer.name).append($legendContent);

                }

                else {
                  $('#baseLayerToggles').append('<div class="ml-2"><button id="' + camelize('l' + legendValue.layerName) + '" class="btn btn-default slick-btn mapLayerBtn equalize layerToggle" value="' + legendValue.layerId + '"><img alt="Legend Swatch" src="data:image/png;base64,' + legendValue.legend[0].imageData + '" />' + legendValue.layerName + ' Feet</button></div>');
                }

              }

              else {
                $('#baseLayerToggles').append('<div><button id="' + camelize('l' + legendValue.layerName) + '" class="btn btn-default slick-btn mapLayerBtn equalize layerToggle" value="' + legendValue.layerId + '"><img alt="Legend Swatch" src="data:image/png;base64,' + legendValue.legend[0].imageData + '" />' + legendValue.layerName + ' Feet</button></div>');
              }
        
            }

          });
        }
      });

      //activate group toggling
      $('[data-toggle="collapse"]').click(function(e){
        e.preventDefault();
        var target_element= $(this).attr("data-target");
        $(target_element).collapse('toggle');
        return false;
      });


    });
  });
	

}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
      return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
  }).replace(/\s+/g, '');
}

function setLayer(layer) { 
  //console.log('setLayer',layer.id,window[layer.id]);

  if(layer.id === 'RDGgageLayer') {
    if (theMap.hasLayer(RDGgageLayer)) theMap.removeLayer(RDGgageLayer);
    else theMap.addLayer(RDGgageLayer);
  }

  if(layer.id === 'permGageLayer') {
    if (theMap.hasLayer(permGageLayer)) theMap.removeLayer(permGageLayer);
    else theMap.addLayer(permGageLayer);
  }
}

function setBasemap(baseMap) {

  switch (baseMap) {
    case 'Streets': baseMap = 'Streets'; break;
    case 'Satellite': baseMap = 'Imagery'; break;
    case 'Clarity': baseMap = 'ImageryClarity'; break;
    case 'Topo': baseMap = 'Topographic'; break;
    case 'Terrain': baseMap = 'Terrain'; break;
    case 'Gray': baseMap = 'Gray'; break;
    case 'DarkGray': baseMap = 'DarkGray'; break;
    case 'NatGeo': baseMap = 'NationalGeographic'; break;
  }

  if (layer) theMap.removeLayer(layer);
  layer = basemapLayer(baseMap);
  theMap.addLayer(layer);
  if (layerLabels) theMap.removeLayer(layerLabels);
  if (baseMap === 'Gray' || baseMap === 'DarkGray' || baseMap === 'Imagery' || baseMap === 'Terrain') {
    layerLabels = basemapLayer(baseMap + 'Labels');
    theMap.addLayer(layerLabels);
  }
}
