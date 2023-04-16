'use strict';

const Homey = require('homey');
const Util = require('./lib/util');

class BluesoundApp extends Homey.App {

  onInit() {
    this.log('Initializing Bluesound app ...');

    if (!this.util) this.util = new Util({ homey: this.homey });

    // ** Condition cards
    this.homey.flow.getConditionCard('shuffled')
      .registerRunListener(async (args) => {
        if (args.device.getStoreValue('shuffle') === 1) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

    // ** Action cards
    // Deprecated in favour of native action
    this.homey.flow.getActionCard('repeat')
      .registerRunListener(async (args) => {
        const path = `Repeat?state=${args.repeat}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      });

    // Deprecated in favour of native action
    this.homey.flow.getActionCard('shuffle')
      .registerRunListener(async (args) => {
        const path = `Shuffle?state=${args.shuffle}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      });

    this.homey.flow.getActionCard('changeinput')
      .registerRunListener(async (args) => {
        const path = `Play?url=${args.inputs.url}&image=${args.inputs.inputimage}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      })
      .getArgument('inputs')
      .registerAutocompleteListener(async (query, args) => {
        return this.util.getInputs(args.device.getSetting('address'), args.device.getSetting('port'));
      });

    this.homey.flow.getActionCard('switchinput')
      .registerRunListener(async (args) => {
        if (args.direction === 'down') {
          this.util.sendCommand('ExternalSource?id=-', args.device.getSetting('address'), args.device.getSetting('port'))
            .then((result) => {
              return Promise.resolve(true);
            })
            .catch((error) => {
              return Promise.resolve(false);
            });
        } else if (args.direction === 'up') {
          return this.util.sendCommand('ExternalSource?id=%2B', args.device.getSetting('address'), args.device.getSetting('port'));
        }
        return Promise.resolve(false);
      });

    this.homey.flow.getActionCard('changeservice')
      .registerRunListener(async (args) => {
        const path = `Genres?service=${args.services.name}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      })
      .getArgument('services')
      .registerAutocompleteListener(async (query, args) => {
        return this.util.getServices(args.device.getSetting('address'), args.device.getSetting('port'));
      });

    this.homey.flow.getActionCard('playpreset')
      .registerRunListener(async (args) => {
        const path = `Preset?id=${args.preset}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      });

    this.homey.flow.getActionCard('addslave')
      .registerRunListener(async (args) => {
        const groupname = encodeURI(args.group);
        const path = `AddSlave?slave=${args.ip}&amp;group=${groupname}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      });

    this.homey.flow.getActionCard('removeslave')
      .registerRunListener(async (args) => {
        const path = `RemoveSlave?slave=${args.ip}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      });

    // Deprecated in favour of native action
    this.homey.flow.getActionCard('setRelativeVolume')
      .registerRunListener(async (args) => {
        if (args.device.getStoreValue('volume') < 0) {
          args.device.log('Volume not changed: player has a fixed volume level.');
          // Volume -1 indicates fixed level: set capability to 100 %.
          args.device.setCapabilityValue('volume_set', 1);
          return false;
        }
        args.device.log('Changing relative volume by: ', args.volume * 100);
        const newVolume = (args.device.getCapabilityValue('volume_set') + args.volume) * 100;
        const path = `Volume?level=${Math.min(Math.max(newVolume, 0), 100).toFixed()}`;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'));
      });

    this.homey.flow.getActionCard('sendcommand')
      .registerRunListener(async (args) => {
        return this.util.sendCommand(args.command, args.device.getSetting('address'), args.device.getSetting('port'));
      });
  }

}

module.exports = BluesoundApp;
