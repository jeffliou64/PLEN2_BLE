//  (1)  create more variables&properties (for clarity and accessibility)
//  (2)  log EVERYTHING POSSIBLE (all steps of the connection/write)
//  3)  separate functions for clarity (each function === 1 application/use)
//  4)  add comments for each function/key variables
//  5)  create error class/module, add errors for every function
var fs = require('fs');
var noble = require('noble');
var buffer = require('Buffer');
var prompt = require('prompt');

var Device = (function () {
    function Device(peripherial) {
        //peripherial
        this.peripherial = null;
        //this.successConnectedCallback = null;
        this.BtCharacteristic = null;
        this.TxCharacteristic = null;
        this.RxCharacteristic = null;

        this.name = undefined;
        this.paired = false;
        this.initialized = false;
        this.peripherial = peripherial;

        this.plen_commands = fs.readFileSync('./commands.json', 'utf8');
    };

    Device.prototype.isReady = function () {
        return this.BtCharacteristic != null &&
            this.RxCharacteristic != null &&
            this.TxCharacteristic != null;
    };

    // The initialization process after all required charateristics had been discover
    Device.prototype.initialize = function () {
        if (this.initialized) {
            console.log('already initialized');
            return;
        }
        // if (this.successConnectedCallback) {
        //     this.successConnectedCallback(this);
        // }
        this.initialized = true;
        console.log('device initialized');
        //this.RxCharacteristic.on('read', device.notificationCallback('hex', true));
        this.RxCharacteristic.notify(true, function (error) { });

        console.log('ready for commands');
        this.listPlenCommands();
        this.givePlenCommands();
    };

    Device.prototype.toString = function () {
        return "PLEN: " + this.name;
    };

    Device.prototype.notificationCallback = function (data, isNotification) {
        console.log('data: ' + data);
        var stringData = device.toString();
        console.log('data stringValue: ' + stringData);
    }

    Device.prototype.listPlenCommands = function () {
        //var data = fs.readFileSync('./commands.json', 'utf8');
        return console.log(this.plen_commands);
    }

    //  The function to prompt the user to give commands
    //  takes result and sends to writeToPLEN to write to robot
    Device.prototype.givePlenCommands = function () {
        var _this = this;
        var commandToWrite;
        //var loopStop = false;
        prompt.start();
        prompt.get('command', function (err, result) {
            if (err) {
                return console.log(err);
            }
            var device = _this;
            console.log('command recieved: ' + result.command);
            Device.prototype.parseData(device.plen_commands).forEach(function (index) {
                if (index.name.toUpperCase() === result.command.toUpperCase()) {
                    console.log('correct command code found');
                    commandToWrite = index.id;
                    //loopStop = true;
                }
            });
            device.writeToPLEN(commandToWrite);
        });
    };

    //  parses data from JSON files for analyzing by other functions (creates an array of objects)
    //  @param {dataToParse}: the JSON file to be parsed (already read with readfile)
    Device.prototype.parseData = function (dataToParse) {
        var parsedData = JSON.parse(dataToParse);
        return parsedData;
    };

    //  The function to encode from character to ascii, and write to the robot's write characteristic
    //  @param {command}: the command to be encoded and written
    Device.prototype.writeToPLEN = function (command) {
        var device = this;
        var command_length = command.length;
        console.log('ready to write');
        var ascii_command = [];
        for (index = 0; index < command_length; index++) {
            ascii_command[index] = command.charCodeAt(index);
        }

        var buffer = new Buffer(ascii_command);
        device.TxCharacteristic.write(buffer, true, function (error) {
            console.log("write error: " + error)
        });
        this.givePlenCommands();
    }


    //PLEN UUID's for pairing
    Device.Primary_service_UUID = '180A';
    Device.Device_Service_UUID = 'E1F40469CFE143C1838DDDBC9DAFDDE6';
    Device.UART_Service_UUID = 'E1F40469CFE143C1838DDDBC9DAFDDE6';
    Device.Bt_UUID = 'CF70EE7F2A264F62931F9087AB12552C';
    Device.Rx_UUID = '2ED17A59FC21488E9204503EB78158D7';
    Device.Tx_UUID = 'F90E9CFE7E0544A59D75F13644D6F645';


    // setup the callback for discover peripherials:
    noble.on('discover', function (peripherial) {
        console.log('Got device');
        if (peripherial.advertisement['localName'] != 'PLEND') {
            return;
        };
        var localName = peripherial.advertisement['localName'];
        console.log('Got device: ' + localName);
        var device = new Device(peripherial);
        device.name = localName;
        //device.successConnectedCallback = 'success';
        peripherial.connect(function (error) {
            if (error) {
                console.log('connection error: ' + error);
                return;
            }
            console.log('start searching for services ...');
            peripherial.discoverServices([], function (error, services) {
                console.log('discovered service count: ' + services.length);
                services.forEach(function (service) {
                    console.log('service with uuid: ' + service.uuid);
                    if (service.uuid.toUpperCase() == Device.UART_Service_UUID) {
                        console.log('start searching for characteristics ...');
                        service.discoverCharacteristics([], function (error, characteristics) {
                            console.log('discovered characteristic count: ' + characteristics.length);
                            characteristics.forEach(function (characteristic) {
                                switch (characteristic.uuid.toUpperCase()) {
                                    case Device.Bt_UUID:
                                        console.log('Got characteristic: BT Addr');
                                        device.BtCharacteristic = characteristic;
                                        break;
                                    case Device.Rx_UUID:
                                        console.log('Got characteristic: RX Data');
                                        device.RxCharacteristic = characteristic;
                                        break;
                                    case Device.Tx_UUID:
                                        console.log('Got characteristic: TX Data');
                                        device.TxCharacteristic = characteristic;
                                        break;
                                    default:
                                        console.log('characteristic: ' + characteristic.uuid);
                                };
                                if (device.isReady()) {
                                    console.log('READY');
                                    device.initialize();
                                };
                            });
                        });
                    };

                });
            });
        });
    });

    // setup the handler for stateChange:
    noble.on('stateChange', function (state) {
        console.log('state changed with value: ' + state);
        if (state == 'poweredOn') {
            console.log('start scanning!');
            noble.startScanning([Device.Device_Service_UUID]);
        } else {
            noble.stopScanning();
        }
    });
    //return Device;
} ());

console.log("program running");