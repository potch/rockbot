function extend(o, n) {
  for (var p in n) {
    o[p] = n[p];
  }
  return o;
}

function classSet(o) {
  var c = [];
  for (var k in o) {
    if (!!o[k]) {
      c.push(k);
    }
  }
  return c.join(' ');
}

var App = React.createClass({displayName: "App",
  setMode: function (mode) {
    this.setState(extend(this.state, {
      mode: mode
    }));
  },
  selectZone: function (zone) {
    this.setState(extend(this.state, {
      selected: zone,
      mode: 'detail'
    }));
  },
  getInitialState: function() {
    return {
      mode: 'overview',
      selected: 0,
      zones: []
    };
  },
  componentDidMount: function() {
    var self = this;
    socket.on('currently', function (data) {
      data = data.sort(function (a, b) {
        return a.name > b.name ? 1: -1;
      });
      var zones = data.filter(function (z) {
        return z.aData.iStatus === 'online';
      });
      self.setState({
        mode: self.state.mode,
        zones: zones
      });
    });
  },
  render: function () {
    var zones = this.state.zones;
    var zone = zones[this.state.selected];
    return (
      React.createElement("div", {className: "app", "data-mode": this.state.mode}, 
        React.createElement(Overview, {zones: zones, selectZone: this.selectZone}), 
        React.createElement(ZoneDetail, {zone: zone, go: this.setMode}), 
        React.createElement(SearchPanel, {zone: zone, go: this.setMode})
      )
    );
  }
});

var Overview = React.createClass({displayName: "Overview",
  handleClick: function (i, e) {
    this.props.selectZone(i);
  },
  render: function () {
    var height = 100 / this.props.zones.length;
    height = Math.min(height, 35) + 'vh';
    var style = {
      height: height
    };
    return (
      React.createElement("section", {className: "overview"}, 
        this.props.zones.map(function(z, i) {
          return (
            React.createElement("div", {className: "zone-item", key: i, 
                 onClick: this.handleClick.bind(this, i), 
                 style: style}, 
              React.createElement(ZoneOverview, {
                name: z.name, 
                height: height, 
                nowPlaying: z.aData.aNowPlaying})
            )
          );
        }, this), 
        React.createElement(AppInstallDingus, null)
      )
    );
  }
});

var AppInstallDingus = React.createClass({displayName: "AppInstallDingus",
  attemptInstall: function (e) {
    e.preventDefault();
    if (this.state.capable) {
      var url = window.location.origin + '/manifest.webapp';
      var installReq = navigator.mozApps.install(url);
      installReq.onsuccess = function () {
        if (installReq.result) {
          this.state.installed = true;
          this.setState(this.state);
        }
      }.bind(this);
    }
  },
  getInitialState: function () {
    return {
      installed: false,
      pending: false,
      capable: navigator.mozApps
    };
  },
  componentDidMount: function() {
    if (this.state.capable) {
      var selfReq = navigator.mozApps.getSelf();
      selfReq.onsuccess = function () {
        console.log('installed', selfReq.result);
        if (selfReq.result) {
          this.state.installed = true;
          this.setState(this.state);
        }
      }.bind(this);

      var installedReq = navigator.mozApps.getInstalled();
      installedReq.onsuccess = function () {
        console.log('installed', installedReq.result);
        if (installedReq.result && installedReq.result.length) {
          this.state.installed = true;
          this.setState(this.state);
        }
      }.bind(this);
    }
  },
  render: function () {
    var classes = classSet({
      installed: this.state.installed,
      pending: this.state.pending,
      capable: this.state.capable,
      install: true
    });
    return React.createElement("a", {className: classes, href: "#", onClick: this.attemptInstall}, "Install");
  }
});

var ZoneOverview = React.createClass({displayName: "ZoneOverview",
  render: function() {
    if (this.props.nowPlaying) {
      return (
        React.createElement("div", null, 
          React.createElement(AlbumArt, {url: this.props.nowPlaying.sArtwork, height: this.props.height}), 
          React.createElement("div", {className: "info"}, 
            React.createElement("div", null, this.props.name), 
            React.createElement("div", null, this.props.nowPlaying.sArtist, " - ", this.props.nowPlaying.sSong)
          )
        )
      );
    }
    return React.createElement("div", null);
  }
});

