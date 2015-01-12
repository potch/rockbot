function extend(o, n) {
  for (var p in n) {
    o[p] = n[p];
  }
  return o;
}

var App = React.createClass({
  setMode: function (mode) {
    this.setState(extend(this.state, {
      mode: 'mode'
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
    return (
      <div className="app" data-mode={this.state.mode}>
        <Overview zones={this.state.zones} selectZone={this.selectZone} />
        <ZoneDetail zone={this.state.zones[this.state.selected]} go={this.setMode} />
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
           onClick={this.upVote.bind(this, a.idPick)}>👍 {a.iLikes}</a>
        <a className="down" href="#"
           onClick={this.downVote.bind(this, a.idPick)}>👎 {a.iDislikes}</a>
      </li>
    );
  }
});

var ZoneDetail = React.createClass({
  back: function (e) {
    e.preventDefault();
    this.props.go('overview');
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
            <a href="#" onClick={this.back}>Back</a>
            <h1>{z.name}</h1>
          </header>
          <div className="nowplaying">
            <AlbumArt url={now.sArtwork} />
            <div className="info">
              <h1>{now.sArtist} - {now.sSong}</h1>
              <User className="user" avatar={now.sUserImage} name={now.sUser} />
            </div>
          </div>
          <h1 className="upnext">Up Next</h1>
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
    var style = {
      backgroundImage: 'url(' + this.props.url + ')'
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


var socket = io.connect('/');
var o = React.createElement(Overview);

React.render(<App />, document.querySelector('#app'));
