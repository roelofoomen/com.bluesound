'use strict';

const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

class Util {

  constructor(opts) {
    this.homey = opts.homey;
    this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: 'attr_' });
  }

  sendCommand(command, address, port) {
    return new Promise((resolve, reject) => {
      const fetchCommand = `http://${address}:${port}/${command}`;
      // this.homey.log('Sending command: ', fetchCommand);
      fetch(fetchCommand, {
        method: 'GET',
        timeout: 4000,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const result = this.parser.parse(body);
          return resolve(result);
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
      // this.homey.log('Getting status (command:', fetchCommand, ')');
      fetch(fetchCommand, {
        method: 'GET',
        timeout: fetchTimeout,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const result = this.parser.parse(body);

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
            title1 = result.status.title1;
          } else {
            title1 = this.homey.__('util.not_available');
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'title2')) {
            title2 = result.status.title2;
          } else {
            title2 = this.homey.__('util.not_available');
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'title3')) {
            title3 = result.status.title3;
          } else {
            title3 = this.homey.__('util.not_available');
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'artist')) {
            artist = result.status.artist;
          } else {
            // E.g. TuneIn (typically artist - track)
            artist = title1;
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'name')) {
            track = result.status.name;
          } else if (title2 === artist) {
            // E.g. Qobuz, Spotify
            track = title1;
          } else {
            // E.g. Radio Paradise
            track = title2;
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'album')) {
            album = result.status.album;
          } else {
            album = title3;
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'service')) {
            service = result.status.service;
          } else {
            service = this.homey.__('util.not_available');
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'streamUrl')) {
            streamUrl = result.status.streamUrl;
          } else {
            streamUrl = null;
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'image')) {
            image = result.status.image;
          } else {
            image = this.homey.__('util.not_available');
          }
          if (Object.prototype.hasOwnProperty.call(result.status, 'muteVolume')) {
            muteVolume = Number(result.status.muteVolume);
          } else {
            muteVolume = 0;
          }

          const data = {
            etag: result.status.attr_etag,
            album: String(album),
            artist: String(artist),
            image: String(image),
            mute: Number(result.status.mute),
            muteVolume: Number(muteVolume),
            repeat: Number(result.status.repeat),
            service: String(service),
            shuffle: Number(result.status.shuffle),
            state: String(result.status.state),
            streamUrl,
            track: String(track),
            volume: Number(result.status.volume),
          };
          return resolve(data);
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  convertToArray(obj) {
    if (obj instanceof Array) {
      return obj;
    }
    return [obj];
  }

  getInputs(address, port) {
    return new Promise((resolve, reject) => {
      const fetchCommand = `http://${address}:${port}/RadioBrowse?service=Capture`;
      this.homey.log('Getting inputs (command:', fetchCommand, ')');
      fetch(fetchCommand, {
        method: 'GET',
        timeout: 4000,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const result = this.parser.parse(body);
          const items = this.convertToArray(result.radiotime.item);
          const list = [];
          if (items.length > 0) {
            items.forEach((item) => {
              list.push({
                icon: '/app/com.bluesound/assets/icon.svg',
                name: item.attr_text,
                url: item.attr_URL,
                inputimage: item.attr_image,
              });
            });
          }
          return resolve(list);
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  getServices(address, port) {
    return new Promise((resolve, reject) => {
      const fetchCommand = `http://${address}:${port}/Services`;
      this.homey.log('Getting services (command:', fetchCommand, ')');
      fetch(fetchCommand, {
        method: 'GET',
        timeout: 4000,
      })
        .then(this.checkStatus)
        .then((res) => res.text())
        .then((body) => {
          const result = this.parser.parse(body);
          const services = this.convertToArray(result.services.service);
          const list = [];
          if (services.length > 0) {
            services.forEach((service) => {
              if (service.attr_type === 'RadioService' || service.attr_type === 'LocalMedia' || service.attr_type === 'CloudService') {
                list.push({
                  icon: '/app/com.bluesound/assets/icon.svg',
                  name: service.attr_name,
                  inputimage: service.attr_icon,
                });
              }
            });
          }
          return resolve(list);
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
  };

}

module.exports = Util;
