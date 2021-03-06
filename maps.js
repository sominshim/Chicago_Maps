var svg = {},
  gChi = {},
  gMap = {},
  gOver = {},
  zoom = {},
  drag = {},
  translate = [0, 0],
  scale = false,
  mainScale = 1,
  dragX = 0,
  dragY = 0,
  lastZoom = [0, 0],
  currentOverlay = {'settings': '', 'layer': ''},
  inVoid = true;

function getOrdinalSuffix(i) {
  var j = i % 10, k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

function loadMap(settings) {
  d3.selectAll("path.shape").remove();
  $('#info-box').html('');

  if (settings['none'] == 'none')
    return;
  if (settings['void'] == 'void') {
    d3.selectAll("path.city")
      .attr('visibility', 'hidden');
    inVoid = true;
    return;
  }

  var width = $(document).width(), height = $(document).height();
  var zoom_scale = d3.scale.linear()
    .domain([300, 1200])
    .range([50000, 150000]);

  d3.json("/json/" + settings['path'] + ".topojson", function(error, layer) {
    if (error) return console.error(error);
    var shapes = topojson.feature(layer, layer.objects.shapes);
    var projection = d3.geo.mercator()
      .scale(zoom_scale(height))
      .rotate([87.728675, -41.844114, 0])
      .translate([width/2, height/2]);
    var path = d3.geo.path()
      .projection(projection);
    gMap = svg.append('g');
    gMap.selectAll("path")
      .data(shapes.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("stroke", "white")
      .attr("stroke-width", 0.8)
      .attr("fill", "#202020DE")
      .attr("class", "shape")
      .on("mouseover", function(d, i) {
        if (settings['template']) {
          $('#info-box').html(_.template(settings['template'], {'shape': d.properties}));
        }
      });

    if (translate[0] && translate[1] && mainScale > 1) {
      gMap.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
    }
    if (currentOverlay['settings']) loadOverlay(currentOverlay['settings']);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition);
    }
  });
}

function showPosition(position) {
  d3.selectAll("text").remove();
  d3.selectAll("circle").remove();
  var width = $(document).width(), height = $(document).height();
  var zoom_scale = d3.scale.linear()
    .domain([300, 1200])
    .range([50000, 150000]);
  var projection = d3.geo.mercator()
      .scale(zoom_scale(height))
      .rotate([87.728675, -41.844114, 0])
      .translate([width/2, height/2]);
  var coords = projection([position.coords.longitude, position.coords.latitude]);

  gOver.append('text')
    .attr("class", "youarehere")
    .attr("transform", function() { return "translate(" + coords + ")scale(" + mainScale + ")"; })
    .attr("dx", ".35em")
    .attr("style", "font-size:" + (1/mainScale) + "em")
    .text('You are here');

  if (position.coords.accuracy) {
    gOver.append('circle')
      .attr("class", "youarehere")
      .attr("transform", function() { return "translate(" + coords + ")scale(" + mainScale + ")"; })
      .attr("stroke", "black")
      .attr("stroke-width", 1/mainScale + "px")
      .attr("fill", "rgba(0, 0, 0, 0.5)")
      .attr("r", 4 * (1/mainScale));
  }
}

function drawChicago(hide) {
  var width = $(document).width(), height = $(document).height();

  var zoom_scale = d3.scale.linear()
    .domain([300, 1200])
    .range([50000, 150000]);

  d3.json("/json/chicago.topojson", function(error, layer) {
    if (error) return console.error(error);
    var shapes = topojson.feature(layer, layer.objects.chicago);
    var projection = d3.geo.mercator()
      .scale(zoom_scale(height))
      .rotate([87.728675, -41.844114, 0])
      .translate(translate);
    var path = d3.geo.path()
      .projection(projection);
    gChi = svg.append('g');
    gChi.selectAll("path")
      .data(shapes.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "rgba(0, 0, 0, 0.05)")
      // .attr("class", "city");
    if (hide) {
      d3.selectAll("path.city")
        .attr('visibility', 'hidden');
      inVoid = true;
    }
  });
}

