const Homey = require('homey');
const xml2js = require("xml2js");
const rp = require('request-promise-native');

exports.getHomeyIp = function () {
    return new Promise(function (resolve, reject) {
        Homey.ManagerCloud.getLocalAddress()
            .then(localAddress => {
                return resolve(localAddress)
            })
            .catch(error => {
                throw new Error(error);
            })
    })
}

exports.sendCommand = function (command, address, port) {

    return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/"+ command,
            resolveWithFullResponse: true,
            timeout: 4000
        };

        rp(options)
            .then(function (response) {
                if (response.statusCode == 200) {
                    var parser = new xml2js.Parser();
                    parser.parseString(response.body, function (error, result) {
                        return resolve(result);
                    });
                } else {
                    return reject(response.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })
}

exports.getBluesound = function (address, port) {

    return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/Status",
            resolveWithFullResponse: true,
            timeout: 4000
        };

        rp(options)
            .then(function (response) {

                if (response.statusCode == 200) {
                    var parser = new xml2js.Parser();
                    parser.parseString(response.body, function (error, result) {
                        if (result.status.hasOwnProperty("artist")) {
                            var artist = result.status.artist[0];
                        } else {
                            var artist = 'Not available';
                        }
                        if (result.status.hasOwnProperty("name")) {
                            var track = result.status.name[0];
                        } else {
                            var track = 'Not available';
                        }
                        if (result.status.hasOwnProperty("album")) {
                            var album = result.status.album[0];
                        } else {
                            var album = 'Not available';
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
                } else {
                    return reject(error.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })
}

exports.getInputs = function (address, port) {

    return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/RadioBrowse?service=Capture",
            resolveWithFullResponse: true,
            timeout: 4000
        };

        rp(options)
            .then(function (response) {

                if (response.statusCode == 200) {
                    var parser = new xml2js.Parser();
                    parser.parseString(response.body, function (error, result) {
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
                } else {
                    return reject(error.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}
