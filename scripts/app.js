var uas2018 = angular.module('uas2018', []);

uas2018.controller('uas2018_controller', ['$scope', '$location', '$rootScope', function($scope, $location, $rootScope) {
  if ($location.path() == '/login'){
    $scope.x = false;
  } else {
    $scope.x = true;
  }

}]);

// uas2018.controller('text_controller', ['$scope', '$location', '$rootScope', function($scope, $location, $rootScope) {
//   $('.pagelink').click(function() {
//     $('body').animate({
//       scrollTop: eval($('#' + $(this).attr('target')).offset().top - 70)
//     }, 1000);
//   });
// }]);




angular.module('Authentication', []);
angular.module('Home', []);

angular.module('UAS_2018', [
  'Authentication',
  'Home',
  'ngRoute',
  'ngCookies',
  'uas2018'
])


.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  $routeProvider
  .when('/login', {
    controller: 'LoginController',
    templateUrl: './authentication/views/login.html'
  })

  .when('/', {
    controller: 'HomeController',
    templateUrl: './home/views/home.html'
  })

  .when('/processing', {
    templateUrl: './home/views/processing.html'
  })

  .when('/map', {
    controller: 'uas2018_map_controller',
    templateUrl: './home/views/map_2d.html'
  })

  .when('/3D', {
    controller: 'HomeController',
    templateUrl: './home/views/map_3d.html'
  })

  .when('/sensor', {
    controller: 'sensor_controller',
    templateUrl: './home/views/sensor.html'
  })
  .when('/about_us', {
    controller: 'HomeController',
    templateUrl: './home/views/about_us.html'
  })

  .otherwise({
    redirectTo: '/'
  });
}])


