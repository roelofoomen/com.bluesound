"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class BluesoundApp extends Homey.App {

  onInit() {
    this.log('Initializing Bluesound app ...');

    // CONDITION CARDS
    new Homey.FlowCardCondition('playing')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getStoreValue('state') !== "pause") {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    new Homey.FlowCardCondition('shuffled')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getStoreValue('shuffle') == 1) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    // ACTION CARDS
    new Homey.FlowCardAction('repeat')
      .register()
      .registerRunListener((args, state) => {
        var path = 'Repeat?state='+ args.repeat;
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    new Homey.FlowCardAction('shuffle')
      .register()
      .registerRunListener((args, state) => {
        var path = 'Shuffle?state='+ args.shuffle;
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    new Homey.FlowCardAction('changeinput')
      .register()
      .registerRunListener((args, state) => {
        var path = 'Play?url='+ args.inputs.url +'&image='+ args.inputs.inputimage +'';
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })
      .getArgument('inputs')
      .registerAutocompleteListener((query, args) => {
        return util.getInputs(args.device.getSetting('address'), args.device.getSetting('port'));
      })

    new Homey.FlowCardAction('switchinput')
      .register()
      .registerRunListener((args, state) => {
        if (args.direction == 'down') {
          util.sendCommand('ExternalSource?id=-', args.device.getSetting('address'), args.device.getSetting('port'))
            .then(result => {
              return Promise.resolve(true);
            })
            .catch(error => {
              return Promise.resolve(false);
            })
        } else if (args.direction == 'up') {
          return util.sendCommand('ExternalSource?id=%2B', args.device.getSetting('address'), args.device.getSetting('port'))
        }
      })

    new Homey.FlowCardAction('changeservice')
      .register()
      .registerRunListener((args, state) => {
        var path = 'Genres?service='+ args.services.name +'';
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })
      .getArgument('services')
      .registerAutocompleteListener((query, args) => {
        return util.getServices(args.device.getSetting('address'), args.device.getSetting('port'));
      })

    new Homey.FlowCardAction('playpreset')
      .register()
      .registerRunListener((args, state) => {
        var path = 'Preset?id='+ args.preset;
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    new Homey.FlowCardAction('addslave')
      .register()
      .registerRunListener((args, state) => {
        var groupname = encodeURI(args.group);
        var path = 'AddSlave?slave='+ args.ip +'&amp;group='+ groupname;
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    new Homey.FlowCardAction('removeslave')
      .register()
      .registerRunListener((args, state) => {
        var path = 'RemoveSlave?slave='+ args.ip;
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    new Homey.FlowCardAction('setRelativeVolume')
      .register()
      .registerRunListener((args, state) => {
        console.log('Triggering relative volume card');
        var current_volume = args.device.getCapabilityValue('volume_set');
        console.log('current volume: ', current_volume);
        console.log('relative change: ', args.volume);
        if (args.volume >= 0) {
          var new_volume = current_volume + (current_volume * args.volume);
        } else {
          var new_volume = (current_volume * args.volume) + current_volume;
        }
        console.log('desired new volume: ', new_volume);
        //return args.device.setCapabilityValue('volume_set', new_volume);
        if (new_volume > 0 ) {
          args.device.setStoreValue('mutevol', new_volume);
        }
        var calculated_volume = new_volume * 100;
        var path = 'Volume?level='+ calculated_volume;
        return util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
      })

    new Homey.FlowCardAction('sendcommand')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand(args.command, args.device.getSetting('address'), args.device.getSetting('port'))
      })
  }
}

module.exports = BluesoundApp;
