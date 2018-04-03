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
                if (args.device.getStoreValue('state') == "play") {
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
                util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(result);
                    })
                    .catch(error => {
                        return Promise.reject(error);
                    })
            })

        new Homey.FlowCardAction('shuffle')
            .register()
            .registerRunListener((args, state) => {
                var path = 'Shuffle?state='+ args.shuffle;
                util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(result);
                    })
                    .catch(error => {
                        return Promise.reject(error);
                    })
            })

        new Homey.FlowCardAction('changeinput')
            .register()
            .registerRunListener((args, state) => {
                var path = 'Play?url='+ args.inputs.url +'&image='+ args.inputs.inputimage +'';
                util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(true);
                    })
                    .catch(error => {
                        return Promise.resolve(false);
                    })
            })
            .getArgument('inputs')
            .registerAutocompleteListener((query, args) => {
                return util.getInputs(args.device.getSetting('address'), args.device.getSetting('port'));
            })

        new Homey.FlowCardAction('changeservice')
            .register()
            .registerRunListener((args, state) => {
                var path = 'Genres?service='+ args.services.name +'';
                util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(true);
                    })
                    .catch(error => {
                        return Promise.resolve(false);
                    })
            })
            .getArgument('services')
            .registerAutocompleteListener((query, args) => {
                return util.getServices(args.device.getSetting('address'), args.device.getSetting('port'));
            })

        new Homey.FlowCardAction('playpreset')
            .register()
            .registerRunListener((args, state) => {
                var path = 'Preset?id='+ args.preset;
                util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(result);
                    })
                    .catch(error => {
                        return Promise.reject(error);
                    })
            })

        new Homey.FlowCardAction('addslave')
            .register()
            .registerRunListener((args, state) => {
                var groupname = encodeURI(args.group);
                var path = 'AddSlave?slave='+ args.ip +'&amp;group='+ groupname;
                util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(result);
                    })
                    .catch(error => {
                        return Promise.reject(error);
                    })
            })

        new Homey.FlowCardAction('removeslave')
            .register()
            .registerRunListener((args, state) => {
                var path = 'RemoveSlave?slave='+ args.ip;
                util.sendCommand(path, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(result);
                    })
                    .catch(error => {
                        return Promise.reject(error);
                    })
            })

        new Homey.FlowCardAction('sendcommand')
            .register()
            .registerRunListener((args, state) => {
                util.sendCommand(args.command, args.device.getSetting('address'), args.device.getSetting('port'))
                    .then(result => {
                        return Promise.resolve(result);
                    })
                    .catch(error => {
                        return Promise.reject(error);
                    })
            })
    }
}

module.exports = BluesoundApp;