.controller('uas2018_map_controller', ['$scope', '$http', function($scope, $http) {

  //load google packages for the chart
  google.charts.load('current', {packages: ['corechart', 'line', 'timeline']});

  // Load basemaps
  var topo = L.esri.basemapLayer("Topographic");
  var darkgrey = L.esri.basemapLayer("DarkGray");
  var imagery = L.esri.basemapLayer("Imagery");

  // Main map object
  var map = L.map('map', {
    center: [51.944990, 7.572810],
    zoom: 17,
    layers: [imagery],
    maxZoom: 19,
    maxNativeZoom: 19
  });

  var mapHome = {
    lat: 51.944990,
    lng: 7.572810,
    zoom: 17
  };

  L.easyButton('<span><img src="./home/resources/icons/meeting-point-32.png" width=15 height=15></img></span>',function(btn,map){
    map.setView([mapHome.lat, mapHome.lng], mapHome.zoom);
  },'Zoom To Home', {position: 'bottomleft'}).addTo(map);

  // /*Zoom button*/
  // var legendCenterButton = L.control({position: 'bottomright'})
  //
  // legendCenterButton.onAdd = function () {
  //     var div = L.DomUtil.create('center', 'center-button');
  //
  //     var zooming = '<span ng-click="zoomRiver()">';
  //     zooming += '<img style="width: 24px; height: 24px;" src="app/components/assets/button_icons/meeting-point-32.png"/>';
  //     zooming += '</span>';
  //     div.innerHTML = zooming;
  //
  //     var linkFunction = $compile(angular.element(div));
  //     var newScope = $scope.$new();
  //
  //     return linkFunction(newScope)[0];
  // };
  // legendCenterButton.addTo(map); //Added by default
  // /*End Zoom button*/

  // Default base layers when the app initiates
  var baseLayers = {
    "Imagery": imagery,
    "Topographic": topo,
    "Gray": darkgrey
  };

  var sidebar = L.control.sidebar('sidebar', {
    position: 'right'
    // height: 750;
    // width: 780;
  });

  map.addControl(sidebar);

  ///////////////////////Map Layers/////////////////////////

  //////SenseBox ground sensors///////

  // Load ground sensor coordinate data, create markers and add as map layer
  var marker_id;
  var station_value;

  var dataURL = "./home/resources/markers_project.geojson"

  var jsonData = $.ajax({
    url: dataURL,
    async: false,
    success: function(res) {
      return res
    }
  }).responseJSON

  // Boolean value for closed (0) and opened (1) chart sidebar
  var sidebar_opened = 0;

  var markers = L.geoJson(jsonData, {
    pointToLayer: function(feature, latlng) {

      switch ( feature.properties.Station ) {
        case "A":
        case "B":
        case "C":
        case "D":
        //Water parameters points:
        marker_color = "marker-icon-blue";
        break;
        case "E":
        case "F":
        //Air Quality points:
        marker_color = "marker-icon-red";
        break;
        case "G":
        //Water Level point:
        marker_color = "marker-icon-blue";
        break;
        case "H":
        case "I":
        //Weather stations points:
        marker_color = "marker-icon-orange";
        break;
        default:
        marker_color = "marker-icon-grey";
      }

      var marker = L.marker(latlng, {
        icon: L.icon({
          iconUrl: "./home/resources/icons/"+marker_color+".png",
          iconSize: [25, 41]
        })
      } );
      marker.bindPopup("Station ID: " + feature.properties.id + '<br/>' + "Station name: " + feature.properties.Station + '<br/>' + "Station type: " + feature.properties.Type);
      marker.on('mouseover', function (e) {
        this.openPopup();
      });
      marker.on('mouseout', function (e) {
        this.closePopup();
      });

      return marker;
    },
    onEachFeature: function(feature, layer) {
      layer.on('click', function(e) {
        //console.log(feature);
        sidebar.show();

        //global variable receives the id of the marker clicked by the user
        station_value = feature.properties.Station;

        //Run the function that request the data based on the marker clicked by the user
        process_marker_click(station_value);

        //ensure that all times a marked is clicked,
        //all the checkbox from the class ".cb_chart_var" initiate as checked
        $(".cb_chart_var").prop("checked", true)

        if (sidebar_opened == 0) {
          sidebar_opened = 1;
        }

      }); //end Event listener 'click' for the marker
    } //end onEachFeature
    //EDIT_matheus
  }).addTo(map);

  //creates a cluster object
  var sensorLayer = L.markerClusterGroup();

  //Add the variable that contains all the markers to the cluster object
  sensorLayer.addLayer(markers);

  //event listener for hiding the sidebar_popup when the user clicks in the map
  map.on('click', function(e) {
    sidebar.hide();
  });

  //Jquery function that map changes in the "#CheckboxDIV",
  //when a checkbox from the class ".cb_chart_var" is clicked
  $("#CheckboxDIV").on("change", ".cb_chart_var", function() {
    //for each click(change) in the checkbox a new requestion to the fusion table is made.
    process_marker_click(station_value);
  });


function process_marker_click(marker_station){
  switch ( marker_station ) {
    case "A":
    case "B":
    case "C":
    case "D":
    case "E":
    case "F":
    case "G":
    case "H":
    case "I":
      //Weather stations points  ||  Fusiontable name: WEATHER2_Processed  ||  Fusiontable ID: 1KyssrYpcg9JT9ps0kRAfxGargS-KekSlr7PrWRmR
      fusiontable_id = "1KyssrYpcg9JT9ps0kRAfxGargS-KekSlr7PrWRmR";
      break;

      /*
      case "A":
      case "B":
      case "C":
      case "D":
        //Water parameters points  ||  Fusiontable name: Water_parameters_river  ||  Fusiontable ID: 1MgGVSpMf3w7HHq5t4sPCsJPc8Wat1nVioG-TAJO3
        fusiontable_id = "1MgGVSpMf3w7HHq5t4sPCsJPc8Wat1nVioG-TAJO3";
        break;
      case "E":
      case "F":
        //Air Quality points  ||  Fusiontable name: AQ_Processed  || Fusiontable ID: 1AkX22UU-fqR_gIyv_hBTYR55_7ksr1jjejr1N6ur
        fusiontable_id = "1AkX22UU-fqR_gIyv_hBTYR55_7ksr1jjejr1N6ur";
        break;
      case "G":
        //Water Level points  ||  Fusiontable name: Water_level_processed ||  Fusiontable ID: 1h2_7KqG_3hHQZDLJijqFqSvILuM26unc5Hnksnhn
        fusiontable_id = "1h2_7KqG_3hHQZDLJijqFqSvILuM26unc5Hnksnhn";
        break;
      case "H":
        //Weather stations points  ||  Fusiontable name: WEATHER1_Processed  || Fusiontable ID: 1CBn0rAtMSTFH2jNbF7wXx8bkkwjn1xLnBdMCXqV6
        fusiontable_id = "1CBn0rAtMSTFH2jNbF7wXx8bkkwjn1xLnBdMCXqV6";
        break;
      case "I":
        //Weather stations points  ||  Fusiontable name: WEATHER2_Processed  ||  Fusiontable ID: 1KyssrYpcg9JT9ps0kRAfxGargS-KekSlr7PrWRmR
        fusiontable_id = "1KyssrYpcg9JT9ps0kRAfxGargS-KekSlr7PrWRmR";
        break;
        */
    }

    //===================- FUNCTION request_fusiontable_data ===================
    var url = ['https://www.googleapis.com/fusiontables/v2/query?'];
    url.push('sql=');
    var query = "SELECT * "
    query = query + " FROM "+ fusiontable_id +" ";
    query = query + " ORDER BY 'Timestamp' ASC ";
    var encodedQuery = encodeURIComponent(query);
    url.push(encodedQuery);
    url.push('&key=AIzaSyCoC9A3WgFneccRufbysInygnWrhCie-T0');

    var queryData = $.ajax({
      url: url.join(''),
      async: false,
    }).responseText
    var queryJson = JSON.parse(queryData)

    //=================== FUNCTION process_fusiontable_data ===================
    console.log("Data Rows: ")
    console.log( queryJson )

    var columns = queryJson['columns'];
    var rows = queryJson['rows'];
    /*
    var checkbox_div = document.getElementById("CheckboxDIV");

    <input type="checkbox" class="cb_chart_var" id="cb_temp" name="Temperature" value="1" checked>
    var newInput = document.createElement("input");
    newInput.setAttribute("type",'checkbox');
    newInput.setAttribute("id", 'cb_temp');
    newInput.setAttribute("class",'cb_chart_var');
    newInput.setAttribute("name", 'Temperature');
    newInput.setAttribute("value",'1');
    DivGroup.appendChild(newInput);

    <label for="cb_temp">Temperature</label>
    var newlabel = document.createElement("label");
    newlabel.setAttribute("for","cb_temp");
    newlabel.innerHTML = "Temperature";
    DivGroup.appendChild(checkbox_div);

    */

    //var color_palette_hex = ['#DB3340', '#E8B71A', '#1FDA9A', '#28ABE3', '#8C4646'];

    //=================== FUNCTION drawChart ===================
    var data = new google.visualization.DataTable();
    for(var i=0;i<columns.length;i++){
      if (i === 2) { break; }
      if(i==0){
        data.addColumn('date', columns[i]);
        console.log("date");
        console.log(columns[i]);
      }else{
        data.addColumn('number', columns[i]);
        console.log("number");
        console.log(columns[i]);
      }
    }
    //data.addColumn({type: 'string', role: 'tooltip'});

    var PointsToPlot = [];
    for(var i=0;i<rows.length;i++){
      //"6/9/2018 19:30"
      var eachrow = [];
      //console.log("i: ", i);
      for(var j=0;j<rows[i].length;j++){
        //console.log("j: ", j);
        if (j === 2) { break; }
        if (j == 0){
          var split_date_value = rows[i][0].split(" ");
          var date_split = split_date_value[0].split("/");
          var time_split = split_date_value[1].split(":");

          var date_replace = new Date(parseInt(date_split[2]),  parseInt(date_split[0])-1, parseInt(date_split[1]), parseInt(time_split[0]), parseInt(time_split[1]))
          eachrow.push(date_replace);
        }else{
          eachrow.push(rows[i][j]);
        }
      }
      PointsToPlot.push(eachrow);
    }

    data.addRows(PointsToPlot)

    console.log("points to plot");

    /*
    var position_to_remove = [];

    var color_palette_hex = ['#DB3340', '#E8B71A', '#1FDA9A', '#28ABE3', '#8C4646'];
    data.addColumn('number', "Time");

    var number_of_variables = 0;

    $('.cb_chart_var:checkbox').each(function() {

      if ($(this).prop("checked")) {
        data.addColumn('number', $(this).attr("name"));
      } else {
        position_to_remove.push(parseInt($(this).prop("value")));
      }
      number_of_variables++;
    });

    color_palette_hex.splice(number_of_variables);

    position_to_remove.reverse();
    if (position_to_remove.length > 0) {
      for (var i in PointsToPlot) {
        for (var j in position_to_remove) {
          PointsToPlot[i].splice(position_to_remove[j], 1);
        }
      }

      for (var j in position_to_remove) {
        color_palette_hex.splice(position_to_remove[j] - 1, 1);
      }
    }
  */

  var min_date = PointsToPlot[0][0];
  var max_date = new Date(PointsToPlot[PointsToPlot.length - 1][0]);

  var options = {
          width: 750,
          height: 500,
          legend: {position: 'none'},
          enableInteractivity: true,
          chartArea: {
            width: '85%'
          },
          hAxis: {
            // viewWindow: {
            //   min: min_test,
            //   max: max_test
            // },
            gridlines: {
              units: {
                days: {format: ['MMM dd']},
                hours: {format: ['HH:mm', 'ha']},
              }
            },
            minorGridlines: {
              units: {
                hours: {format: ['hh:mm a', 'ha']}
              }
            }
          },
          explorer: {
            actions: ['dragToZoom', 'rightClickToReset'],
            axis: 'horizontal',
            keepInBounds: true
          }
        };


/*
  var options = {
      title: 'Data retrieved from Sensebox',
      width: 750,
      height: 500,
      legend: {
        position: 'bottom'
      },
      backgroundColor: {
        stroke: '#4322c0',
        strokeWidth: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      },
      enableInteractivity: false,
      chartArea:{
        left:45,
        right: 10,
        top:35,
        bottom:75,
        width:"80%",
        height:"80%"
      },
      hAxis: {
        // viewWindow: {
        //   min: new Date(2018, 5, 9, 19),
        //   max: new Date(2018, 5, 11, 7),
        // },
        gridlines: {
          count: 4,
          units: {
            days: {format: ['MMM dd']}
          }
        },
        direction: -1,
        slantedText:true,
        slantedTextAngle:45

      },
      explorer: {
        actions: ['dragToZoom', 'rightClickToReset'],
        axis: 'horizontal',
        keepInBounds: true
      }
      //colors: color_palette_hex
    };
    */
    /*
    var options = {
      title: 'Data retrieved from Sensebox',

      width:750,
      height:500,

      legend: {
        position: 'bottom'
      },

      backgroundColor: {
        stroke: '#4322c0',
        strokeWidth: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      },

      chartArea:{
        left:45,
        right: 10,
        top:35,
        bottom:75,
        width:"80%",
        height:"80%"
      },

      curveType: 'function',
      hAxis: {
        title: 'Time',
        logScale: false
      },

      explorer: {
        actions: ['dragToZoom', 'rightClickToReset'],
        axis: 'horizontal',
        keepInBounds: true
      },

      colors: color_palette_hex
    };
    */

    var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    chart.draw(data, options);




}

  //// Linking SenseBox data to map markers and drawing charts ////
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  function request_fusiontable_data(marker_id) {
    //Initiate all the checkbox, of the same class, already clicked.

    //Build the url for making a request to the Fusion Table API.
    //It'll create a HTML element: script.
    //And then adding the url for the request and append it to the body element. position [0]
    //All the time a new request is made, the old script is replaced by the new script.

    //Creates the HTML script element
    var script = document.createElement('script');

    //Start to build the URL
    var url = ['https://www.googleapis.com/fusiontables/v2/query?'];
    url.push('sql=');

    //Build the query
    var query = "SELECT * "
    query = query + " FROM 1xipnRPglhJ3vQ8RvNbxgKBVN7_Mh54V8J6XHxbce ";
    //Add to the query the WHERE clause to select the data according the marker clicker
    query = query + " WHERE 'geoid' IN (" + marker_id.toString() + ") ";
    //Put the results  in a structured ordered manner to be plotted in the chart
    query = query + " ORDER BY 'Time(s)' ASC ";

    //Encode the query and push to the array
    var encodedQuery = encodeURIComponent(query);
    url.push(encodedQuery);

    //Calls the callback function after receiving the queried data from Fusion Table
    //url.push('&callback=process_fusiontable_data');
    //add in the URL the Fusion table API key to be able to query information from it
    url.push('&key=AIzaSyCoC9A3WgFneccRufbysInygnWrhCie-T0');
    //Join all the array elements in one single string without spaces
    //and also add to script source element closing it.
    //It'll look likes: '<'script src="url_created"'>''<'/script'>'

    var queryData = $.ajax({
      url: url.join(''),
      async: false,
    }).responseText

    var queryJson = JSON.parse(queryData)

    process_fusiontable_data(queryJson)

    script.src = url.join('');

    //get the body element position[0] and append the script element to it.
    // var body = document.getElementsByTagName('head')[0];
    // body.appendChild(script);
    console.log(script)
  }

  function process_fusiontable_data(data) {
    //Process the data got from the fusion table

    var rows = data['rows'];
    //Creates an empty array to insert the array of coordinates to be plotted in the chart
    var PointsToPlot = [];

    for (var i in rows) {
      //Variable that holds each coordinate to be plotted in the chart
      var coordinates = [];

      //Based on the fusion table, extract the row values to the respective variable.
      var Temperature = parseFloat(rows[i][0]);
      var Relat_Humid = parseFloat(rows[i][1]);
      var Time = parseFloat(rows[i][6]);

      //By default the first column will be always the x value.
      //That's why "Time" needs to be inserted first
      coordinates.push(Time);
      coordinates.push(Temperature);
      coordinates.push(Relat_Humid);

      //As default in Google LineChart structure:
      //If there're 3 columns, for ex., "time", "temp" and "moisture"
      //PointsToPlot will be an array containing float arrays of size == 3. being respectively to the columns.
      //Consequently, 2 columns, for ex., "time", "temp".
      //PointsToPlot will be an array containing float arrays of size == 2. ex: [[1,15],[2,13],...]
      PointsToPlot.push(coordinates);

    }
    //call the drawChart Function
    drawChart(PointsToPlot);
  }

  function drawChart(PointsToPlot) {
    //Create a Google object to plot the data for the chart
    var data = new google.visualization.DataTable();

    //Create a empty array to be inserted the fields to be removed based on the checkboxes that are unchecked
    var position_to_remove = [];

    //Array containing the hex colors for plotting the lines.
    //Color for 5 different y-axis variables.
    //If number of y-axis variables to be plotted is greater than 5,
    //more colors needs to be added to the following array.
    var color_palette_hex = ['#DB3340', '#E8B71A', '#1FDA9A', '#28ABE3', '#8C4646'];

    //Add the columns names for the chart
    //The first is always the x-axis, in this specific case, it's the "time". And the rest are for the y-axis.
    data.addColumn('number', "Time");

    //Variable the total number of y-axis variables
    var number_of_variables = 0;

    //Access and manages the checkbox class
    $('.cb_chart_var:checkbox').each(function() {

      if ($(this).prop("checked")) {
        //Add the further columns (y axis) based on the attribute name of the checkboxes checked.
        data.addColumn('number', $(this).attr("name"));
      } else {
        //Get the value from the checkbox that represents the position on the PointsToPlot array
        position_to_remove.push(parseInt($(this).prop("value")));
      }
      number_of_variables++;
    });

    color_palette_hex.splice(number_of_variables);

    position_to_remove.reverse();
    if (position_to_remove.length > 0) {
      for (var i in PointsToPlot) {
        for (var j in position_to_remove) {
          PointsToPlot[i].splice(position_to_remove[j], 1);
        }
      }

      for (var j in position_to_remove) {
        color_palette_hex.splice(position_to_remove[j] - 1, 1);
      }
    }

    //Add the coordinates for plotting the chart.
    //Array of arrays, where the first element of the child array is the x-axis and the rest for the y-axis
    data.addRows(PointsToPlot)

    //Create the option for the LineChart
    //See documentation in: https://developers.google.com/chart/interactive/docs/gallery/linechart
    var options = {
      //Give a title to the chart
      title: 'Data retrieved from Sensebox',

      width:750,
      height:500,

      //Control the position of the legend
      legend: {
        position: 'bottom'
      },

      backgroundColor: {
        stroke: '#4322c0',
        strokeWidth: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      },

      chartArea:{
        left:45,
        right: 10,
        top:35,
        bottom:75,
        width:"80%",
        height:"80%"
      },

      //It's supposed to add smoothness to the line plot
      curveType: 'function',

      //Properties for the horizontal axis
      hAxis: {
        title: 'Time',
        logScale: false
      },

      //Properties for the vertical axis
      //vAxis: {}

      //Option that allows users to pan and zoom Google charts.
      explorer: {
        actions: ['dragToZoom', 'rightClickToReset'],
        //Just zoom the horizontal axis
        axis: 'horizontal',
        //To ensure that users don't pan where there's no data.
        keepInBounds: true
      },

      //Add the colors to the lines
      colors: color_palette_hex
    };

    //Set TimeOut to not overlap legend of chart when the sidebar is still opening
    if(sidebar_opened == 0){
      setTimeout(function(){
        var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
        chart.draw(data, options);
      }, 700);
    }

    //Create the LineChart object
    var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    //Plot the coordinates on it.
    chart.draw(data, options);


  }

  ////// Flight plan layer //////

  $scope.flightPlanOnEachFeature = function(feature, layer) {
    var popupContent = "Altitude: " + feature.properties.Altitude;
    layer.bindPopup(popupContent);
  };

  // Sets color based on altitude
  $scope.getColor = function(x) {
    return x < 46 ? '#ffeda0' :
    x < 48.1 ? '#feb24c' :
    x < 50.8 ? '#f03b20' :
    '#f01010';
  };

  //Flight plan
  var flightPlanLayer = L.esri.featureLayer({
    url: "https://services1.arcgis.com/W47q82gM5Y2xNen1/ArcGIS/rest/services/Flight_Path_40m/FeatureServer/0",
    style: function(feature) {
      return {
        "color": $scope.getColor(feature.properties.Altitude),
        "opacity": 1,
      };
    },
    onEachFeature: $scope.flightPlanOnEachFeature
  });


  ////// DEM layer //////
  var DEMlayer = L.esri.tiledMapLayer({
    url: "https://tiles.arcgis.com/tiles/W47q82gM5Y2xNen1/arcgis/rest/services/DEM_2018/MapServer",
    zIndex: 200,
    maxZoom: 19
  })


  ////// Hillshade layer //////
  var hillshadelayer = L.esri.tiledMapLayer({
    url: "https://tiles.arcgis.com/tiles/W47q82gM5Y2xNen1/arcgis/rest/services/Hillshade_2018/MapServer",
    // zIndex: 200,
    maxZoom: 19
    // maxNativeZoom:21
    //EDIT_matheus
    //}).addTo(map);
  });


  ////// NDVI layer //////

  var NDVIlayer = L.esri.tiledMapLayer({
    url: "https://tiles.arcgis.com/tiles/W47q82gM5Y2xNen1/arcgis/rest/services/NDVI/MapServer",
    zIndex: 200,
    maxZoom: 19,
    maxNativeZoom: 19
  })

  ////// Slope layer //////

  var slopelayer = L.esri.tiledMapLayer({
    url: "https://tiles.arcgis.com/tiles/W47q82gM5Y2xNen1/arcgis/rest/services/Slope_2018/MapServer",
    zIndex: 200,
    maxZoom: 19,
    maxNativeZoom: 19
  })


  ////// Aspect  layer //////

  var aspectlayer = L.esri.tiledMapLayer({
    url: "https://tiles.arcgis.com/tiles/W47q82gM5Y2xNen1/arcgis/rest/services/Aspect_2018/MapServer",
    zIndex: 200,
    maxZoom: 19,
    maxNativeZoom: 19
  })

  //Add here if additional overlays are to be added
  var overlays = {
    "Digital Elevation Model": DEMlayer,
    "Hillshade": hillshadelayer,
    "NDVI": NDVIlayer,
    "Slope": slopelayer,
    "Aspect": aspectlayer,
    "Flight plan": flightPlanLayer,
    "Ground Sensors": sensorLayer
  };

  //Initiate layers control method and add to map
  L.control.layers(baseLayers, overlays, {position: 'topleft'}).addTo(map);


  map.on('overlayadd', function(layer) {
    console.log(layer.name)
    console.log(layer)
    // map.fitBounds(layer.getBounds().pad(0.5))
    // map.setView(this.getBounds().getCenter());
    // console.log(this.getBounds())
    if(layer.name == "Ground Sensors"){
      map.fitBounds(sensorLayer.getBounds());
    } else {
      // } else if (layer.name == "Flight plan") {
      // map.fitBounds(flightPlanLayer.getBounds().pad(0.5));
      map.setView([51.944990, 7.572810], 17);
      // } else {
      //   map.fitBounds(layer.getBounds())
      // console.log("raster!")
    }
  });
}])

.run(['$rootScope', '$location', '$cookieStore', '$http',
function($rootScope, $location, $cookieStore, $http) {
  // keep user logged in after page refresh

  $rootScope.globals = $cookieStore.get('globals') || {};
  if ($rootScope.globals.currentUser) {
    $http.defaults.headers.common['Authorization'] = 'Basic ' + $rootScope.globals.currentUser.authdata; // jshint ignore:line
  }

  $rootScope.$on('$locationChangeStart', function(event, next, current) {
    // redirect to login page if not logged in

    if ($location.path() !== '/login' && !$rootScope.globals.currentUser) {
      $location.path('/login');

    }
  });


}
]);
