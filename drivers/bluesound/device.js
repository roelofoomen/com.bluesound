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
    // Use setStream(), as SetUrl() requires https
    this.image.setStream(async (stream) => {
      let result;
      try {
        this.log('Fetching album art image: ', this.getStoreValue('albumArtUrl'));
        const res = await fetch(this.getStoreValue('albumArtUrl'));
        if (!res.ok) {
          throw Error(`${res.status} - ${res.statusText}`);
        }
        if (!res.headers.get('content-type').startsWith('image')) {
          throw Error(`Wrong content-type: ${res.headers.get('content-type')}`);
        }
        result = res.body.pipe(stream);
      } catch (error) {
        this.log('Fetching album art image failed, error:', error.message);
        this.log('Streaming local default album art image.');
        const readStream = fs.createReadStream('./assets/images/logo.png');
        result = readStream.pipe(stream);
      }
      return result;
    });
    this.setAlbumArtImage(this.image).catch(this.error);
    this.image.update().catch(this.error);

    this.setAvailable().catch(this.error);
    this.etag = null; // Reset before first poll
    this.pollDevice();
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
            await this.setAvailable();
          }

          // Capability speaker_playing
          // 'play and stream should be considered to have the same meaning.'
          if ((result.state === 'play') || (result.state === 'stream')) {
            // playing
            if (!this.getCapabilityValue('speaker_playing')) {
              await this.setCapabilityValue('speaker_playing', true);
              this.log('Playing started.');
              await this.homey.flow.getDeviceTriggerCard('start_playing').trigger(this, { artist: result.artist, track: result.track, album: result.album }, {});
            }
          } else {
            // not playing
            // eslint-disable-next-line no-lonely-if
            if (this.getCapabilityValue('speaker_playing')) {
              await this.setCapabilityValue('speaker_playing', false);
              this.log('Playing stopped or paused.');
              await this.homey.flow.getDeviceTriggerCard('stop_playing').trigger(this, {}, {});
            }
          }

          // Other capabilities
          if (this.getCapabilityValue('volume_mute') !== !!result.mute) {
            await this.setCapabilityValue('volume_mute', !!result.mute);
            this.log('Mute changed to:', !!result.mute);
          }
          if (this.getStoreValue('volume') !== result.volume) {
            await this.setStoreValue('volume', result.volume);
            if (result.volume < 0) {
              // Volume -1 indicates fixed level: set capability to 100 %.
              await this.setCapabilityValue('volume_set', 1);
              this.log('Volume changed to fixed level.');
            } else {
              await this.setCapabilityValue('volume_set', result.volume / 100);
              this.log('Volume changed to:', result.volume);
            }
          }
          if (this.getCapabilityValue('speaker_shuffle') !== !!result.shuffle) {
            await this.setCapabilityValue('speaker_shuffle', !!result.shuffle);
            this.log('Shuffle changed to:', !!result.shuffle);
          }
          if (this.getStoreValue('repeat') !== result.repeat) {
            await this.setStoreValue('repeat', result.repeat);
            this.log('Repeat changed to:', result.repeat);
            switch (result.repeat) {
              case 1:
                await this.setCapabilityValue('speaker_repeat', 'track');
                break;
              case 0:
                await this.setCapabilityValue('speaker_repeat', 'playlist');
                break;
              case 2:
              default:
                await this.setCapabilityValue('speaker_repeat', 'none');
            }
          }

          // Store values
          if (this.getStoreValue('muteVolume') !== result.muteVolume) {
            await this.setStoreValue('muteVolume', result.muteVolume);
            this.log('MuteVolume changed to:', result.muteVolume);
          }
          if (this.getStoreValue('state') !== result.state) {
            await this.setStoreValue('state', result.state);
            this.log('State changed to:', result.state);
          }
          if (this.getStoreValue('service') !== result.service) {
            await this.setStoreValue('service', result.service);
            this.log('Service changed to:', result.service);
          }

          // Playing information
          if (this.getStoreValue('artist') !== result.artist && (result.state !== 'stop' || result.state !== 'pause')) {
            await this.setStoreValue('artist', result.artist);
            this.log('Artist changed to:', result.artist);
            if (result.artist !== this.homey.__('util.not_available')) {
              await this.homey.flow.getDeviceTriggerCard('artist_changed').trigger(this, { artist: result.artist, track: result.track, album: result.album }, {});
            }
            await this.setCapabilityValue('speaker_artist', result.artist);
          }
          if (this.getStoreValue('track') !== result.track && (result.state !== 'stop' || result.state !== 'pause')) {
            await this.setStoreValue('track', result.track);
            this.log('Track changed to:', result.track);
            if (result.track !== this.homey.__('util.not_available')) {
              await this.homey.flow.getDeviceTriggerCard('track_changed').trigger(this, { artist: result.artist, track: result.track, album: result.album }, {});
            }
            await this.setCapabilityValue('speaker_track', result.track);
          }
          if (this.getStoreValue('album') !== result.album && (result.state !== 'stop' || result.state !== 'pause')) {
            await this.setStoreValue('album', result.album);
            this.log('Album changed to:', result.album);
            await this.setCapabilityValue('speaker_album', result.album);
          }
          if (this.getStoreValue('image') !== result.image && (result.state !== 'stop' || result.state !== 'pause')) {
            await this.setStoreValue('image', result.image);
            this.log('Image changed to:', result.image);
            // The image tag contains a (partial) url
            if (result.image.startsWith('http')) {
              await this.setStoreValue('albumArtUrl', result.image);
            } else {
              await this.setStoreValue('albumArtUrl', `http://${this.getSetting('address')}:${this.getSetting('port')}${result.image}`);
            }
            this.image.update().catch(this.error);
          }
          // Delay 1s: 'When long-polling is being used then a client must not make two consecutive requests for the same resource less than one second apart [..]'
          await new Promise((resolve) => this.homey.setTimeout(resolve, 1000));
        }
        // Restart long-polling
        this.pollingImmediate = setImmediate(poll.bind(this));
      } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable')).catch(this.error);
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
        await this.setAvailable();
        await new Promise((resolve) => this.homey.setTimeout(resolve, 1000)); // Delay 1s
        this.pollDevice();
      } catch (error) {
      }
    };
    ping();
    this.pingInterval = this.homey.setInterval(ping, 63000);
  }

}

module.exports = BluesoundDevice;
