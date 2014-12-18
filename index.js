var express = require('express');
var request = require('request');
var app = express();

app.set('port', (process.env.PORT || 8080));
app.use(express.static(__dirname + '/static'));

var url = 'https://rockbot.com/venues/mozilla-mtv-';

app.get('/', function (req, res) {
  res.redirect('/index.html');
});

app.get('/playing/:zone$', function(req, res) {
  request(url + req.params.zone + '.json', function (error, response, body) {
    if (error) {
      res.status(400);
      res.end(error);
    } else {
      res.set('Content-Type', 'application/json');
      res.end(body);
    }
  });
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
