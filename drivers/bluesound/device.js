'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const fetch = require("node-fetch");
const path = require('node:path');
const fs = require('fs');

class BluesoundDevice extends Homey.Device {

  async onInit() {
    if (!this.util) this.util = new Util({homey: this.homey });

    // Update capabilities of older versions
    if (this.hasCapability('speaker_artist') === false) {
      await this.addCapability('speaker_artist');
    }
    if (this.hasCapability('speaker_album') === false) {
      await this.addCapability('speaker_album');
    }
    if (this.hasCapability('speaker_track') === false) {
      await this.addCapability('speaker_track');
    }
    if (this.hasCapability('speaker_shuffle') === false) {
      await this.addCapability('speaker_shuffle');
    }
    if (this.hasCapability('speaker_repeat') === false) {
      await this.addCapability('speaker_repeat');
    }

    //TODO:
    // Shuffle and repeat have no meaning for streams (see doc): disable

    this.setAvailable();
    this.pollDevice();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('speaker_playing', async (value) => {
      const command = value ? 'Play' : 'Pause';
      return await this.util.sendCommand(command, this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('speaker_prev', async (value) => {
      try {
        // Send command twice because first command jumps to start of current track
        await this.util.sendCommand('Back', this.getSetting('address'), this.getSetting('port'));
        await this.util.sendCommand('Back', this.getSetting('address'), this.getSetting('port'));
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    });

    this.registerCapabilityListener('speaker_next', async (value) => {
      return await this.util.sendCommand('Skip', this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('volume_set', async (value) => {
      this.setStoreValue('mutevol', value.toFixed(2));
      const volume = value.toFixed(2) * 100;
      const path = 'Volume?level='+ volume;
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('volume_mute', async (value) => {
      if (value) {
        const path = 'Volume?level=0';
        return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
      } else {
        return await this.setCapabilityValue('volume_set', this.getStoreValue('mutevol'));
      }
    });

    this.registerCapabilityListener('speaker_shuffle', async (value) => {
      return await this.util.sendCommand('Shuffle', this.getSetting('address'), this.getSetting('port'), +value);
    });

    this.registerCapabilityListener('speaker_repeat', async (value) => {
      // 0 means repeat play queue, 1 means repeat a track, and 2 means repeat off
      // enum: none, track, playlist
      switch(value) {
        case 'track':
          var repvalue = 1;
          break;
        case 'playlist':
          var repvalue = 0;
          break;
        case 'none':    
        default:
          var repvalue = 2;
      }
      return await this.util.sendCommand('Repeat', this.getSetting('address'), this.getSetting('port'), +repvalue);
    });

    this.image = await this.homey.images.createImage();
    // Use setStream() for album art, as SetUrl() requires https
    this.image.setStream(async (stream) => {
      if (this.albumArtUrl) {
        this.log("Fetching album art image: ", this.albumArtUrl);
        const res = await fetch(this.albumArtUrl);
        if (res.ok) {
          return res.body.pipe(stream);
        }
        this.log("Fetching image failed.");
      }
      // Stream local default image if album art unavailable
      const readStream = fs.createReadStream("./assets/images/logo.png");
      return readStream.pipe(stream);
    });
    await this.image.update();
    this.setAlbumArtImage(this.image);
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let result = await this.util.getBluesound(this.getSetting('address'), this.getSetting('port'));

        if (!this.getAvailable()) {
          this.setAvailable();
        }

        // capability speaker_playing
        if ((result.state == 'play') || (result.state == 'stream')) {
          // playing
          if (!this.getCapabilityValue('speaker_playing')) {
            this.setCapabilityValue('speaker_playing', true);
            this.log('Playing started.');
            this.homey.flow.getDeviceTriggerCard('start_playing').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {});
          }
        } else {
          // not playing
          if (this.getCapabilityValue('speaker_playing')) {
            this.setCapabilityValue('speaker_playing', false);
            this.log('Playing stopped or paused.');
            this.homey.flow.getDeviceTriggerCard('stop_playing').trigger(this, {}, {});
          }
        }

        // capability volume_set and volume_mute
        var volume = result.volume / 100;
        if (this.getCapabilityValue('volume_set') != volume) {
          this.setCapabilityValue('volume_set', volume);
          this.log('Volume changed to:', volume);
        }
        if (volume === 0 && this.getCapabilityValue('volume_mute') === false) {
          this.setCapabilityValue('volume_mute', true);
          this.log('Volume muted.');
        } else if (volume != 0 && this.getCapabilityValue('volume_mute') === true) {
          this.setCapabilityValue('volume_mute', false);
          this.log('Volume unmuted.');
        }

        // stores values
        if (this.getStoreValue('state') != result.state) {
          this.setStoreValue('state', result.state);
          this.log('State changed to:', result.state);
        }
        if (this.getStoreValue('service') != result.service) {
          this.setStoreValue('service', result.service);
          this.log('Service changed to:', result.service);
        }
        if (this.getStoreValue('shuffle') != result.shuffle) {
          this.setStoreValue('shuffle', result.shuffle);
          this.log('Shuffle changed to:', result.shuffle);
          this.setCapabilityValue('speaker_shuffle', !!result.shuffle);
        }
        if (this.getStoreValue('repeat') != result.repeat) {
          this.setStoreValue('repeat', result.repeat);
          this.log('Repeat changed to:', result.repeat);
          switch(result.repeat) {
            case 1:
              this.setCapabilityValue('speaker_repeat', 'track');
              break;
            case 0:
              this.setCapabilityValue('speaker_repeat', 'playlist');
              var repvalue = 0;
              break;
            case 2:
            default:
              this.setCapabilityValue('speaker_repeat', 'none');
          }
        }
        if (this.getStoreValue('artist') != result.artist && (result.state !== 'stop' || result.state !== 'pause')) {
          this.setStoreValue('artist', result.artist);
          this.log('Artist changed to:', result.artist);
          if (result.artist !== this.homey.__('util.not_available')) {
            this.homey.flow.getDeviceTriggerCard('artist_changed').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
          }
          this.setCapabilityValue('speaker_artist', result.artist);
        }
        if (this.getStoreValue('track') != result.track && (result.state !== 'stop' || result.state !== 'pause')) {
          this.setStoreValue('track', result.track);
          this.log('Track changed to:', result.track);
          if (result.track !== this.homey.__('util.not_available')) {
            this.homey.flow.getDeviceTriggerCard('track_changed').trigger(this, {artist: result.artist, track: result.track, album: result.album}, {})
          }
          this.setCapabilityValue('speaker_track', result.track);
        }
        if (this.getStoreValue('album') != result.album && (result.state !== 'stop' || result.state !== 'pause')) {
          this.setStoreValue('album', result.album);
          this.log('Album changed to:', result.album);
          this.setCapabilityValue('speaker_album', result.album);
        }
        if (this.getStoreValue('image') != result.image && (result.state !== 'stop' || result.state !== 'pause')) {
          this.setStoreValue('image', result.image);
          this.log('Image changed to:', result.image);
          // The image tag contains a link 
          this.albumArtUrl = 'http://'+ this.getSetting('address') +':'+ this.getSetting('port') + result.image;
          await this.image.update();
        }
      } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable'));
        this.pingDevice();
      }
    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(async () => {
      try {
        let result = await this.util.getBluesound(this.getSetting('address'), this.getSetting('port'));
        this.setAvailable();
        this.pollDevice();
      } catch (error) {
        this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
      }
    }, 63000);
  }

}

module.exports = BluesoundDevice;
