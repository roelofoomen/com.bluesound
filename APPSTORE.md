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
- [ACTION] Change service
- [ACTION] Play preset
- [ACTION] Shuffle on/off
- [ACTION] Repeat on/track/off

## Instructions
Add the device as you would add any device to Homey. Enter the IP address of the device (can be found in your router or the settings of the device itself), the port it listens to (default is 11000) and the polling frequency. The polling frequency is used to update the status of the device in Homey (like what is currently playing) based on the actual status of the device. To avoid excessive network traffic the minimum and default is set to 4 seconds.

## Support topic
For support please use the official support topic on the forum [here](https://forum.athom.com/discussion/4559/).

## Changelog
### 2018-02-11 - v1.1.0
- FIX: small decimal fix when setting volume
- FIX: unmute action cards fixed
- FIX: start playing trigger card fixed
- FIX: hopefully fix the previous action card (send command twice to actually go back a track instead of jump to start of current track)
- UPDATE: added extra checks to prevent artist, track and album tags being updated in unwanted scenarios
- UPDATE: added a change service action card

### 2018-02-06 - v1.0.2
- FIX: mute / unmute action cards fixed

### 2018-01-30 - v1.0.1
- FIX: added missing node modules
- FIX: translation issues
- FIX: remove mock data
- FIX: tag for track on start playing trigger card
- FIX: changed track trigger card
- POSSIBLE FIX: for track being unavailable when streaming (there is no name tag and it needs deduction from title tags)

### 2018-01-23 - v1.0.0
- NEW: initial version
