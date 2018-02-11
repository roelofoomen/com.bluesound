'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class BluesoundDevice extends Homey.Device {

    onInit() {
        this.registerCapabilityListener('speaker_playing', this.onCapabilitySpeakerPlaying.bind(this));
        this.registerCapabilityListener('speaker_prev', this.onCapabilitySpeakerPrev.bind(this));
        this.registerCapabilityListener('speaker_next', this.onCapabilitySpeakerNext.bind(this));
        this.registerCapabilityListener('volume_set', this.onCapabilityVolumeSet.bind(this));
        this.registerCapabilityListener('volume_mute', this.onCapabilityVolumeMute.bind(this));

        var interval = this.getSetting('polling') || 4;
        this.pollDevice(interval);
    }

    onDeleted() {
        clearInterval(this.pollingInterval);
    }

    // LISTENERS FOR UPDATING CAPABILITIES
    onCapabilitySpeakerPlaying(value, opts, callback) {
        if (value) {
            util.sendCommand('Play', this.getSetting('address'), this.getSetting('port'));
        } else {
            util.sendCommand('Pause', this.getSetting('address'), this.getSetting('port'));
        }
        callback(null, value);
    }

    onCapabilitySpeakerPrev(value, opts, callback) {
        util.sendCommand('Back', this.getSetting('address'), this.getSetting('port'))
            .then(result => {
                // send command twice because first command jumps to start of current track
                util.sendCommand('Back', this.getSetting('address'), this.getSetting('port'));
            })
            .catch(error => {
                callback(error, null);
            })
        callback(null, value);
    }

    onCapabilitySpeakerNext(value, opts, callback) {
        util.sendCommand('Skip', this.getSetting('address'), this.getSetting('port'));
        callback(null, value);
    }

    onCapabilityVolumeSet(value, opts, callback) {
        var volume = value.toFixed(2) * 100;
        var path = 'Volume?level='+ volume;
        util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
        callback(null, value);
    }

    onCapabilityVolumeMute(value, opts, callback) {
        if (value) {
            var path = 'Volume?level=0';
            this.setStoreValue('mutevol', this.getCapabilityValue('volume_set'));
        } else {
            var volume = this.setStoreValue('mutevol') * 100;
            var path = 'Volume?level='+ volume;
        }
        util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
        callback(null, value);
    }

    // HELPER FUNCTIONS
    pollDevice(interval) {
        clearInterval(this.pollingInterval);
        clearInterval(this.pingInterval);

        this.pollingInterval = setInterval(() => {
            util.getBluesound(this.getSetting('address'), this.getSetting('port'))
                .then(result => {

                    // capability speaker_playing
                    if ((result.state == "play" || result.state == "stream") && !this.getCapabilityValue('onoff')) {
                        this.setCapabilityValue('speaker_playing', true);
                    } else {
                        if (this.getCapabilityValue('speaker_playing')) {
                            this.setCapabilityValue('speaker_playing', false);
                        }
                    }

                    // capability volume_set and volume_mute
                    var volume = result.volume / 100;
                    this.setStoreValue('mutevol', volume);
                    if (this.getCapabilityValue('volume_set') != volume) {
                        this.setCapabilityValue('volume_set', volume);
                    }
                    if (volume === 0) {
                        if (this.getCapabilityValue('volume_mute') === false) {
                            this.setCapabilityValue('volume_mute', true);
                        }
                    } else {
                        if (this.getCapabilityValue('volume_mute') === true) {
                            this.setCapabilityValue('volume_mute', false);
                        }
                    }

                    // stores values
                    if (this.getStoreValue('state') != result.state) {
                        this.setStoreValue('state', result.state);
                        if(this.getStoreValue('state') !== "stop") {
                            Homey.ManagerFlow.getCard('trigger', 'stop_playing').trigger(this, {}, {})
                        } else {
                            Homey.ManagerFlow.getCard('trigger', 'start_playing').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
                        }
                    }
                    if (this.getStoreValue('service') != result.service) {
                        this.setStoreValue('service', result.service);
                    }
                    if (this.getStoreValue('shuffle') != result.shuffle) {
                        this.setStoreValue('shuffle', result.shuffle);
                    }
                    if (this.getStoreValue('repeat') != result.repeat) {
                        this.setStoreValue('repeat', result.repeat);
                    }
                    if (this.getStoreValue('artist') != result.artist && (result.state !== 'stop' || result.state !== 'pause')) {
                        this.setStoreValue('artist', result.artist);
                        if (result.artist !== 'Not available') {
                            Homey.ManagerFlow.getCard('trigger', 'artist_changed').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
                        }
                    }
                    if (this.getStoreValue('track') != result.track && (result.state !== 'stop' || result.state !== 'pause')) {
                        this.setStoreValue('track', result.track);
                        if (result.track !== 'Not available') {
                            Homey.ManagerFlow.getCard('trigger', 'track_changed').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
                        }
                    }
                    if (this.getStoreValue('album') != result.album && (result.state !== 'stop' || result.state !== 'pause')) {
                        this.setStoreValue('album', result.album);
                    }
                })
                .catch(error => {
                    this.log(error);
                    this.setUnavailable(Homey.__('Unreachable'));
                    this.pingDevice();
                })
        }, 1000 * interval);
    }

    pingDevice() {
        clearInterval(this.pollingInterval);
        clearInterval(this.pingInterval);

        this.pingInterval = setInterval(() => {
            util.getBluesound(this.getSetting('address'), this.getSetting('port'))
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
