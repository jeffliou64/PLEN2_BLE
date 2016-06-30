//  (1)  create more variables&properties (for clarity and accessibility)
//  (2)  log EVERYTHING POSSIBLE (all steps of the connection/write)
//  (3)  separate functions for clarity (each function === 1 application/use)
//  4)  add comments for each function/key variables
//  5)  create error class/module, add errors for every function
//  6)  set up callback system if needed
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
        this.RxCharacteristic = null;
        this.TxCharacteristic = null;
        this.ManufacturerNameStringCharacteristic = null;
        this.ModelNumberStringCharacteristic = null;
        this.SerialNumberStringCharacteristic = null;
        this.FirmwareRevisionStringCharacteristic = null;
        this.HardwareRevisionStringCharacteristic = null;
        this.BatteryLevelCharacteristic = null;

        this.name = undefined;
        this.paired = false;
        this.initialized = false;
        this.peripherial = peripherial;

        this.plen_commands = fs.readFileSync('./commands.json', 'utf8');
    };

    Device.prototype.isReady = function () {
        console.log(this.BtCharacteristic != null &&
            this.RxCharacteristic != null &&
            this.TxCharacteristic != null &&
            this.ManufacturerNameStringCharacteristic != null &&
            this.ModelNumberStringCharacteristic != null &&
            this.SerialNumberStringCharacteristic != null &&
            this.FirmwareRevisionStringCharacteristic != null &&
            this.HardwareRevisionStringCharacteristic != null &&
            this.BatteryLevelCharacteristic != null);
        return;
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
    Device.Device_Battery_UUID = '180F';
    Device.Primary_Service_UUID = '180A';
    Device.Device_Service_UUID = 'E1F40469CFE143C1838DDDBC9DAFDDE6';
    Device.Bt_Characteristic_UUID = 'CF70EE7F2A264F62931F9087AB12552C';
    Device.Rx_Characteristic_UUID = '2ED17A59FC21488E9204503EB78158D7';
    Device.Tx_Characteristic_UUID = 'F90E9CFE7E0544A59D75F13644D6F645';
    Device.Manufacturer_Name_String_UUID = '2A29';
    Device.Model_Number_String_UUID = '2A24';
    Device.Serial_Number_String_UUID = '2A25';
    Device.Firmware_Revision_String_UUID = '2A26';
    Device.Hardware_Revision_String_UUID = '2A27';
    Device.Battery_level_UUID = '2A19';


    //PLEN services
    Device.supportedServices = [Device.Device_Service_UUID,
        Device.Primary_service_UUID,
        Device.Device_Battery_UUID];

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
                if (services.length < Device.supportedServices.length) {
                    return false;
                }
                device.getServiceInformation(services);
            });
        });
    });

    //function to read and pair services
    //log discovered service count
    //make sure the required services have been found (and log found services)
    //return true if all found, false if anything else
    Device.prototype.getServiceInformation = function (services) {
        //var serviceWithCharacteristics = null;
        console.log('discovered service count: ' + services.length);
        this.paired = true;
        var device = this;
        services.forEach(function (service) {
            device.getCharacteristicsInformation(service);
        });
    };

        //this.BtCharacteristic = null;
        //this.RxCharacteristic = null;
        //this.TxCharacteristic = null;
        //this.ManufacturerNameStringCharacteristic = null;
        //this.ModelNumberStringCharacteristic = null;
        //this.SerialNumberStringCharacteristic = null;
        //this.FirmwareRevisionStringCharacteristic = null;
        //this.HardwareRevisionStringCharacteristic = null;
        //this.BatteryLevelCharacteristic = null;

    //function to read & pair characteristics
    //log discovered characteristic count
    //for each one, log and pair to the corresponding characteristic
    //return once complete for initialization
    Device.prototype.getCharacteristicsInformation = function (service) {
        var device = this;
        console.log('this: ' + this);
        console.log('searching for characteristics with service ' + service.uuid);
        service.discoverCharacteristics([], function (error, characteristics) {
            //var device = _this;
            if (error) {
                return console.log(error);
            }
            console.log('discovered characteristic count: ' + characteristics.length);
            characteristics.forEach(function (characteristic) {
                if (characteristic.uuid.toUpperCase() == Device.Manufacturer_Name_String_UUID) {
                    console.log(characteristic.uuid);
                    device.ManufacturerNameStringCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Model_Number_String_UUID) {
                    console.log(characteristic.uuid);
                    device.ModelNumberStringCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Serial_Number_String_UUID) {
                    console.log(characteristic.uuid);
                    device.SerialNumberStringCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Firmware_Revision_String_UUID) {
                    console.log(characteristic.uuid);
                    device.FirmwareRevisionStringCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Hardware_Revision_String_UUID) {
                    console.log(characteristic.uuid);
                    device.HardwareRevisionStringCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Bt_Characteristic_UUID) {
                    console.log(characteristic.uuid);
                    device.BtCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Rx_Characteristic_UUID) {
                    console.log(characteristic.uuid);
                    device.RxCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Tx_Characteristic_UUID) {
                    console.log(characteristic.uuid);
                    device.TxCharacteristic == characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Battery_level_UUID) {
                    console.log(characteristic.uuid);
                    device.BatteryLevelCharacteristic == characteristic;
                }
                console.log(device.BtCharacteristic + '' +
                    device.RxCharacteristic + '' +
                    device.TxCharacteristic + '' +
                    device.ManufacturerNameStringCharacteristic + '' +
                    device.ModelNumberStringCharacteristic + '' +
                    device.SerialNumberStringCharacteristic + '' +
                    device.FirmwareRevisionStringCharacteristic + '' +
                    device.HardwareRevisionStringCharacteristic + '' +
                    device.BatteryLevelCharacteristic
                );
                if (device.isReady()) {
                    console.log('READY');
                    device.initialize();
                }
            });

        });
    };


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