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
    var zones = this.state.zones.filter(function (z) {
      return z.aData.iStatus === 'online';
    });
    return (
      <div className="app" data-mode={this.state.mode}>
        <Overview zones={zones} selectZone={this.selectZone} />
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
    var height = 100 / this.props.zones.length;
    height = Math.min(height, 35) + 'vh';
    var style = {
      height: height
    };
    return (
      <section className="overview">
        {this.props.zones.map(function(z, i) {
          return (
            <div className="zone-item" key={i}
                 onClick={this.handleClick.bind(this, i)}
                 style={style}>
              <ZoneOverview
                name={z.name}
                height={height}
                nowPlaying={z.aData.aNowPlaying} />
            </div>
          );
        }, this)}
        <AppInstallDingus />
      </section>
    );
  }
});

var AppInstallDingus = React.createClass({
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
    return <a className={classes} href="#" onClick={this.attemptInstall}>Install</a>;
  }
});

var ZoneOverview = React.createClass({
  render: function() {
    if (this.props.nowPlaying) {
      return (
        <div>
          <AlbumArt url={this.props.nowPlaying.sArtwork} height={this.props.height}/>
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
      backgroundImage: 'url(' + url + ')',
      height: this.props.height,
      width: this.props.height
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
      return <div></div>;
    }
    var pending = '';
    if (this.state.pending) {
      pending = 'pending';
    }
    return (
      <section className="search">
        <header>
          <a href="#" onClick={this.go.bind(this, 'detail')}>Back</a>
          <h1>Search</h1>
        </header>
        <div className={"searchForm " + pending}>
          <input className="query" onChange={this.onChange} />
          {this.state.pending ? <Throbber /> : ''}
        </div>
        <div className="results-container">
          <SearchResults results={this.state}
                         queue={this.props.zone.aData.aQueue}
                         searchArtist={this.searchArtist}
                         pickSong={this.pickSong} />
        </div>
      </section>
    );
  }
});

var SearchResults = React.createClass({
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
      <div className="results">
        <h2>Artists ({artists.length})</h2>
        <ul>
          {artists.filter(function (r) {
            return r.bEnabled !== false;
          }).map(function (r) {
            return (
              <li key={r.idArtist}>
                <a href="#"
                   onClick={this.listArtist.bind(this, r.idArtist)}>
                    {r.sName}
                </a>
              </li>
            );
          }, this)}
        </ul>
        <h2>Songs ({songs.length})</h2>
        <ul>
          {songs.filter(function (r) {
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
            return <SongResult key={r.idSong} picked={picked} song={r} pick={this.pickSong}/>;
          }, this)}
        </ul>
      </div>
    );
  }
});

var SongResult = React.createClass({
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
      <li key={song.idSong} className={classes}>
        <a href="#"
           onClick={this.pick}>
            {song.sArtist} - {song.sName}
        </a>
        {pending ? <Throbber /> : ''}
        {this.props.picked ? <div>✓</div> : ''}
      </li>
    );
  }
});

var Throbber = React.createClass({
  render: function () {
    return <div className="throb"></div>;
  }
});

var socket = io.connect('/');
var o = React.createElement(Overview);

React.render(<App />, document.querySelector('#app'));
