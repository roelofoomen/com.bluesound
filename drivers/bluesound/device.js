'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class BluesoundDevice extends Homey.Device {

    onInit() {
        var interval = this.getSetting('polling') || 4;
        this.pollDevice(interval);
    }

    onAdded() {
        var interval = this.getSetting('polling') || 5;
        this.pollDevice(interval);
    }

    onDeleted() {
        clearInterval(this.pollingInterval);
    }

    // HELPER FUNCTIONS
    pollDevice(interval) {
        clearInterval(this.pollingInterval);
        clearInterval(this.pingInterval);

        this.pollingInterval = setInterval(() => {
            util.getBluesound(this.getSetting('address'), this.getSetting('port'), this.getSetting('username'), this.getSetting('password'))
                .then(result => {
                    if (this.getCapabilityValue('measure_battery') != result.battery) {
                        this.setCapabilityValue('measure_battery', result.battery);
                    }
                    if (this.getCapabilityValue('alarm_motion') != result.motionalarm) {
                        this.setCapabilityValue('alarm_motion', result.motionalarm);
                    }
                    if (this.getCapabilityValue('alarm_generic') != result.soundalarm) {
                        this.setCapabilityValue('alarm_generic', result.soundalarm);
                    }
                    if (this.getCapabilityValue('measure_luminance') != result.lux) {
                        this.setCapabilityValue('measure_luminance', result.lux);
                    }
                })
                .catch(error => {
                    this.setUnavailable(Homey.__('Unreachable'));
                    this.pingDevice();
                })
        }, 1000 * interval);
    }

    pingDevice() {
        clearInterval(this.pollingInterval);
        clearInterval(this.pingInterval);

        this.pingInterval = setInterval(() => {
            util.getIpwebcam(this.getSetting('address'), this.getSetting('port'), this.getSetting('username'), this.getSetting('password'))
                .then(result => {
                    this.setAvailable();
                    var interval = this.getSetting('polling') || 5;
                    this.pollDevice(interval);

                })
                .catch(error => {
                    this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
                })
        }, 63000);
    }

}

module.exports = BluesoundDevice;
