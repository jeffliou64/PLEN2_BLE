var fs = require('fs');
var noble = require('noble');
var buffer = require('Buffer');
var prompt = require('prompt');

function Device () {
    this.BtCharacteristic = null;
    this.TxCharacteristic = null;
    this.RxCharacteristic = null;
    this.RSSI = null;

    this.isReady = function() {
        return  this.BtCharacteristic != null &&
                this.RxCharacteristic != null &&
                this.TxCharacteristic != null;
    }
}

var _device = new Device();
var ServiceUUID = 'E1F40469CFE143C1838DDDBC9DAFDDE6';
var UARTServiceUUID = 'E1F40469CFE143C1838DDDBC9DAFDDE6';
var BtUUID = 'CF70EE7F2A264F62931F9087AB12552C';
var RxUUID = '2ED17A59FC21488E9204503EB78158D7';
var TxUUID = 'F90E9CFE7E0544A59D75F13644D6F645';

// callback function, logs data
// @param {data}: the data to be logged
// @param {isNotification}: no clue
function notificationCallback(data, isNotification) {
    console.log('data: ' + data);
    var stringData = data.toString('hex');
    console.log('data stringValue: ' + stringData);
}

// function to run after connection has successfully completed
// sets read characteristic to both read and notify
// sends to write function to write commands
// @param {none}
function performTests() {
    console.log('ready to run with device');

    _device.RxCharacteristic.on('read', notificationCallback);
    _device.RxCharacteristic.notify(true, function(error){});

    console.log('ready');

    // writeToPLEN("$pm15");
    updateRSSI();
}

function updateRSSI() {
    peripherial.once('rssiUpdate', callback(rssi));
}

// setup the callback for discover peripherials:
noble.on('discover', function (peripheral) {
    console.log('Discovered Peripheral : ' + peripheral.uuid + ' RSSI:' + peripheral.rssi);
    peripheral.connect(function (error) {
        if (error == undefined) {
            console.log(peripheral.uuid + ' RSSI:' + peripheral.rssi);
        } else {
            console.log(peripheral.uuid + ' RSSI:' + peripheral.rssi + ' Connecting, Error : ' + error);
        }
    });
    peripheral.updateRssi(function (error, rssi) {
        console.log(peripheral.uuid + ' RSSI:' + peripheral.rssi + ' update RSSI + ' + rssi + ' : Error :' + error);
    });

    peripheral.on('connect', function () {
        console.log(peripheral.uuid + ' RSSI:' + peripheral.rssi + ' Has conected');
    });
    peripheral.on('rssiUpdate', function (rssi) {
        console.log(peripheral.uuid + ' RSSI updated : ' + rssi);

    });

});


// setup the handler for stateChange:
noble.on('stateChange', function(state){
    console.log('state changed with value: ' + state);
    if (state == 'poweredOn') {
        console.log('start scanning!');
        noble.startScanning([ServiceUUID]);
    } else {
        noble.stopScanning();
    }
})

console.log('Ready to GO!');