var QueueItem = React.createClass({displayName: "QueueItem",
  upVote: function (pick, e) {
    e.preventDefault();
    this.props.upvote(pick);
  },
  downVote: function (pick, e) {
    e.preventDefault();
    this.props.downvote(pick);
  },
  render: function () {
    var a = this.props.item;
    return (
      React.createElement("li", {className: "queue-item"}, 
        React.createElement("div", {className: "info"}, a.sArtist, " - ", a.sSong), 
        React.createElement(User, {avatar: a.sUserImage, name: a.sUser}), 
        React.createElement("a", {className: "up", href: "#", 
           onClick: this.upVote.bind(this, a.idPick)}, a.iLikes), 
        React.createElement("a", {className: "down", href: "#", 
           onClick: this.downVote.bind(this, a.idPick)}, a.iDislikes)
      )
    );
  }
});

var ZoneDetail = React.createClass({displayName: "ZoneDetail",
  go: function (mode, e) {
    e.preventDefault();
    this.props.go(mode);
  },
  upvote: function (pick) {
    console.log('upvoting pick ' + pick);
    socket.emit('upvote', {
      pick: pick,
      venue: this.props.zone.id
    });
  },
  downvote: function (pick) {
    socket.emit('downvote', {
      pick: pick,
      venue: this.props.zone.id
    });
  },
  render: function () {
    var z = this.props.zone;
    if (z) {
      var now = z.aData.aNowPlaying;
      var queue = z.aData.aQueue;
      return (
        React.createElement("section", {className: "detail"}, 
          React.createElement("header", null, 
            React.createElement("a", {href: "#", onClick: this.go.bind(this, 'overview')}, "Back"), 
            React.createElement("h1", null, z.name), 
            React.createElement("a", {href: "#", onClick: this.go.bind(this, 'search')}, "Search")
          ), 
          React.createElement("div", {className: "nowplaying"}, 
            React.createElement(AlbumArt, {url: now.sArtwork, big: true}), 
            React.createElement("div", {className: "info"}, 
              React.createElement("h1", null, now.sArtist, " - ", now.sSong), 
              React.createElement(User, {className: "user", avatar: now.sUserImage, name: now.sUser})
            )
          ), 
          React.createElement("h2", {className: "upnext"}, "Up Next"), 
          React.createElement("div", {className: "queue-container"}, 
            React.createElement("ol", {className: "queue"}, 
              queue.map(function (item) {
                return React.createElement(QueueItem, {key: item.idPick, item: item, upvote: this.upvote, downvote: this.downvote});
              }, this)
            )
          )
        )
      );
    }
    return (React.createElement("div", {className: "detail empty"}, "No Zone Selected."));
  }
});

var AlbumArt = React.createClass({displayName: "AlbumArt",
  render: function () {
    var url = this.props.url;
    var big = this.props.big;
    if (big) {
      url = url.replace('/150/', '/500/');
    }
    var style = {
      backgroundImage: 'url(' + url + ')',
      height: this.props.height,
      width: this.props.height
    };
    return React.createElement("div", {className: "art", style: style});
  }
});

var User = React.createClass({displayName: "User",
  render: function () {
    var style = {
      backgroundImage: 'url(' + this.props.avatar + ')'
    };
    return React.createElement("div", {className: "user", style: style, title: this.props.name});
  }
});

