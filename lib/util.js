const Homey = require('homey');
const xml2js = require("xml2js");

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
                    var data = JSON.parse(response.body);

                    var result = {
                        battery: data.battery_level.data[0][1][0],
                        motionalarm: motion,
                        soundalarm: sound,
                        lux: lux
                    }

                    return resolve(result);
                } else {
                    return reject(response.statusCode);
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
