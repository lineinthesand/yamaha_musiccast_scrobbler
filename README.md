# yamaha_musiccast_scrobbler

## Info
This is (obviously) a fork of arekk/yamaha_musiccast_scrobbler
The changes I made are:
- now using the last.fm.api (https://github.com/leemm/last.fm.api) which is a wrapper for Last.FM API v2 (Scrobbling 2.0, https://www.last.fm/api/scrobbling)
- using "Now Playing" and only scrobbling after half of the track's duration or 4 min, whichever comes first
- Added Yamaha NP-S303 (a nice network player I own)
- code formatting (unfortunately; I don't really know javascript/node so I had to do that in order to wrap my head around what's going on, especially with this Promises concept. Maybe I'll come back one day when I have read up on jaavascript and proper formatting guidlines for js code, maybe I won't)
- added an upstart script (to be used with a Synology NAS) for starting the scrobbler at boot

Below is the original README:

Last.FM scrobbler for Yamaha MusicCast devices, ie. CRX-N470D

Simple application to discover MusicCast devices in local network, check what is playing and scrobble it
to Last.FM. Before scrobble application tries to lookup song in Last.FM database for validation 
reasons. If it's successful song will be scrobbled.

Support CRX-* (CRX-N470D, etc.) and WX-* (WX-030, etc.) devices and following inputs:

- CD (only when cd-text available)
- Spotify
- Net radio
- Net server (DLNA)

## Install
You must have node.js installed: https://nodejs.org

Please note - application don't work properly under Windows.

Before you start you need Last.Fm api key and secret - get it here: http://www.last.fm/api/account/create
Key and secret must be placed into file ``secret.json``:

````
{
  "key": "aaaaaabccdff7b027e8fca7da4aaaaaa",
  "secret": "bbbbbb8ffab50feaabefd75c5bbbbbb"
}
````

Next step is running ``npm install`` and ``npm start``

If you haven't granted access for application yet you'll be prompted to open URL first.
