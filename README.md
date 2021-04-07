# yamaha_musiccast_scrobbler

## Info
Last.FM scrobbler for Yamaha MusicCast devices, eg. NP-S303

Simple application to discover MusicCast devices in local network, check what is playing and scrobble it
to Last.FM. Before scrobble application tries to lookup song in Last.FM database for validation 
reasons. If it's successful song will be scrobbled.

Supports NP-S303, CRX-* (CRX-N470D, etc.) and WX-* (WX-030, etc.) devices and following inputs:

- CD (only when cd-text available)
- Spotify
- Net radio
- Net server (DLNA)

This is (obviously) a fork of [arekk/yamaha_musiccast_scrobbler](https://github.com/arekk/yamaha_musiccast_scrobbler). The changes I made are:

- now using the last.fm.api (https://github.com/leemm/last.fm.api) which is a wrapper for Last.FM API v2 (Scrobbling 2.0, https://www.last.fm/api/scrobbling)
- using "Now Playing" and only scrobbling after half of the track's duration or 4 min, whichever comes first
- added Yamaha NP-S303 (a nice network player I own)
- code formatting (unfortunately; I don't really know javascript/node so I had to do that in order to wrap my head around what's going on, especially with this Promises concept. Maybe I'll come back one day when I have read up on jaavascript and proper formatting guidlines for js code, maybe I won't)
- added an upstart script (to be used with a Synology NAS) for starting the scrobbler at boot

## Install
You must have node.js installed: https://nodejs.org 
I tested it on my local Linux box and on a Synology NAS.
For the Synology NAS, there is a Node.js package available in the Package Center, I tested it with Node.js v12.

Please note – the application doesn't work properly under Windows.

Before you start you need a Last.Fm api key and secret – get it here: https://www.last.fm/api/account/create

Key and secret must be placed into the file ``secret.json``, along with your last.fm username and password:

````
{
  "key": "aaaaaabccdff7b027e8fca7da4aaaaaa",
  "secret": "bbbbbb8ffab50feaabefd75c5bbbbbb"
  "username": "your last.fm username",
  "password": "your last.fm password"
}
````

Next step is running ``npm install`` and if you immediately want to start it, e.g. on your Linux box, ``npm start``

For running (and automatically starting) this on a Synology NAS, see [ymc_scrobbler.conf](https://github.com/lineinthesand/yamaha_musiccast_scrobbler/blob/master/ymc_scrobbler.conf) for further directions.

## Config
The config.json file can be used to configure the log levels. To change the default log level from 2 (scrobbles & frequent device information), change "_loglevel" to "loglevel" and set it to 1 to only log scrobbles (no information about devices in network, which tends to spam the log even if you don't scrobble anything) or 0 to not even log the scrobbles.
