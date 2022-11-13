'use strict';

const fetch = require('node-fetch');
const xml2js = require('xml2js');

class Util {

  constructor(opts) {
    this.homey = opts.homey;
  }

  sendCommand(command, address, port) {
    return new Promise((resolve, reject) => {
      const fetchCommand = `http://${address}:${port}/${command}`;
      this.homey.log('Sending command: ', fetchCommand);
      fetch(fetchCommand, {
        method: 'GET',
        timeout: 4000,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then((result) => {
              return resolve(result);
            });
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  getBluesound(address, port, useLongPolling, pollingInterval, etag) {
    return new Promise((resolve, reject) => {
      let fetchCommand;
      let fetchTimeout;
      if (useLongPolling) {
        fetchCommand = `http://${address}:${port}/Status?timeout=${pollingInterval}&etag=${etag}`;
        fetchTimeout = (pollingInterval + 2) * 1000;
      } else {
        fetchCommand = `http://${address}:${port}/Status`;
        fetchTimeout = (pollingInterval - 2) * 1000;
      }
      // this.homey.log('Sending command: ', fetchCommand);
      fetch(fetchCommand, {
        method: 'GET',
        timeout: fetchTimeout,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then((result) => {
              let title1;
              let title2;
              let title3;
              let artist;
              let track;
              let album;
              let service;
              let streamUrl;
              let image;
              let muteVolume;
              if (Object.prototype.hasOwnProperty.call(result.status, 'title1')) {
                title1 = result.status.title1[0];
              } else {
                title1 = this.homey.__('util.not_available');
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'title2')) {
                title2 = result.status.title2[0];
              } else {
                title2 = this.homey.__('util.not_available');
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'title3')) {
                title3 = result.status.title3[0];
              } else {
                title3 = this.homey.__('util.not_available');
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'artist')) {
                artist = result.status.artist[0];
              } else {
                // E.g. TuneIn (typically artist - track)
                artist = title1;
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'name')) {
                track = result.status.name[0];
              } else if (title2 === artist) {
                // E.g. Qobuz, Spotify
                track = title1;
              } else {
                // E.g. Radio Paradise
                track = title2;
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'album')) {
                album = result.status.album[0];
              } else {
                album = title3;
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'service')) {
                service = result.status.service[0];
              } else {
                service = this.homey.__('util.not_available');
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'streamUrl')) {
                streamUrl = result.status.streamUrl[0];
              } else {
                streamUrl = null;
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'image')) {
                image = result.status.image[0];
              } else {
                image = this.homey.__('util.not_available');
              }
              if (Object.prototype.hasOwnProperty.call(result.status, 'muteVolume')) {
                muteVolume = Number(result.status.muteVolume[0]);
              } else {
                muteVolume = 0;
              }

              const data = {
                etag: result.status.$.etag,
                album,
                artist,
                image,
                mute: Number(result.status.mute),
                muteVolume,
                repeat: Number(result.status.repeat),
                service,
                shuffle: Number(result.status.shuffle),
                state: result.status.state.toString(),
                streamUrl,
                track,
                volume: Number(result.status.volume),
              };
              return resolve(data);
            });
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  getInputs(address, port) {
    return new Promise((resolve, reject) => {
      fetch(`http://${address}:${port}/RadioBrowse?service=Capture`, {
        method: 'GET',
        timeout: 4000,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then((result) => {
              const items = result.radiotime.item;
              const list = [];
              if (items.length > 0) {
                items.forEach((item) => {
                  list.push({
                    icon: '/app/com.bluesound/assets/icon.svg',
                    name: item.$.text,
                    url: item.$.URL,
                    inputimage: item.$.image,
                  });
                });
              }
              return resolve(list);
            });
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  getServices(address, port) {
    return new Promise((resolve, reject) => {
      fetch(`http://${address}:${port}/Services`, {
        method: 'GET',
        timeout: 4000,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then((result) => {
              const services = result.services.service;
              const list = [];
              if (services.length > 0) {
                services.forEach((service) => {
                  if (service.$.type === 'RadioService' || service.$.type === 'LocalMedia' || service.$.type === 'CloudService') {
                    list.push({
                      icon: '/app/com.bluesound/assets/icon.svg',
                      name: service.$.name,
                      inputimage: service.$.icon,
                    });
                  }
                });
              }
              return resolve(list);
            });
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  getInput(address, port) {
    return new Promise((resolve, reject) => {
      fetch(`http://${address}:${port}/Status`, {
        method: 'GET',
        timeout: 4000,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const parser = new xml2js.Parser();
          parser.parseStringPromise(body)
            .then((result) => {
              let input;
              if (Object.prototype.hasOwnProperty.call(result.status, 'service')) {
                input = 'BluOS';
              } else {
                input = result.status.title2[0];
              }
              return resolve(input);
            });
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  checkStatus = (res) => {
    if (res.ok) {
      return res;
    }
    throw new Error(res.status);
  }

}

module.exports = Util;
