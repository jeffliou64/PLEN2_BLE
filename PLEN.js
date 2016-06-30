//  (1)  create more variables&properties (for clarity and accessibility)
//  (2)  log EVERYTHING POSSIBLE (all steps of the connection/write)
//  (3)  separate functions for clarity (each function === 1 application/use)
//  (4)  add comments for each function/key variables
//  5)  create error class/module, add errors for every function
//  6)  set up callback system if needed
var fs = require('fs');
var noble = require('noble');
var buffer = require('Buffer');
var prompt = require('prompt');

var DeviceError = (function () {
    function DeviceError(code, message) {
        this.code = code;
        this.message = message;
    }

    DeviceError.prototype.toString = function () {
        return "DeviceError(" + this.code + ") message: " + this.message;
    }
    DeviceError.SERVICE_NOT_MATCHED = 501;
    DeviceError.CHARACTERISTIC_NOT_MATCHED = 504;
    DeviceError.REQUIRE_PAIRING = 401;
    DeviceError.REVISION_NOT_MATCHED = 502;
    DeviceError.UNEXPECTED_ERROR = 500;
    return DeviceError;
}());

var Device = (function () {
    function Device(peripherial) {
        //peripherial
        this.peripherial = null;
        //all plen characteristics
        this.BtCharacteristic = null;
        this.RxCharacteristic = null;
        this.TxCharacteristic = null;
        this.ManufacturerNameStringCharacteristic = null;
        this.ModelNumberStringCharacteristic = null;
        this.SerialNumberStringCharacteristic = null;
        this.FirmwareRevisionStringCharacteristic = null;
        this.HardwareRevisionStringCharacteristic = null;
        this.BatteryLevelCharacteristic = null;

        //flow control members
        this.name = undefined;
        this.paired = false;
        this.initialized = false;
        this.peripherial = peripherial;
        //property of plen built-in commands
        this.plen_commands = fs.readFileSync('./commands.json', 'utf8');
    };

    //  Checks that all characteristics are property identified and matched
    //  @param {none} 
    Device.prototype.isReady = function () {
        return this.BtCharacteristic != null &&
            this.RxCharacteristic != null &&
            this.TxCharacteristic != null &&
            this.ManufacturerNameStringCharacteristic != null &&
            this.ModelNumberStringCharacteristic != null &&
            this.SerialNumberStringCharacteristic != null &&
            this.FirmwareRevisionStringCharacteristic != null &&
            this.HardwareRevisionStringCharacteristic != null &&
            this.BatteryLevelCharacteristic != null;
    };

    //  The initialization process after all required charateristics had been discover
    //  @param {none}
    Device.prototype.initialize = function () {
        if (this.initialized) {
            console.log('already initialized');
            return;
        }

        this.initialized = true;
        console.log('device initialized');
        this.RxCharacteristic.notify(true, function (error) { });

        console.log('ready for commands');
        this.listPlenCommands();
        this.givePlenCommands();
    };

    //  Returns the name of the plen device
    //  @param {none}
    Device.prototype.toString = function () {
        return "PLEN: " + this.name;
    };

    //  lists the array of build-in plen commands
    //  @param {none}    
    Device.prototype.listPlenCommands = function () {
        return console.log(this.plen_commands);
    }

    //  The function to prompt the user to give commands
    //  takes result and sends to writeToPLEN to write to robot
    //  @param {none}
    Device.prototype.givePlenCommands = function () {
        var _this = this;
        var commandToWrite;
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
                }
            });
            device.writeToPLEN(commandToWrite);
        });
    };

    //  Parses data from JSON files for analyzing by other functions (creates an array of objects)
    //  @param {dataToParse}: the JSON file to be parsed (already read with device.plen_commands)
    Device.prototype.parseData = function (dataToParse) {
        var parsedData = JSON.parse(dataToParse);
        return parsedData;
    };

    //  The function to encode from character to ascii, and write to the robot's write characteristic
    //  Writes to give the plen robot commands
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

    //  PLEN UUID's for pairing
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
    //  All supported plen services
    Device.supportedServices = [Device.Device_Service_UUID,
        Device.Primary_service_UUID,
        Device.Device_Battery_UUID];

    //	setup the callback for discover peripherials:
    //  when a peripheral is discovered, sends to getServiceInformation() to get services
    //  @param
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

    //  Makes sure all the required services have been found
    //  pairs device and sends to getCharacteristicsInformation() to pair characteristics
    //  @param {services}: the services found in the discovered peripheral
    Device.prototype.getServiceInformation = function (services) {
        //var serviceWithCharacteristics = null;
        console.log('discovered service count: ' + services.length);
        this.paired = true;
        var device = this;
        services.forEach(function (service) {
            device.getCharacteristicsInformation(service);
        });
    };

    //  Checks the service sent by getServiceInformation() and matches/pairs each characteristic
    //  Once all characteristics are found & matched, device is initialized
    //  @param {service}: the individual service to look at for characteristics
    Device.prototype.getCharacteristicsInformation = function (service) {
        var device = this;
        console.log('this: ' + this);
        console.log('searching for characteristics with service ' + service.uuid);
        service.discoverCharacteristics([], function (error, characteristics) {
            if (error) {
                return console.log(error);
            }
            console.log('discovered characteristic count: ' + characteristics.length);
            characteristics.forEach(function (characteristic) {
                if (characteristic.uuid.toUpperCase() == Device.Manufacturer_Name_String_UUID) {
                    device.ManufacturerNameStringCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Model_Number_String_UUID) {
                    device.ModelNumberStringCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Serial_Number_String_UUID) {
                    device.SerialNumberStringCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Firmware_Revision_String_UUID) {
                    device.FirmwareRevisionStringCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Hardware_Revision_String_UUID) {
                    device.HardwareRevisionStringCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Bt_Characteristic_UUID) {
                    device.BtCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Rx_Characteristic_UUID) {
                    device.RxCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Tx_Characteristic_UUID) {
                    device.TxCharacteristic = characteristic;
                }
                else if (characteristic.uuid.toUpperCase() == Device.Battery_level_UUID) {
                    device.BatteryLevelCharacteristic = characteristic;
                }
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
    return Device;
} ());

console.log("program running");