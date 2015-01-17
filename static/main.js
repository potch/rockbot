function extend(o, n) {
  for (var p in n) {
    o[p] = n[p];
  }
  return o;
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
      self.setState({
        mode: self.state.mode,
        zones: data
      });
    });
  },
  render: function () {
    var zone = this.state.zones[this.state.selected];
    return (
      React.createElement("div", {className: "app", "data-mode": this.state.mode}, 
        React.createElement(Overview, {zones: this.state.zones, selectZone: this.selectZone}), 
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
    return (
      React.createElement("section", {className: "overview"}, 
        this.props.zones.map(function(z, i) {
          return (
            React.createElement("div", {className: "zone-item", key: i, 
                 onClick: this.handleClick.bind(this, i)}, 
              React.createElement(ZoneOverview, {
                name: z.name, 
                nowPlaying: z.aData.aNowPlaying})
            )
          );
        }, this)
      )
    );
  }
});

var ZoneOverview = React.createClass({displayName: "ZoneOverview",
  render: function() {
    if (this.props.nowPlaying) {
      return (
        React.createElement("div", null, 
          React.createElement(AlbumArt, {url: this.props.nowPlaying.sArtwork}), 
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
    console.log(this.props);
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
      backgroundImage: 'url(' + url + ')'
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
      query: ''
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
  onChange: function (e) {
    var q = e.target.value;
    this.setState(extend(this.state, {
      query: q
    }));
    if (q.length > 2) {
      this.performSearch();
    }
  },
  performSearch: function () {
    console.log('search', this.state.query);
    socket.emit('search', {
      query: this.state.query,
      venue: this.props.zone.id
    });
  },
  componentDidMount: function() {
    var self = this;
    socket.on('results', function (data) {
      console.log(data.query, self.state.query);
      if (data.query === self.state.query) {
        console.log(data);
        self.setState(extend(self.state, data));
      }
    });
  },
  render: function () {
    return (
      React.createElement("section", {className: "search"}, 
        React.createElement("header", null, 
          React.createElement("a", {href: "#", onClick: this.go.bind(this, 'detail')}, "Back"), 
          React.createElement("h1", null, "Search")
        ), 
        React.createElement("form", {className: "searchForm"}, 
          React.createElement("input", {className: "query", onChange: this.onChange, value: this.state.query})
        ), 
        React.createElement("div", {className: "results-container"}, 
          React.createElement(SearchResults, {results: this.state, 
                         searchArtist: this.searchArtist, 
                         pickSong: this.pickSong})
        )
      )
    );
  }
});

var SearchResults = React.createClass({displayName: "SearchResults",
  pickSong: function (songId, e) {
    this.props.pickSong(songId);
  },
  listArtist: function (artistId, e) {
    this.props.searchArtist(artistId);
  },
  render: function () {
    var artists = this.props.results.artist;
    var songs = this.props.results.song;
    return (
      React.createElement("div", {className: "results"}, 
        React.createElement("h2", null, "Artists (", artists.length, ")"), 
        React.createElement("ul", null, 
          artists.filter(function (r) {
            return r.bEnabled !== false;
          }).map(function (r) {
            return React.createElement("li", {onClick: this.listArtist.bind(this, r.idArtist)}, r.sName);
          }, this)
        ), 
        React.createElement("h2", null, "Songs (", songs.length, ")"), 
        React.createElement("ul", null, 
          songs.filter(function (r) {
            return r.bEnabled !== false;
          }).map(function (r) {
            return React.createElement("li", {onClick: this.pickSong.bind(this, r.idSong)}, r.sArtist, " - ", r.sName);
          }, this)
        )
      )
    );
  }
});


var socket = io.connect('/');
var o = React.createElement(Overview);

React.render(React.createElement(App, null), document.querySelector('#app'));
