var ssdp = require('node-ssdp').Client;
var _ = require('lodash');
var http = require('http');

const fs = require('fs');
const API = require('last.fm.api');


const updateInterval = 1000;
const scrobbleAfter = 240000;
const countBeforeScrobble = Math.trunc(scrobbleAfter/updateInterval);
var logLevel = 2;

function readConfig() {
  fs.readFile('./config.json', 'utf8', 
    function(err, content) {
      if (!err) {
        var config = JSON.parse(content);
        if (typeof config.loglevel != "undefined") logLevel = config.loglevel;
      }
    }
  );
}

var ssdpClient;
var devices = [];
var currentSongs = [];
var lastFMSession;
var api;

function initLastFmClient(onSuccess) {
  fs.readFile('./secret.json', 'utf8', 
    function (err, session) {
      if (err) {
        console.log('Config secret.json is missing, please create one');
      } else {
        var secrets = JSON.parse(session);
        api = new API({ 
            apiKey: secrets.key, 
            apiSecret: secrets.secret,
            debug: true,
            username: secrets.username,
            password: secrets.password,
          });
        onSuccess();
      }
    }
  );
}

function authenticateLastFmUser(onSuccess) {
  fs.readFile('./session.json', 'utf8', 
    function (err, session) {
      if (err) {
        api.auth.getMobileSession({})
          .then(json => json.session)
	  .then(session => {
              // Now that we have a session try to add some tags (a method that requires auth)
              fs.writeFile('./session.json', JSON.stringify(session), function () {
                  lastFMSession = session;
                  console.log("Saved session");
                  if (logLevel >= 3) console.log(lastFMSession);
                  onSuccess();
                }
              );
	    })
	  .catch(err => {
	    console.error('ERRORED!', JSON.stringify(err));
            process.exit();
	  });
      } else {
        lastFMSession = JSON.parse(session);
        console.log("Restored session");
        if (logLevel >= 3) console.log(lastFMSession);
        onSuccess();
      }
    } // function
  );
}

function sendScrobble(songInfoDict) {
  if (logLevel >= 1) { 
    console.log('Scrobbling ' + songInfoDict.artist + ' - ' + songInfoDict.track);
  }
  api.track.scrobble(songInfoDict);
}

function getProperSong(input, artist, album, track, funcSongFound, funcSongNotFound) {
  if (input == 'net_radio' && track.length > 0) {
    var search = _.map(_.split(track, '-'), function (s) { return _.trim(s); });

    if (search.length == 3) {
      artist = search[0];
      track = search[2];
    } else if (search.length == 2) {
      artist = search[0];
      track = search[1];
    } else {
      artist = _.head(search);
      track = _.tail(search).join(' - ');
    }
  }
  if (!artist || !track || artist.length == 0 || track.length == 0) {
    funcSongNotFound('Missing artist or title - unable to identify a song');
  } else {
    api.track.getInfo({'artist': artist, 'track': track})
      .then(json => { funcSongFound(json.track); })
      .catch(err => { console.error(err); });
  }
}

