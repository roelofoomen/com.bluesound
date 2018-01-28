const Homey = require('homey');
const xml2js = require("xml2js");

exports.getHomeyIp = function () {
    return new Promise(function (resolve, reject) {
        Homey.ManagerCloud.getLocalAddress()
            .then(localAddress => {
                return resolve(localAddress)
            })
            .catch(error => {
                throw new Error(error);
            })
    })
}

exports.sendCommand = function (command, address, port) {

    return new Promise(function (resolve, reject) {

        // TODO: remove mock data
        console.log(command);
        var data = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <SyncStatus icon="/images/players/C368_nt.png" volume="0" modelName="C368" name="C368 - 1745" model="C368" brand="NAD" etag="2" schemaVersion="21" syncStat="2" id="192.168.1.93:11000" mac="90:56:82:0E:17:45">
            <externalSource name="TV" id="1">
                <item id="1" name="TV"/>
                <item id="6" name="Platenspeler"/>
                <item id="8" name="Bluetooth"/>
                <item id="9" isBluos="true" name="BluOS"/>
            </externalSource>
        </SyncStatus>`;

        var parser = new xml2js.Parser();
        parser.parseString(data, function (error, result) {
            return resolve(result);
        });

    })

    /*return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/"+ command,
            resolveWithFullResponse: true,
            timeout: 4000
        };

        rp(options)
            .then(function (response) {
                if (response.statusCode == 200) {
                    var parser = new xml2js.Parser();
                    parser.parseString(response.body, function (error, result) {
                        return resolve(result);
                    });
                } else {
                    return reject(response.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })*/
}

exports.getBluesound = function (address, port) {
    return new Promise(function (resolve, reject) {

        // TODO: remove mock data
        var xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <status etag="3fc00adc2f15b58bf0a10a1313312959">
        <album>A Change of Heart</album>
        <artist>Testing</artist>
        <canMovePlayback>true</canMovePlayback>
        <canSeek>1</canSeek>
        <cursor>133</cursor>
        <fn>Tidal:74588359</fn>
        <image>/Artwork?service=Tidal&amp;songid=Tidal%3A74588359</image>
        <indexing>0</indexing>
        <mid>0</mid>
        <mode>1</mode>
        <name>Iets anders</name>
        <pid>91</pid>
        <prid>0</prid>
        <quality>cd</quality>
        <repeat>0</repeat>
        <service>Tidal</service>
        <shuffle>1</shuffle>
        <sid>4</sid>
        <sleep></sleep>
        <song>0</song>
        <state>play</state>
        <streamFormat>FLAC 44100/16/2</streamFormat>
        <syncStat>6</syncStat>
        <title1>A Change of Heart</title1>
        <title2>Ellen Andrea Wang</title2>
        <title3>A Change of Heart</title3>
        <totlen>262</totlen>
        <volume>10</volume>
        <secs>32</secs>
        </status>`;

        var parser = new xml2js.Parser();
        parser.parseString(xml, function (error, result) {
            if (result.status.hasOwnProperty("artist")) {
                var artist = result.status.artist[0];
            } else {
                var artist = 'Not available';
            }
            if (result.status.hasOwnProperty("name")) {
                var track = result.status.name[0];
            } else {
                var track = 'Not available';
            }
            if (result.status.hasOwnProperty("album")) {
                var album = result.status.album[0];
            } else {
                var album = 'Not available';
            }

            var data = {
                state: result.status.state[0],
                service: result.status.service[0],
                volume: Number(result.status.volume),
                shuffle: Number(result.status.shuffle),
                repeat: Number(result.status.repeat),
                artist: artist,
                track: track,
                album: album
            }

            return resolve(data);
        });

    })

    /*return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/Status",
            resolveWithFullResponse: true,
            timeout: 4000
        };

        rp(options)
            .then(function (response) {

                if (response.statusCode == 200) {
                    var parser = new xml2js.Parser();
                    parser.parseString(response.body, function (error, result) {
                        if (result.status.hasOwnProperty("artist")) {
                            var artist = result.status.artist[0];
                        } else {
                            var artist = 'Not available';
                        }
                        if (result.status.hasOwnProperty("name")) {
                            var track = result.status.name[0];
                        } else {
                            var track = 'Not available';
                        }
                        if (result.status.hasOwnProperty("album")) {
                            var album = result.status.album[0];
                        } else {
                            var album = 'Not available';
                        }

                        var data = {
                            state: result.status.state[0],
                            service: result.status.service[0],
                            volume: Number(result.status.volume),
                            shuffle: Number(result.status.shuffle),
                            repeat: Number(result.status.repeat),
                            artist: artist,
                            track: track,
                            album: album
                        }

                        return resolve(data);
                    });
                } else {
                    return reject(error.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })*/
}

exports.getInputs = function (address, port) {
    return new Promise(function (resolve, reject) {

        // TODO: remove mock data
        var xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <radiotime service="Capture">
        <item text="Radio Paradise" URL="RadioParadise%3Ahttp%3A%2F%2Fstream-tx3.radioparadise.com%2Faac-320" image="/Sources/images/ParadiseRadioIcon.png" serviceType="CloudService" type="audio"/>
        <item text="Spotify" URL="Spotify%3Aspotify%3Aplay" image="/Sources/images/SpotifyIcon.png" serviceType="CloudService" type="audio"/>
        <item text="Bluetooth" URL="Capture%3Abluez%3Abluetooth" image="/images/BluetoothIcon.png" type="audio"/>
        </radiotime>`;

        var parser = new xml2js.Parser();
        parser.parseString(xml, function (error, result) {
            var items = result.radiotime.item;

            var list = [];
            if (items.length > 0) {
                items.forEach(function(item) {
                    list.push({
                        icon: '/app/com.bluesound/assets/icon.svg',
                        name: item.$.text,
                        url: item.$.URL,
                        inputimage: item.$.image
                    })
                });
            }
            return resolve(list);
        });

    })

    /*return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/RadioBrowse?service=Capture",
            resolveWithFullResponse: true,
            timeout: 4000
        };

        rp(options)
            .then(function (response) {

                if (response.statusCode == 200) {
                    var parser = new xml2js.Parser();
                    parser.parseString(response.body, function (error, result) {
                        var items = result.radiotime.item;
                        var list = [];
                        if (items.length > 0) {
                            items.forEach(function(item) {
                                list.push({
                                    icon: '/app/com.bluesound/assets/icon.svg',
                                    name: item.$.text,
                                    url: item.$.URL,
                                    inputimage: item.$.image
                                })
                            });
                        }
                        return resolve(list);
                    });
                } else {
                    return reject(error.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })*/
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}
