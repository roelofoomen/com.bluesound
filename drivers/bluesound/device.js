'use strict';

const Homey = require('homey');
const fetch = require('node-fetch');
const fs = require('fs');
const Util = require('../../lib/util');

class BluesoundDevice extends Homey.Device {

  async onInit() {
    if (!this.util) this.util = new Util({ homey: this.homey });

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

    this.setAvailable();
    this.etag = null;
    this.pollDevice();

    // ** Listeners for updating capabilities
    this.registerCapabilityListener('speaker_playing', async (value) => {
      const command = value ? 'Play' : 'Pause';
      await this.util.sendCommand(command, this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('speaker_prev', async (value) => {
      // 'If a track is playing and has been playing for more than four seconds then back will return to the start of the track.'
      await this.util.sendCommand('Back', this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('speaker_next', async (value) => {
      await this.util.sendCommand('Skip', this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('volume_set', async (value) => {
      if (this.getStoreValue('volume') < 0) {
        // Volume -1 indicates fixed level: set capability to 100 %.
        this.setCapabilityValue('volume_set', 1);
        this.log('Volume not changed: player has a fixed volume level.');
        // TODO: Test: reject causes a red popup -> maybe use for volume adjustments when volume is fixed? Test if this causes crashes.
        // return Promise.reject(new Error('test'));
        // return Promise.resolve();
      } else {
        const path = `Volume?level=${(value * 100).toFixed()}`;
        await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
      }
    });

    this.registerCapabilityListener('volume_mute', async (value) => {
      const path = `Volume?mute=${+value}`;
      await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('speaker_shuffle', async (value) => {
      const path = `Shuffle?state=${+value}`;
      await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
    });

    this.registerCapabilityListener('speaker_repeat', async (value) => {
      let repvalue;
      // 0 means repeat play queue, 1 means repeat a track, and 2 means repeat off
      // enum: none, track, playlist
      switch (value) {
        case 'track':
          repvalue = 1;
          break;
        case 'playlist':
          repvalue = 0;
          break;
        case 'none':
        default:
          repvalue = 2;
      }
      const path = `Repeat?state=${repvalue}`;
      await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('port'));
    });

    // Album art
    this.image = await this.homey.images.createImage();
    // Use setStream() for album art, as SetUrl() requires https
    this.image.setStream(async (stream) => {
      if (this.getStoreValue('albumArtUrl')) {
        let res;
        this.log('Fetching album art image: ', this.getStoreValue('albumArtUrl'));
        try {
          res = await fetch(this.getStoreValue('albumArtUrl'));
        } catch (err) {}
        if (!res || !res.ok) {
          this.log('Fetching album art image failed.');
        } else {
          return res.body.pipe(stream);
        }
      }
      this.log('Streaming local default album art image.');
      const readStream = fs.createReadStream('./assets/images/logo.png');
      return readStream.pipe(stream);
    });
    this.setAlbumArtImage(this.image);
    this.image.update();
  }

  onDeleted() {
    clearImmediate(this.pollingImmediate);
    clearInterval(this.pingInterval);
  }

  // ** Helper functions
  pollDevice() {
    clearImmediate(this.pollingImmediate);
    clearInterval(this.pingInterval);

    const poll = async () => {
      try {
        this.log('Starting long-poll.');
        const result = await this.util.getBluesound(this.getSetting('address'), this.getSetting('port'), true, this.getSetting('longPolling'), this.etag);
        // Check results: when long-polling only if etag changed
        if ((this.etag !== result.etag)) {
          this.etag = result.etag;

          if (!this.getAvailable()) {
            this.setAvailable();
          }

          // Capability speaker_playing
          // 'play and stream should be considered to have the same meaning.'
          if ((result.state === 'play') || (result.state === 'stream')) {
            // playing
            if (!this.getCapabilityValue('speaker_playing')) {
              this.setCapabilityValue('speaker_playing', true);
              this.log('Playing started.');
              this.homey.flow.getDeviceTriggerCard('start_playing').trigger(this, { artist: result.artist, track: result.track, album: result.album }, {});
            }
          } else {
            // not playing
            // eslint-disable-next-line no-lonely-if
            if (this.getCapabilityValue('speaker_playing')) {
              this.setCapabilityValue('speaker_playing', false);
              this.log('Playing stopped or paused.');
              this.homey.flow.getDeviceTriggerCard('stop_playing').trigger(this, {}, {});
            }
          }

          // Other capabilities
          if (this.getCapabilityValue('volume_mute') !== !!result.mute) {
            this.setCapabilityValue('volume_mute', !!result.mute);
            this.log('Mute changed to:', !!result.mute);
          }
          if (this.getStoreValue('volume') !== result.volume) {
            this.setStoreValue('volume', result.volume);
            if (result.volume < 0) {
              // Volume -1 indicates fixed level: set capability to 100 %.
              this.setCapabilityValue('volume_set', 1);
              this.log('Volume changed to fixed level.');
            } else {
              this.setCapabilityValue('volume_set', result.volume / 100);
              this.log('Volume changed to:', result.volume);
            }
          }
          if (this.getCapabilityValue('speaker_shuffle') !== !!result.shuffle) {
            this.setCapabilityValue('speaker_shuffle', !!result.shuffle);
            this.log('Shuffle changed to:', !!result.shuffle);
          }
          if (this.getStoreValue('repeat') !== result.repeat) {
            this.setStoreValue('repeat', result.repeat);
            this.log('Repeat changed to:', result.repeat);
            switch (result.repeat) {
              case 1:
                this.setCapabilityValue('speaker_repeat', 'track');
                break;
              case 0:
                this.setCapabilityValue('speaker_repeat', 'playlist');
                break;
              case 2:
              default:
                this.setCapabilityValue('speaker_repeat', 'none');
            }
          }

          // Store values
          if (this.getStoreValue('muteVolume') !== result.muteVolume) {
            this.setStoreValue('muteVolume', result.muteVolume);
            this.log('MuteVolume changed to:', result.muteVolume);
          }
          if (this.getStoreValue('state') !== result.state) {
            this.setStoreValue('state', result.state);
            this.log('State changed to:', result.state);
          }
          if (this.getStoreValue('service') !== result.service) {
            this.setStoreValue('service', result.service);
            this.log('Service changed to:', result.service);
          }

          // Playing information
          if (this.getStoreValue('artist') !== result.artist && (result.state !== 'stop' || result.state !== 'pause')) {
            this.setStoreValue('artist', result.artist);
            this.log('Artist changed to:', result.artist);
            if (result.artist !== this.homey.__('util.not_available')) {
              this.homey.flow.getDeviceTriggerCard('artist_changed').trigger(this, { artist: result.artist, track: result.track, album: result.album }, {});
            }
            this.setCapabilityValue('speaker_artist', result.artist);
          }
          if (this.getStoreValue('track') !== result.track && (result.state !== 'stop' || result.state !== 'pause')) {
            this.setStoreValue('track', result.track);
            this.log('Track changed to:', result.track);
            if (result.track !== this.homey.__('util.not_available')) {
              this.homey.flow.getDeviceTriggerCard('track_changed').trigger(this, { artist: result.artist, track: result.track, album: result.album }, {});
            }
            this.setCapabilityValue('speaker_track', result.track);
          }
          if (this.getStoreValue('album') !== result.album && (result.state !== 'stop' || result.state !== 'pause')) {
            this.setStoreValue('album', result.album);
            this.log('Album changed to:', result.album);
            this.setCapabilityValue('speaker_album', result.album);
          }
          if (this.getStoreValue('image') !== result.image && (result.state !== 'stop' || result.state !== 'pause')) {
            this.setStoreValue('image', result.image);
            this.log('Image changed to:', result.image);
            // The image tag contains a (partial) url
            if (!result.streamUrl) {
              this.setStoreValue('albumArtUrl', `http://${this.getSetting('address')}:${this.getSetting('port')}${result.image}`);
            } else {
              this.setStoreValue('albumArtUrl', result.image);
            }
            this.image.update();
          }
          // Delay 1s: 'When long-polling is being used then a client must not make two consecutive requests for the same resource less than one second apart [..]'
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        // Restart long-polling
        this.pollingImmediate = setImmediate(poll.bind(this));
      } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable'));
        this.pingDevice();
      }
    };
    // Call polling function, which will set an immediate for itself to restart log-poll
    poll();
  }

  pingDevice() {
    clearImmediate(this.pollingImmediate);
    clearInterval(this.pingInterval);

    const ping = async () => {
      try {
        // Try getting data using short-polling
        this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        await this.util.getBluesound(this.getSetting('address'), this.getSetting('port'), false, 6, null);
        this.log('Device is back online, restarting polling.');
        this.setAvailable();
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay 1s
        this.pollDevice();
      } catch (error) {
      }
    };
    ping();
    this.pingInterval = setInterval(ping, 63000);
  }

}

module.exports = BluesoundDevice;
