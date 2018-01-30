# Bluesound for Homey
Use Homey to control your [Bluesound](http://www.bluesound.com) devices.

**Supported Cards**
- [TRIGGER] Started playing (tags for artist, track and album if available)
- [TRIGGER] Playing artist changed (tags for artist, track and album if available)
- [TRIGGER] Playing track changed (tags for artist, track and album if available)
- [TRIGGER] Stopped playing
- [CONDITION] is/is not playing
- [CONDITION] is shuffled
- [ACTION] All default action cards for speaker capability like play, stop, pause and change volume
- [ACTION] Change input
- [ACTION] Play preset
- [ACTION] Shuffle on/off
- [ACTION] Repeat on/track/off

## Instructions
Add the device as you would add any device to Homey. Enter the IP address of the device (can be found in your router or the settings of the device itself), the port it listens to (default is 11000) and the polling frequency. The polling frequency is used to update the status of the device in Homey (like what is currently playing) based on the actual status of the device. To avoid excessive network traffic the minimum and default is set to 4 seconds.

## Support topic
For support please use the official support topic on the forum [here](https://forum.athom.com/discussion/4559/).

## Changelog
### 2018-01-30 - v1.0.1
- FIX: added missing node modules
- FIX: translation issues
- FIX: remove mock data
- FIX: tag for track on start playing trigger card
- FIX: changed track trigger card

### 2018-01-23 - v1.0.0
- NEW: initial version
