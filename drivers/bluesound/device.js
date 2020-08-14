'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class BluesoundDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey });

    this.setAvailable();
    this.pollDevice();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('speaker_playing', async (value) => {
      if (value) {
        return this.util.sendCommand('Play', this.getSetting('address'), this.getSetting('port'));
      } else {
        return this.util.sendCommand('Pause', this.getSetting('address'), this.getSetting('port'));
      }
    });

    this.registerCapabilityListener('speaker_prev', async (value) => {
      this.util.sendCommand('Back', this.getSetting('address'), this.getSetting('port'))
        .then(result => {
          // send command twice because first command jumps to start of current track
          return this.util.sendCommand('Back', this.getSetting('address'), this.getSetting('port'));
        })
        .catch(error => {
          return Promise.reject(error);
        })
    });

    this.registerCapabilityListener('speaker_next', (value) => {
      return this.util.sendCommand('Skip', this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('volume_set', async (value) => {
      this.setStoreValue('mutevol', value.toFixed(2));
      var volume = value.toFixed(2) * 100;
      var path = 'Volume?level='+ volume;
      return this.util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('volume_mute', (value) => {
      if (value) {
        var path = 'Volume?level=0';
      } else {
        this.setCapabilityValue('volume_set', this.getStoreValue('mutevol'));
      }
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      this.util.getBluesound(this.getSetting('address'), this.getSetting('port'))
        .then(result => {

          // capability speaker_playing
          this.log('state is: ', result.state);
          this.log('capability speaker_playing is: ', this.getCapabilityValue('speaker_playing'));
          if (result.state != "pause" && !this.getCapabilityValue('speaker_playing')) {
            this.log('triggering (result.state != "pause" && !this.getCapabilityValue("speaker_playing"))');
            this.setCapabilityValue('speaker_playing', true);
          } else if (result.state == "pause" && this.getCapabilityValue('speaker_playing')) {
            this.log('triggering (result.state == "pause" && this.getCapabilityValue("speaker_playing"))');
            this.setCapabilityValue('speaker_playing', false);
          } else {
            this.log('none of the conditions met, no action is taken');
          }

          // capability volume_set and volume_mute
          var volume = result.volume / 100;
          if (this.getCapabilityValue('volume_set') != volume) {
            this.setCapabilityValue('volume_set', volume);
          }
          if (volume === 0 && this.getCapabilityValue('volume_mute') === false) {
            this.setCapabilityValue('volume_mute', true);
          } else if (volume != 0 && this.getCapabilityValue('volume_mute') === true) {
            this.setCapabilityValue('volume_mute', false);
          }

          // stores values
          if (this.getStoreValue('state') != result.state) {
            if(result.state == 'play') {
              this.homey.flow.getDeviceTriggerCard('start_playing').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
            } else {
              this.homey.flow.getDeviceTriggerCard('stop_playing').trigger(this, {}, {})
            }
            this.setStoreValue('state', result.state);
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
              this.homey.flow.getDeviceTriggerCard('artist_changed').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
            }
          }
          if (this.getStoreValue('track') != result.track && (result.state !== 'stop' || result.state !== 'pause')) {
            this.setStoreValue('track', result.track);
            if (result.track !== 'Not available') {
              this.homey.flow.getDeviceTriggerCard('track_changed').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
            }
          }
          if (this.getStoreValue('album') != result.album && (result.state !== 'stop' || result.state !== 'pause')) {
            this.setStoreValue('album', result.album);
          }
        })
        .catch(error => {
          this.log(error);
          this.setUnavailable(this.homey.__('device.unreachable'));
          this.pingDevice();
        })
    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      this.util.getBluesound(this.getSetting('address'), this.getSetting('port'))
        .then(result => {
          this.setAvailable();
          this.pollDevice();
        })
        .catch(error => {
          this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        })
    }, 63000);
  }

}

module.exports = BluesoundDevice;