function getSong(ip, input, scrobbleSong) {
  var path;
  if (_.indexOf(['spotify', 'net_radio', 'server'], input) > -1) {
    path = '/YamahaExtendedControl/v1/netusb/getPlayInfo';
  } else if (input == 'cd') {
    path = '/YamahaExtendedControl/v1/cd/getPlayInfo';
  }
  if (path) {
    http.get({
        host: ip,
        path: path
      }, 
      function (response) {
        var body = '';
        response.on('data', 
          function (d) {
            body += d;
          }
        );
        response.on('end', 
          function () {
            var parsed = JSON.parse(body);
            if (_.get(parsed, 'playback') == 'play') {
              if (input == 'cd') {
                // yeah, cd-text has artist/track in invalid attributes
                var artist = _.trim(_.get(parsed, 'album', '')), album = '', track = _.trim(_.get(parsed, 'artist', ''));
              } else {
                var artist = _.trim(_.get(parsed, 'artist', '')), album = _.trim(_.get(parsed, 'album', '')), track = _.trim(_.get(parsed, 'track', ''));
              }

              var current = _.get(currentSongs, ip);
              var trackinfo = artist + album + track;

              if (current == null || current.trackinfocheck != trackinfo) {
                var funcSongFound = 
                  // executed once when proper song information could be retrieved (by getProperSong)
                  function (song) { 
                    const halfSongDuration = song.duration/2.0;
                    const timeBeforeScrobble = Math.min(halfSongDuration, scrobbleAfter);
                    const countBeforeScrobble = Math.trunc(timeBeforeScrobble/updateInterval);

                    if (logLevel >= 2) { 
                      console.log('Got ', [_.get(song, 'artist.name'), _.get(song, 'album.title', ''), _.get(song, 'name')], 
                                           ' - waiting ' + timeBeforeScrobble/1000 + ' s before scrobble');
                    }

                    const songInfoDict = {
                      'artist': song.artist.name,
                      'track': song.name,
                      'sk': lastFMSession.key,
                      'timestamp': Math.floor((new Date()).getTime() / 1000)
                    };
                    _.set(currentSongs, [ip], 
                      { 
                        trackinfocheck: trackinfo, 
                        count: 0, 
                        scrobbled: false, 
                        song: song,
                        songInfoDict: songInfoDict,
                        countBeforeScrobble: countBeforeScrobble
                      }
                    );

                    // send info about current song to last fm (not yet the final scrobble!)
                    api.track.updateNowPlaying(songInfoDict);
                  }; // funcSongFound

                var funcSongNotFound = 
                  function (err) {
                    if (logLevel >= 1) { 
                      console.log('Not scrobbling:', err);
                    }
                    _.set(currentSongs, [ip], {trackinfocheck: trackinfo, count: 0, scrobbled: true, song: null});
                  }; // funcSongNotFound

                getProperSong(input, artist, album, track, funcSongFound, funcSongNotFound);
              }
              // increase loop counter if song is still the same as before
              if (current != null && current.trackinfocheck == trackinfo) {
                _.set(currentSongs, [ip, 'count'], (current.count + 1));
              }
              // check preconditions for the final scrobble
              if (   current != null 
                  && current.song != null
                  && current.scrobbled == false
                  && current.trackinfocheck == trackinfo 
                  && current.count > current.countBeforeScrobble
                  )
              {
                _.set(currentSongs, [ip, 'scrobbled'], true);
                scrobbleSong(current.songInfoDict);
              }
            }
          } // function (response.on)
        ); // response.on
      } // function (http.get)
    ); // http.get
  }
}

function getInput(ip, onPowerOn) {
  http.get({
      host: ip,
      path: '/YamahaExtendedControl/v1/main/getStatus'
    }, 
    function (response) {
      var body = '';
      response.on('data', function(d) { body += d; });
      response.on('end', function () {
        var parsed = JSON.parse(body);
        if (_.get(parsed, 'power') == 'on') {
          onPowerOn(ip, _.get(parsed, 'input'));
        }
      });
    }
  ); // http.get
}

function playInfoLoop() {
  _.each(devices, 
    function (ip) {
      getInput(ip, 
        function (ip, input) {
          getSong(ip, input, 
            function (song) {
              sendScrobble(song);
            }
          )
        }
      )
    }
  );
}

function initSsdpClient(onReady) {
  ssdpClient = new ssdp();
  ssdpClient.on('response', processSsdpResponse);
  setTimeout(onReady, 500);
}

function processSsdpResponse(headers, code, rinfo) {
  var model = _.get(headers, 'X-MODELNAME');
  if (   model 
      && (   model.indexOf('CRX-') !== -1 
          || model.indexOf('WX-') !== -1 
          || model.indexOf('NP-S303') !== -1)
     ) 
  {
    if (_.indexOf(devices, rinfo['address']) == -1) {
      devices.push(rinfo['address']);
    }
  }
}

function ssdpSearch() {
  ssdpClient.search('ssdp:all');
  setTimeout(function () {
    ssdpClient.stop();
    if (logLevel >= 2) { 
      console.log('Devices in network:', devices);
    }
  }, 2000);
}

process.title = 'ymc_scrobbler'

readConfig(); 

// loop SSDP device discovery every 1 minute
initSsdpClient(function () {
  ssdpSearch();
  setInterval(ssdpSearch, (1000 * 60));
});

// expire device list every 15 minutes
setInterval(
  function () {
    if (logLevel >= 2) { 
      console.log('Resetting devices list');
    }
    devices = [];
  }, 
  (1000 * 60 * 15)
);

// login user info a Last.FM and loop current song check/scrobble every 1s
initLastFmClient(
  function () {
    authenticateLastFmUser(
        function () {
           setInterval(playInfoLoop, updateInterval);
        }
    )
  }
);