function loadOverlay(settings) {
  if (settings['none'] == 'none') {
    d3.selectAll("path.overlay").remove();
    $('#overlay-box').html('');
    return;
  }

  if (currentOverlay['settings'] == settings) {
    paintOverlay(currentOverlay['layer'], settings);
  } else {
    d3.json("/json/" + settings['path'] + ".topojson", function(error, layer) {
      if (error) return console.error(error);
      paintOverlay(layer, settings);
    });
  }
}

function paintOverlay(layer, settings) {
  currentOverlay = {'layer': layer, 'settings': settings};
  var width = $(document).width(), height = $(document).height();

  d3.selectAll("path.overlay").remove();
  $('#overlay-box').html('');

  var zoom_scale = d3.scale.linear()
    .domain([300, 1200])
    .range([50000, 150000]);
  var shapes = topojson.feature(layer, layer.objects.shapes);
  var projection = d3.geo.mercator()
    .scale(zoom_scale(height))
    .rotate([87.728675, -41.844114, 0])
    .translate([width/2, height/2]);
  var path = d3.geo.path()
    .pointRadius(settings['point-radius']/mainScale)
    .projection(projection);
  gOver = svg.append('g');
  gOver.selectAll("path")
    .data(shapes.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke-width", settings['stroke-width']/mainScale)
    .attr("opacity", settings['opacity'])
    .attr("fill", function(d, i) {
      if (settings['path'] == 'cta_rail') {
        return settings['scale'][d.properties.LEGEND];
      }
      return settings['scale'](i % settings['num_colors']);
    })
    .attr("stroke", function(d, i) {
      if (settings['path'] == 'cta_rail') {
        return settings['scale'][d.properties.LEGEND];
      }
      return settings['scale'](i % settings['num_colors']);
    })
    .attr("class", "overlay")
    .on("mouseover", function(d, i) {
      if (settings['template']) {
        $('#overlay-box').html(_.template(settings['template'], {'shape': d.properties}));
      } else {
        console.log(d.properties);
      }
    });
  if (translate[0] && translate[1] && mainScale > 1) {
    gOver.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition);
  }
}

function dragmove() {
  if (!inDrag && mainScale > 1) {
    inDrag = true;
    var width = $(document).width(), height = $(document).height();
    dragX = translate[0];
    dragY = translate[1];
  } else {
    dragX += d3.event.dx;
    dragY += d3.event.dy;
  }
  try {
    gChi.attr("transform", "translate(" + dragX + "," + dragY + ")scale(" + mainScale + ")");
    gMap.attr("transform", "translate(" + dragX + "," + dragY + ")scale(" + mainScale + ")");
    gOver.attr("transform", "translate(" + dragX + "," + dragY + ")scale(" + mainScale + ")");
  } catch(err) {
    ;
  }
  translate = [dragX, dragY];
}

function getPrecinctName(name_str) {
  if (name_str.indexOf('/') != -1) {
    var vals = name_str.split('/');
    return getOrdinalSuffix(parseInt(vals[0])) + ' precinct, ' +
      getOrdinalSuffix(parseInt(vals[1])) + ' ward';
  }
  return name_str;
}

