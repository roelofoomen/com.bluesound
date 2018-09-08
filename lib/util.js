const Homey = require('homey');
const fetch = require('node-fetch');
const xml2js = require("xml2js");

exports.sendCommand = function (command, address, port) {

  return new Promise(function (resolve, reject) {
    fetch('http://'+ address +':'+ port +'/'+ command, {
        method: 'GET',
        headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')},
        timeout: 4000
      })
      .then(checkStatus)
      .then(res => res.text())
      .then(body => {
        var parser = new xml2js.Parser();
        parser.parseString(body, function (error, result) {
          return resolve(result);
        });
      })
      .catch(err => {
        return reject(err);
      });
  })
}

exports.getBluesound = function (address, port) {

  return new Promise(function (resolve, reject) {
    fetch('http://'+ address +':'+ port +'/Status', {
        method: 'GET',
        headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')},
        timeout: 4000
      })
      .then(checkStatus)
      .then(res => res.text())
      .then(body => {
        var parser = new xml2js.Parser();
        parser.parseString(body, function (error, result) {
          if (result.status.hasOwnProperty("artist")) {
            var artist = result.status.artist[0];
          } else {
            var artist = 'Not available';
          }
          if (result.status.hasOwnProperty("album")) {
            var album = result.status.album[0];
          } else {
            var album = 'Not available';
          }
          if (result.status.hasOwnProperty("title1")) {
            var title1 = result.status.title1[0];
          } else {
            var title1 = 'Not available';
          }
          if (result.status.hasOwnProperty("title2")) {
            var title2 = result.status.title2[0];
          } else {
            var title2 = 'Not available';
          }
          if (result.status.hasOwnProperty("name")) {
            var track = result.status.name[0];
          } else if (title2 !== artist && result.status.service[0] !== 'LocalMusic') {
            var track = title2;
          } else if (title2 == artist) {
            var track = title1;
          } else {
            var track = 'Not available';
          }

          var data = {
            state: result.status.state[0],
            service: result.status.service[0],
            volume: Number(result.status.volume),
            shuffle: Number(result.status.shuffle),
            repeat: Number(result.status.repeat),
            artist: artist,
            track: track,
            album: album
          }

          return resolve(data);
        });
      })
      .catch(err => {
        return reject(err);
      });
  })
}

exports.getInputs = function (address, port) {

  return new Promise(function (resolve, reject) {
    fetch('http://'+ address +':'+ port +'/RadioBrowse?service=Capture', {
        method: 'GET',
        headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')},
        timeout: 4000
      })
      .then(checkStatus)
      .then(res => res.text())
      .then(body => {
        var parser = new xml2js.Parser();
        parser.parseString(body, function (error, result) {
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
        });
      })
      .catch(err => {
        return reject(err);
      });
  })
}

exports.getServices = function (address, port) {

  return new Promise(function (resolve, reject) {
    fetch('http://'+ address +':'+ port +'/Services', {
        method: 'GET',
        headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')},
        timeout: 4000
      })
      .then(checkStatus)
      .then(res => res.text())
      .then(body => {
        var parser = new xml2js.Parser();
        parser.parseString(body, function (error, result) {
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
        });
      })
      .catch(err => {
        return reject(err);
      });
  })
}

function checkStatus(res) {
    if (res.ok) {
        return res;
    } else {
      return reject(res.status);
    }
}

function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}
