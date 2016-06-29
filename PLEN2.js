var fs = require('fs');
var noble = require('noble');
var buffer = require('Buffer');
var prompt = require('prompt');

function Device () {
    this.BtCharacteristic = null;
    this.TxCharacteristic = null;
    this.RxCharacteristic = null;

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
    listCommands();
    givePlenCommands();
}

// The function to prompt the user to give commands
// takes result and sends to writeToPLEN to write to robot
// @param {none}
function givePlenCommands() {
    var commandToWrite;
    prompt.start();
    prompt.get('command', function (err, result) {
        console.log('command recieved: ' + result.command);

	    var rawdata = fs.readFileSync('./commands.json', 'utf8');
	    var parsedData = JSON.parse(rawdata);
        var parsedLength = parsedData.length;
	    parsedData.forEach(function (index) {
	        console.log('checking ' + index);
	        if (index.name.toUpperCase() === result.command.toUpperCase()) {
                commandToWrite = index.id;
                console.log(index.id);
            }
        })
        writeToPLEN(commandToWrite);
    });
}

//lists pre-made commmands for user to read from
//@param {none}
function listCommands() {
    var data = fs.readFileSync('./commands.json', 'utf8');
    return console.log(data);
}

//  The function to encode from character to ascii, and write to the robot's write characteristic
//  @param {command}: the command to be encoded and written
function writeToPLEN(command) {
    var command_length = command.length;
    console.log('Hello');
	var ascii_command = [];
	for (index = 0; index < command_length ; index ++){
	    ascii_command[index] = command.charCodeAt(index);
	}

    var buffer = new Buffer((ascii_command));
    _device.TxCharacteristic.write(buffer, true, function (error) {
        console.log("write error: "+ error)
    });
    givePlenCommands();
}

// setup the callback for discover peripherials:
noble.on('discover', function (peripherial) {
    
    console.log('Got device');
    if (peripherial.advertisement['localName'] != 'PLEND') {
        return;
    }
    console.log('Got device: PLEND');

    peripherial.connect(function(error){
        if (error) {
            console.log('connection error: ' + error);
            return;
        }

        console.log('start searching for services ...');
        peripherial.discoverServices([], function(error, services){

            console.log('discovered service count: ' + services.length)
            services.forEach(function(service){

                console.log('service with uuid: ' + service.uuid);
                if (service.uuid.toUpperCase() == UARTServiceUUID) {

                    console.log('start searching for characteristics ...');
                    service.discoverCharacteristics([], function(error, characteristics){

                        console.log('discovered characteristic count: ' + characteristics.length)
                        characteristics.forEach(function(characteristic) {
                            switch (characteristic.uuid.toUpperCase()) {
                                case BtUUID:
                                    console.log('Got characteristic: BT Addr');
                                    _device.BtCharacteristic = characteristic;
                                    break;
                                case RxUUID:
                                    console.log('Got characteristic: RX Data');
                                    _device.RxCharacteristic = characteristic;
                                    break;
                                case TxUUID:
                                    console.log('Got characteristic: TX Data');
                                    _device.TxCharacteristic = characteristic;
                                    break;
                                default:
                                    console.log('characteristic: ' + characteristic.uuid);
                            }
                        });

                        if (_device.isReady()) {
                            performTests();
                        }

                    })
                }
            })
        });
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


