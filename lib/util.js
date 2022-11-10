'use strict';

const fetch = require('node-fetch');
const xml2js = require("xml2js");

class Util {

  constructor(opts) {
    this.homey = opts.homey;
  }

  sendCommand(command, address, port) {
    return new Promise((resolve, reject) => {
      this.homey.log("Sending command: ", 'http://'+ address +':'+ port +'/'+ command);
      fetch('http://'+ address +':'+ port +'/'+ command, {
          method: 'GET',
          timeout: 4000
        })
        .then(this.checkStatus)
        .then(res => res.text())
        .then(body => {
          var parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then(result => {
              return resolve(result);
            })
        })
        .catch(error => {
          return reject(error);
        });
    })
  }

  getBluesound(address, port) {
    return new Promise((resolve, reject) => {
      fetch('http://'+ address +':'+ port +'/Status', {
          method: 'GET',
          timeout: 4000
        })
        .then(this.checkStatus)
        .then(res => res.text())
        .then(body => {
          var parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then(result => {
              if (result.status.hasOwnProperty("title1")) {
                var title1 = result.status.title1[0];
              } else {
                var title1 = this.homey.__('util.not_available');
              }
              if (result.status.hasOwnProperty("title2")) {
                var title2 = result.status.title2[0];
              } else {
                var title2 = this.homey.__('util.not_available');
              }
              if (result.status.hasOwnProperty("title3")) {
                var title3 = result.status.title3[0];
              } else {
                var title3 = this.homey.__('util.not_available');
              }
              if (result.status.hasOwnProperty("artist")) {
                var artist = result.status.artist[0];
              } else {
                // E.g. TuneIn (typically artist - track)
                var artist = title1;
              }
              if (result.status.hasOwnProperty("name")) {
                var track = result.status.name[0];
              } else if (title2 == artist) {
                // E.g. Qobuz, Spotify
                var track = title1;
              } else {
                // E.g. Radio Paradise
                var track = title2;
              }
              if (result.status.hasOwnProperty("album")) {
                var album = result.status.album[0];
              } else {
                var album = title3;
              }
              if (result.status.hasOwnProperty("service")) {
                var service = result.status.service[0];
              } else {
                var service = this.homey.__('util.not_available');
              }
              if (result.status.hasOwnProperty("streamUrl")) {
                var streamUrl = result.status.streamUrl[0];
              } else {
                var streamUrl = null;
              }
              if (result.status.hasOwnProperty("image")) {
                var image = result.status.image[0];
              } else {
                var image = this.homey.__('util.not_available');
              }
              if (result.status.hasOwnProperty("muteVolume")) {
                var muteVolume = Number(result.status.muteVolume[0]);
              } else {
                var muteVolume = 0;
              }

              var data = {
                album: album,
                artist: artist,
                image: image,
                mute: Number(result.status.mute),
                muteVolume: muteVolume,
                repeat: Number(result.status.repeat),
                service: service,
                shuffle: Number(result.status.shuffle),
                state: result.status.state.toString(),
                streamUrl: streamUrl,
                track: track,
                volume: Number(result.status.volume)
              }
              return resolve(data);
            })
        })
        .catch(error => {
          return reject(error);
        });
    })
  }

  getInputs(address, port) {
    return new Promise((resolve, reject) => {
      fetch('http://'+ address +':'+ port +'/RadioBrowse?service=Capture', {
          method: 'GET',
          timeout: 4000
        })
        .then(this.checkStatus)
        .then(res => res.text())
        .then(body => {
          var parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then(result => {
              var items = result.radiotime.item;
              var list = [];
              if (items.length > 0) {
                items.forEach(function(item) {
                  list.push({
                    icon: '/app/com.bluesound/assets/icon.svg',
                    name: item.$.text,
                    url: item.$.URL,
                    inputimage: item.$.image
                  })
                });
              }
              return resolve(list);
            })
        })
        .catch(error => {
          return reject(error);
        });
    })
  }

  getServices(address, port) {
    return new Promise((resolve, reject) => {
      fetch('http://'+ address +':'+ port +'/Services', {
          method: 'GET',
          timeout: 4000
        })
        .then(this.checkStatus)
        .then(res => res.text())
        .then(body => {
          var parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then(result => {
              var services = result.services.service;
              var list = [];
              if (services.length > 0) {
                services.forEach(function(service) {
                  if (service.$.type === 'RadioService' || service.$.type === 'LocalMedia' || service.$.type === 'CloudService') {
                    list.push({
                      icon: '/app/com.bluesound/assets/icon.svg',
                      name: service.$.name,
                      inputimage: service.$.icon
                    })
                  }
                });
              }
              return resolve(list);
            })
        })
        .catch(error => {
          return reject(error);
        });
    })
  }

  getInput(address, port) {
    return new Promise((resolve, reject) => {
      fetch('http://'+ address +':'+ port +'/Status', {
          method: 'GET',
          timeout: 4000
        })
        .then(this.checkStatus)
        .then(res => res.text())
        .then(body => {
          var parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then(result => {
              if (result.status.hasOwnProperty("service")) {
                var input = "BluOS";
              } else {
                var input = result.status.title2[0];
              }
              return resolve(input);
            })
        })
        .catch(error => {
          return reject(error);
        });
    })
  }

  checkStatus = (res) => {
    if (res.ok) {
      return res;
    } else {
      throw new Error(res.status);
    }
  }

}

module.exports = Util;
