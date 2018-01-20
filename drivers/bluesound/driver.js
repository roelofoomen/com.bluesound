"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class BluesoundDriver extends Homey.Driver {

    onPair(socket) {
        socket.on('testConnection', function(data, callback) {
            util.sendCommand('SyncStatus', data.address, data.port)
                .then(response => {
                    var result = {
                        brand: response["SyncStatus"]["$"]["brand"],
						model: response["SyncStatus"]["$"]["modelName"],
						modelNo: response["SyncStatus"]["$"]["model"],
                        mac: response["SyncStatus"]["$"]["mac"]
                    }
                    callback(false, result);
                })
                .catch(error => {
                    callback(error, null);
                })
        });
    }

}

module.exports = BluesoundDriver;
