function extend(o, n) {
  for (var p in n) {
    o[p] = n[p];
  }
  return o;
}

var App = React.createClass({
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
      <div className="app" data-mode={this.state.mode}>
        <Overview zones={this.state.zones} selectZone={this.selectZone} />
        <ZoneDetail zone={zone} go={this.setMode} />
        <SearchPanel zone={zone} go={this.setMode} />
      </div>
    );
  }
});

var Overview = React.createClass({
  handleClick: function (i, e) {
    this.props.selectZone(i);
  },
  render: function () {
    return (
      <section className="overview">
        {this.props.zones.map(function(z, i) {
          return (
            <div className="zone-item" key={i}
                 onClick={this.handleClick.bind(this, i)}>
              <ZoneOverview
                name={z.name}
                nowPlaying={z.aData.aNowPlaying} />
            </div>
          );
        }, this)}
      </section>
    );
  }
});

var ZoneOverview = React.createClass({
  render: function() {
    if (this.props.nowPlaying) {
      return (
        <div>
          <AlbumArt url={this.props.nowPlaying.sArtwork} />
          <div className="info">
            <div>{this.props.name}</div>
            <div>{this.props.nowPlaying.sArtist} - {this.props.nowPlaying.sSong}</div>
          </div>
        </div>
      );
    }
    return <div></div>;
  }
});

var QueueItem = React.createClass({
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
      <li className="queue-item">
        <div className="info">{a.sArtist} - {a.sSong}</div>
        <User avatar={a.sUserImage} name={a.sUser} />
        <a className="up" href="#"
           onClick={this.upVote.bind(this, a.idPick)}>{a.iLikes}</a>
        <a className="down" href="#"
           onClick={this.downVote.bind(this, a.idPick)}>{a.iDislikes}</a>
      </li>
    );
  }
});

var ZoneDetail = React.createClass({
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
        <section className="detail">
          <header>
            <a href="#" onClick={this.go.bind(this, 'overview')}>Back</a>
            <h1>{z.name}</h1>
            <a href="#" onClick={this.go.bind(this, 'search')}>Search</a>
          </header>
          <div className="nowplaying">
            <AlbumArt url={now.sArtwork} big={true} />
            <div className="info">
              <h1>{now.sArtist} - {now.sSong}</h1>
              <User className="user" avatar={now.sUserImage} name={now.sUser} />
            </div>
          </div>
          <h2 className="upnext">Up Next</h2>
          <div className="queue-container">
            <ol className="queue">
              {queue.map(function (item) {
                return <QueueItem key={item.idPick} item={item} upvote={this.upvote} downvote={this.downvote} />;
              }, this)}
            </ol>
          </div>
        </section>
      );
    }
    return (<div className="detail empty">No Zone Selected.</div>);
  }
});

var AlbumArt = React.createClass({
  render: function () {
    var url = this.props.url;
    var big = this.props.big;
    if (big) {
      url = url.replace('/150/', '/500/');
    }
    var style = {
      backgroundImage: 'url(' + url + ')'
    };
    return <div className="art" style={style} />;
  }
});

var User = React.createClass({
  render: function () {
    var style = {
      backgroundImage: 'url(' + this.props.avatar + ')'
    };
    return <div className="user" style={style} title={this.props.name}></div>;
  }
});

var SearchPanel = React.createClass({
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
      <section className="search">
        <header>
          <a href="#" onClick={this.go.bind(this, 'detail')}>Back</a>
          <h1>Search</h1>
        </header>
        <form className="searchForm">
          <input className="query" onChange={this.onChange} value={this.state.query} />
        </form>
        <div className="results-container">
          <SearchResults results={this.state}
                         searchArtist={this.searchArtist}
                         pickSong={this.pickSong} />
        </div>
      </section>
    );
  }
});

var SearchResults = React.createClass({
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
      <div className="results">
        <h2>Artists ({artists.length})</h2>
        <ul>
          {artists.filter(function (r) {
            return r.bEnabled !== false;
          }).map(function (r) {
            return <li onClick={this.listArtist.bind(this, r.idArtist)}>{r.sName}</li>;
          }, this)}
        </ul>
        <h2>Songs ({songs.length})</h2>
        <ul>
          {songs.filter(function (r) {
            return r.bEnabled !== false;
          }).map(function (r) {
            return <li onClick={this.pickSong.bind(this, r.idSong)}>{r.sArtist} - {r.sName}</li>;
          }, this)}
        </ul>
      </div>
    );
  }
});


var socket = io.connect('/');
var o = React.createElement(Overview);

React.render(<App />, document.querySelector('#app'));
