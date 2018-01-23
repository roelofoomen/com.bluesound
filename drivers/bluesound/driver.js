"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class BluesoundDriver extends Homey.Driver {

    onInit() {
        new Homey.FlowCardTriggerDevice('start_playing').register();
        new Homey.FlowCardTriggerDevice('stop_playing').register();
        new Homey.FlowCardTriggerDevice('artist_changed').register();
        new Homey.FlowCardTriggerDevice('track_changed').register();
    }

    onPair(socket) {
        socket.on('testConnection', function(data, callback) {
            util.sendCommand('SyncStatus', data.address, data.port)
                .then(response => {
                    var result = {
                        brand: response.SyncStatus.$.brand,
						model: response.SyncStatus.$.modelName,
                        mac: response.SyncStatus.$.mac
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