var SearchPanel = React.createClass({displayName: "SearchPanel",
  go: function (mode, e) {
    e.preventDefault();
    this.props.go(mode);
  },
  getInitialState: function () {
    return {
      artist: [],
      song: [],
      query: '',
      pending: false
    };
  },
  searchArtist: function (artistId) {
    this.setState(extend(this.state, {
      query: 'artist:' + artistId
    }));
    this.performSearch();
  },
  pickSong: function (songId) {
    socket.emit('pick', {
      song: songId,
      venue: this.props.zone.id
    });
  },
  updateQuery: function (q) {
    if (q.length > 0) {
      this.setState(extend(this.state, {
        query: q
      }));
      this.performSearch();
    }
  },
  onChange: function (e) {
    console.log(e);
    var q = e.target.value;
    clearTimeout(this.to);
    this.to = setTimeout(this.updateQuery.bind(this, q), 200);
  },
  performSearch: function () {
    console.log('search', this.state.query);
    this.setState(extend(this.state, {
      pending: true
    }));
    socket.emit('search', {
      query: this.state.query,
      venue: this.props.zone.id
    });
  },
  componentDidMount: function() {
    var self = this;
    socket.on('results', function (data) {
      if (data.query === self.state.query) {
        console.log('results', data);
        self.setState(extend(self.state, {
          artist: data.artist,
          song: data.song,
          pending: false
        }));
      }
    });
  },
  render: function () {
    if (!this.props.zone) {
      return React.createElement("div", null);
    }
    var pending = '';
    if (this.state.pending) {
      pending = 'pending';
    }
    return (
      React.createElement("section", {className: "search"}, 
        React.createElement("header", null, 
          React.createElement("a", {href: "#", onClick: this.go.bind(this, 'detail')}, "Back"), 
          React.createElement("h1", null, "Search")
        ), 
        React.createElement("div", {className: "searchForm " + pending}, 
          React.createElement("input", {className: "query", onChange: this.onChange}), 
          this.state.pending ? React.createElement(Throbber, null) : ''
        ), 
        React.createElement("div", {className: "results-container"}, 
          React.createElement(SearchResults, {results: this.state, 
                         queue: this.props.zone.aData.aQueue, 
                         searchArtist: this.searchArtist, 
                         pickSong: this.pickSong})
        )
      )
    );
  }
});

var SearchResults = React.createClass({displayName: "SearchResults",
  pickSong: function (songId) {
    this.props.pickSong(songId);
  },
  listArtist: function (artistId, e) {
    e.preventDefault();
    this.props.searchArtist(artistId);
  },
  render: function () {
    var artists = this.props.results.artist;
    var songs = this.props.results.song;
    if (!artists) {
      artists = [];
    }
    if (!songs) {
      songs = [];
    }
    return (
      React.createElement("div", {className: "results"}, 
        React.createElement("h2", null, "Artists (", artists.length, ")"), 
        React.createElement("ul", null, 
          artists.filter(function (r) {
            return r.bEnabled !== false;
          }).map(function (r) {
            return (
              React.createElement("li", {key: r.idArtist}, 
                React.createElement("a", {href: "#", 
                   onClick: this.listArtist.bind(this, r.idArtist)}, 
                    r.sName
                )
              )
            );
          }, this)
        ), 
        React.createElement("h2", null, "Songs (", songs.length, ")"), 
        React.createElement("ul", null, 
          songs.filter(function (r) {
            return r.bEnabled !== false;
          }).map(function (r) {
            var picked = false;
            if (this.props.queue) {
              this.props.queue.forEach(function (q) {
                if (q.sSong === r.sName && q.sArtist === r.sArtist) {
                  picked = true;
                }
              });
            }
            return React.createElement(SongResult, {key: r.idSong, picked: picked, song: r, pick: this.pickSong});
          }, this)
        )
      )
    );
  }
});

var SongResult = React.createClass({displayName: "SongResult",
  getInitialState: function () {
    return {
      pending: false
    };
  },
  pick: function (e) {
    e.preventDefault();
    this.props.pick(this.props.song.idSong);
    this.setState({
      pending: true
    });
  },
  render: function () {
    var song = this.props.song;
    var pending = this.state.pending && !this.props.picked;
    var classes = classSet({
      'picked': this.props.picked,
      'pending': pending
    });
    return (
      React.createElement("li", {key: song.idSong, className: classes}, 
        React.createElement("a", {href: "#", 
           onClick: this.pick}, 
            song.sArtist, " - ", song.sName
        ), 
        pending ? React.createElement(Throbber, null) : '', 
        this.props.picked ? React.createElement("div", null, "✓") : ''
      )
    );
  }
});

var Throbber = React.createClass({displayName: "Throbber",
  render: function () {
    return React.createElement("div", {className: "throb"});
  }
});

var socket = io.connect('/');
var o = React.createElement(Overview);

React.render(React.createElement(App, null), document.querySelector('#app'));