$(document).ready(function() {
  var TIFTemplate = $('#tif-template').html();
  var PrecinctTemplate = $('#precinct-template').html();
  var ParksTemplate = $('#parks-template').html();
  var WardsTemplate = $('#wards-template').html();
  var NeighborhoodsTemplate = $('#neighborhoods-template').html();
  var CensusTractsTemplate = $('#census_tracts-template').html();
  var StreetsTemplate = $('#streets-template').html();
  var ElTemplate = $('#el-template').html();
  var BikeRouteTemplate = $('#bike_route-template').html();
  var PublicArtTemplate = $('#public_art-template').html();
  var DryPrecinctTemplate = $('#dry_precinct-template').html();
  var LandmarksTemplate = $('#landmarks-template').html();
  var BikeRackTemplate = $('#bike_rack-template').html();
  var main_scale = d3.scale.category20c();
  var alt_scale = d3.scale.ordinal()
    .domain([0, 8])
    .range(colorbrewer.Set1[9]);
  var park_scale = d3.scale.ordinal()
    .domain([0, 8])
    .range(colorbrewer.Greens[9]);
  var black_scale = d3.scale.ordinal()
    .domain([0, 1])
    .range(['#000000', '#000000']);
  var el_scale = {
    'GR': 'green',
    'OR': 'orange',
    'RD': 'red',
    'BR': 'brown',
    'BL': 'blue',
    'PR': 'purple',
    'YL': 'yellow',
    'PK': 'pink',
    'ML': 'black'
  };

  translate = [$(document).width()/2, $(document).height()/2];

  drag = d3.behavior.drag()
    .on("dragstart", function() {
      dragX = 0;
      dragY = 0;
      inDrag = false;
    })
    .on("drag", dragmove);

  var maps = {
    'precincts': {
      'path': 'precincts', 'scale': main_scale, 'num_colors': 20, 'template': PrecinctTemplate},
    'wards': {'path': 'wards', 'scale': main_scale, 'num_colors': 20, 'template': WardsTemplate},
    'tifs': {'path': 'tifs', 'scale': main_scale, 'num_colors': 20, 'template': TIFTemplate},
    'parks': {'path': 'parks', 'scale': park_scale, 'num_colors': 9, 'template': ParksTemplate},
    'census_tracts': {
      'path': 'census_tracts', 'scale': main_scale, 'num_colors': 20,
      'template': CensusTractsTemplate},
    'neighborhoods': {
      'path': 'neighborhoods', 'scale': main_scale, 'num_colors': 20,
      'template': NeighborhoodsTemplate},
    // 'boundaries': {'none': 'none'},
    'void': {'void': 'void'}
  };

  var overlay = {
    'none': {},
    'streets': {
      'path': 'streets', 'scale': main_scale, 'num_colors': 1, 'template': StreetsTemplate,
      'stroke-width': 1, 'opacity': '0.2', 'fill': false, 'point-radius': 1, 'repaint': false},
    'el': {
      'path': 'cta_rail', 'scale': el_scale, 'num_colors': 1, 'stroke-width': 4,
      'opacity': '0.7', 'template': ElTemplate, 'fill': false, 'point-radius': 1, 'repaint': false},
    'bike_routes': {'path': 'bike_routes', 'scale': main_scale, 'num_colors': 1, 'stroke-width': 1,
      'opacity': '0.7', 'template': BikeRouteTemplate, 'fill': false, 'point-radius': 1,
      'repaint': false},
    'bike_racks': {'path': 'bike_racks', 'scale': alt_scale, 'num_colors': 1, 'stroke-width': 1,
      'opacity': '0.8', 'fill': true, 'point-radius': 2, 'repaint': true, 'color': '#DAF7A6',
      'template': BikeRackTemplate},
    'landmarks': {'path': 'landmarks', 'scale': alt_scale, 'num_colors': 1, 'stroke-width': 1,
      'opacity': '0.8', 'fill': true, 'point-radius': 5, 'repaint': true,
      'template': LandmarksTemplate},
    'public_art': {'path': 'public_art', 'scale': alt_scale, 'num_colors': 1, 'stroke-width': 1,
      'opacity': '0.8', 'fill': true, 'template': PublicArtTemplate, 'point-radius': 5,
      'repaint': true},
    'dry_precincts': {'path': 'dry_precincts', 'scale': black_scale, 'num_colors': 1,
      'stroke-width': 0, 'opacity': '0.5', 'template': DryPrecinctTemplate, 'fill': true,
      'point-radius': 1, 'repaint': false},
    'none': {'none': 'none'}
  };

  var width = $(document).width(), height = $(document).height();
  svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(drag);

  var map = maps['wards'];
  var over = overlay['none'];
  var params = $.url().param();
  if (params) {
    if (params['map'] && maps[params['map']]) {
      if (params['map'] != 'void')
        drawChicago(false);
      else
        drawChicago(true);
      map = maps[params['map']];
      $('select#map').val(params['map']);
    } else {
      drawChicago(false);
    }
    if (params['overlay'] && overlay[params['overlay']]) {
      over = overlay[params['overlay']];
      $('select#overlay').val(params['overlay']);
    }
  }
  loadMap(map);
  loadOverlay(over);


  // d3.csv("a (1).csv", function(data) {
  //         var circle = svg.selectAll("circle")
  //             .data(data)
  //             .enter().append("circle")
  //             .attr("cx", function(d) { if(d.crime_type == 1 ){ return projection([d.X, d.Y])[0];} })
  //             .attr("cy", function(d) { if(d.crime_type == 1) {return projection([d.X, d.Y])[1]; }})
  //             .attr("r", 1);
  //
  //         // places.selectAll("text")
  //         //     .data(data)
  //         //   .enter().append("text")
  //         //     .attr("x", function(d) { return projection([d.lon, d.lat])[0]; })
  //         //     .attr("y", function(d) { return projection([d.lon, d.lat])[1] + 8; })
  //         //     .text(function(d) { return d.name });
  //     });





  $('#page-link > a').attr(
    'href', '/index.html?map=' + $('select#map').val() + '&overlay=' + $('select#overlay').val());
  $('select#map').change(function(e) {
    if (inVoid && $(this).val() != 'void') {
      d3.selectAll("path.city")
        .attr('visibility', 'visible');
      inVoid = false;
    }
    loadMap(maps[$(this).val()]);
    $('#page-link > a').attr(
      'href', '/index.html?map=' + $('select#map').val() + '&overlay=' + $('select#overlay').val());
  });
  $('select#overlay').change(function(e) {
    loadOverlay(overlay[$(this).val()]);
    $('#page-link > a').attr(
      'href', '/index.html?map=' + $('select#map').val() + '&overlay=' + $('select#overlay').val());
  });

  $('#zoom-in').click(function() {
    var width = ($(document).width()/(1/mainScale)), height = ($(document).height()/(1/mainScale));
    translate = [
      -(width/2) + (translate[0] - lastZoom[0]),
      -(height/2) + (translate[1] - lastZoom[1])];
    lastZoom = [-(width/2), -(height/2)];
    translate = lastZoom;
    mainScale += 1;
    gChi.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
    gMap.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
    gOver.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
    gOver.selectAll('path.overlay')
      .attr("stroke-width", currentOverlay['settings']['stroke-width']/mainScale);
    if (currentOverlay['settings']['repaint'])
      loadOverlay(currentOverlay['settings']);
  });
  $('#zoom-out').click(function() {
    if (mainScale > 1) {
      mainScale -= 1;
      var width = $(document).width()/(1/(mainScale - 1)),
        height = $(document).height()/(1/(mainScale - 1));
      translate = [
        -(width/2) + (translate[0] - lastZoom[0]),
        -(height/2) + (translate[1] - lastZoom[1])];
      lastZoom = [-(width/2), -(height/2)];
      translate = lastZoom;
      gChi.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
      gMap.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
      gOver.attr("transform", "translate(" + translate + ")scale(" + mainScale + ")");
      gOver.selectAll('path.overlay')
        .attr("stroke-width", currentOverlay['settings']['stroke-width']/mainScale);
      if (currentOverlay['settings']['repaint'])
        loadOverlay(currentOverlay['settings']);

    }
  });
});
