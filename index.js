var express = require('express');
var http = require('http');
var request = require('request');
var socketio = require('socket.io');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/static'));

var server = http.createServer(app);
var io = socketio.listen(server);

var nowplayingURL = 'https://rockbot.com/venues/mozilla-mtv-';
var apiURL = 'https://api.rockbot.com/';

var venues = process.env.VENUES;

if (venues && typeof venues === 'string') {
  venues = venues.split('|');
  if (venues.length) {
    venues = venues.map(function(v) {
      v = v.split(':');
      return {
        name: v[0],
        id: v[1],
        api: v[2]
      };
    });
    venues.forEach(function(v) {
      venues[v.id] = v;
    });
  } else {
    console.error('No Venues Found! Be sure the VENUES variable is set.');
  }
} else {
  console.error('No Venues Found! Be sure the VENUES variable is set.');
  venues = [];
}

var currently = [];

function api(v, m, p, cb) {
  var parts = m.split(':');
  var type = parts[0];
  var method = parts[1];
  var venue = venues[v];
  p.api_key = venue.api;
  p.method = method;
  console.log(apiURL + type, p);
  request({
    url: apiURL + type,
    qs: p
  }, function(err, res, body) {
    if (err) {
      console.log('api error:', err);
      return cb(err);
    }
    if (body) {
      try {
        body = JSON.parse(body);
        return cb(null, body);
      } catch (e) {
        return cb(e);
      }
    }
    return cb(null);
  });
}

function checkCurrent() {
  var num = venues.length;
  var count = 0;
  venues.forEach(function(v, i) {
    api(v.id, 'kiosk:get_now_playing', {}, function (err, res) {
      count++;
      if (num === count) {
        io.emit('currently', currently);
      }
      if (err || !res) {
        console.error('error getting data');
        return;
      }
      res.name = v.name;
      res.id = v.id;
      currently[i] = res;
    });
  });
  setTimeout(checkCurrent, 10000);
}

io.on('connect', function (socket) {
  io.emit('currently', currently);

  socket.on('upvote', function (o) {
    console.log('upvote', o);
    api(o.venue, 'kiosk:add_up_vote', {pick: o.pick}, function (err, res) {
      console.log(err, res);
      for (var i = 0; i < currently.length; i++) {
        if (currently[i].id === o.venue) {
          res.name = currently[i].name;
          res.id = o.venue;
          currently[i] = res;
          io.emit('currently', currently);
        }
      }
    });
  });
  socket.on('downvote', function (o) {
    console.log('downvote', o);
    api(o.venue, 'kiosk:add_down_vote', {pick: o.pick}, function (err, res) {
      console.log(err, res);
      for (var i = 0; i < currently.length; i++) {
        if (currently[i].id === o.venue) {
          res.name = currently[i].name;
          res.id = o.venue;
          currently[i] = res;
          io.emit('currently', currently);
        }
      }
    });
  });
  socket.on('search', function (o) {
    console.log('search', o);
    var results = {
      query: o.query,
      artist: []
    };
    var match = o.query.match(/^artist:(\d+)/);
    if (match) {
      api(o.venue, 'kiosk:get_artist', {artist: match[1]}, function (err, res) {
        if (err) {
          results.song = [];
        } else {
          results.song = res.aData;
        }
        socket.emit('results', results);
      });
    } else {
      api(o.venue, 'kiosk:search_artists', {query: o.query}, function (err, res) {
        if (err) {
          results.artist = [];
        } else {
          results.artist = res.aData;
        }
        api(o.venue, 'kiosk:search_songs', {query: o.query}, function (err, res) {
          if (err) {
            results.song = [];
          } else {
            results.song = res.aData;
          }
          socket.emit('results', results);
        });
      });
    }
  });
  socket.on('pick', function (o) {
    api(o.venue, 'kiosk:add_song', {song: o.song}, function (err, res) {
      console.log(err, res);
      for (var i = 0; i < currently.length; i++) {
        if (currently[i].id === o.venue) {
          res.name = currently[i].name;
          res.id = o.venue;
          currently[i] = res;
          io.emit('currently', currently);
        }
      }
    });
  });
});

var sekrit = process.env.SEKRIT;
app.get('/skip', function (req, res) {
  var zone = req.query.z;
  var key = req.query.k;
  if (zone && venues[zone-1] && key === sekrit) {
    api(zone - 1, 'admin:skip', {}, function () {
      res.end('yup');
    });
  } else {
    res.end('nope');
  }
});

app.get('/', function(req, res) {
  res.redirect('/index.html');
});

server.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
  checkCurrent();
});
