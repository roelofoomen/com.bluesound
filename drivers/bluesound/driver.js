'use strict';

const Homey = require('homey');
const Util = require('../../lib/util');

class BluesoundDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({ homey: this.homey });

    this.homey.flow.getDeviceTriggerCard('start_playing');
    this.homey.flow.getDeviceTriggerCard('stop_playing');
    this.homey.flow.getDeviceTriggerCard('artist_changed');
    this.homey.flow.getDeviceTriggerCard('track_changed');
  }

  onPair(session) {
    session.setHandler('testConnection', async (data) => {
      try {
        const response = await this.util.sendCommand('SyncStatus', data.address, data.port);
        if (response) {
          const result = {
            brand: response.SyncStatus.$.brand,
            model: response.SyncStatus.$.modelName,
            mac: response.SyncStatus.$.mac,
          };
          return Promise.resolve(result);
        }
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    });
  }

}

module.exports = BluesoundDriver;
