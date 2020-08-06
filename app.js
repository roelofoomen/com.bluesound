'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class BluesoundApp extends Homey.App {

  onInit() {
    this.log('Initializing Bluesound app ...');

    if (!this.util) this.util = new Util({homey: this.homey });

    // CONDITION CARDS
    this.homey.flow.getConditionCard('playing')
      .registerRunListener(async (args) => {
        if (args.device.getStoreValue('state') !== "pause") {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    this.homey.flow.getConditionCard('shuffled')
      .registerRunListener(async (args) => {
        if (args.device.getStoreValue('shuffle') == 1) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    // ACTION CARDS
    this.homey.flow.getActionCard('repeat')
      .registerRunListener(async (args) => {
        var path = 'Repeat?state='+ args.repeat;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    this.homey.flow.getActionCard('shuffle')
      .registerRunListener(async (args) => {
        var path = 'Shuffle?state='+ args.shuffle;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    this.homey.flow.getActionCard('changeinput')
      .registerRunListener(async (args) => {
        var path = 'Play?url='+ args.inputs.url +'&image='+ args.inputs.inputimage +'';
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })
      .getArgument('inputs')
      .registerAutocompleteListener(async (query, args) => {
        return this.util.getInputs(args.device.getSetting('address'), args.device.getSetting('port'));
      })

    this.homey.flow.getActionCard('switchinput')
      .registerRunListener(async (args) => {
        if (args.direction == 'down') {
          this.util.sendCommand('ExternalSource?id=-', args.device.getSetting('address'), args.device.getSetting('port'))
            .then(result => {
              return Promise.resolve(true);
            })
            .catch(error => {
              return Promise.resolve(false);
            })
        } else if (args.direction == 'up') {
          return this.util.sendCommand('ExternalSource?id=%2B', args.device.getSetting('address'), args.device.getSetting('port'))
        }
      })

    this.homey.flow.getActionCard('changeservice')
      .registerRunListener(async (args) => {
        var path = 'Genres?service='+ args.services.name +'';
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })
      .getArgument('services')
      .registerAutocompleteListener(async (query, args) => {
        return this.util.getServices(args.device.getSetting('address'), args.device.getSetting('port'));
      })

    this.homey.flow.getActionCard('playpreset')
      .registerRunListener(async (args) => {
        var path = 'Preset?id='+ args.preset;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    this.homey.flow.getActionCard('addslave')
      .registerRunListener(async (args) => {
        var groupname = encodeURI(args.group);
        var path = 'AddSlave?slave='+ args.ip +'&amp;group='+ groupname;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    this.homey.flow.getActionCard('removeslave')
      .registerRunListener(async (args) => {
        var path = 'RemoveSlave?slave='+ args.ip;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    this.homey.flow.getActionCard('setRelativeVolume')
      .registerRunListener(async (args) => {
        var current_volume = args.device.getCapabilityValue('volume_set');
        if (args.volume >= 0) {
          var new_volume = current_volume + (current_volume * args.volume);
        } else {
          var new_volume = (current_volume * args.volume) + current_volume;
        }
        if (new_volume > 0 ) {
          args.device.setStoreValue('mutevol', new_volume);
        }
        var calculated_volume = new_volume * 100;
        var path = 'Volume?level='+ calculated_volume;
        return this.util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    this.homey.flow.getActionCard('sendcommand')
      .registerRunListener(async (args) => {
        return this.util.sendCommand(args.command, args.device.getSetting('address'), args.device.getSetting('port'))
      })
  }
}

module.exports = BluesoundApp;
