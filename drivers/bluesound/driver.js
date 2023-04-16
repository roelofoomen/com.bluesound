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
        this.log('Testing connection...');
        const response = await this.util.sendCommand('SyncStatus', data.address, data.port);
        // this.log(response);
        let result;
        if (response) {
          let brand = '';
          let model = '';
          let mac = '';
          if (Object.prototype.hasOwnProperty.call(response.SyncStatus, 'attr_brand')) {
            brand = response.SyncStatus.attr_brand;
          }
          if (Object.prototype.hasOwnProperty.call(response.SyncStatus, 'attr_modelName')) {
            model = response.SyncStatus.attr_modelName;
          }
          if (Object.prototype.hasOwnProperty.call(response.SyncStatus, 'attr_mac')) {
            mac = response.SyncStatus.attr_mac;
          }
          result = {
            brand,
            model,
            mac,
          };
          this.log('Connection test result:', result);
        } else {
          result = {
            brand: '',
            model: '',
            mac: '',
          };
          this.log('Connection test failed.');
        }
        return Promise.resolve(result);
      } catch (error) {
        this.log('Connection test failed, error:', error);
        return Promise.reject(error);
      }
    });
  }

}

module.exports = BluesoundDriver;
