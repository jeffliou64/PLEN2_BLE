//  (1)  create more variables&properties (for clarity and accessibility)
//  (2)  log EVERYTHING POSSIBLE (all steps of the connection/write)
//  (3)  separate functions for clarity (each function === 1 application/use)
//  (4)  add comments for each function/key variables
//  (5)  create error class/module, add errors for every connection-based function
//  (6)  Add a disconnect feature (throws an error if the given command is "OFF")
//  7)  Add a disconnect feature (if PLEN disconnects at any point, stop instance & send stuff)
//  8)  set up callback system if needed
var fs = require('fs');
var noble = require('noble');
var buffer = require('Buffer');
var prompt = require('prompt');
var q = require('q');
//var window = require('window');


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
    DeviceError.SERVICE_NOT_ENOUGH = 505;
    DeviceError.UNEXPECTED_ERROR = 500;
    DeviceError.DISCONNECTED_ERROR = 507;
    DeviceError.COMMAND_INCORRECT = 506;
    DeviceError.TURN_OFF = 508;
    return DeviceError;
} ());

var Device = (function () {
    function Device(peripheral) {
        //peripheral
        this.peripheral = null;
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

        this.rssiUpdateAvailable = true;
        this.disconnected = false;

        //flow control members
        this.name = undefined;
        this.paired = false;
        this.initialized = false;
        this.peripheral = peripheral;
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


    // Device.window.setTimeout(function (peripheral) {
    //     peripheral.updateRssi(function (error, rssi) {
    //         console.log("Peripheral: " + device.peripheral);
    //         console.log("peripheral rssi: " + device.peripheral.rssi);
    //         if (device.peripheral.rssi > 0 || error || device.peripheral.rssi == undefined || device.peripheral.rssi == null) {
    //             device.handleDisconnect(peripheral);
    //         }
    //     })
    // }, 1000);

    //  The initialization process after all required charateristics had been discover
    //  @param {none}
    Device.prototype.initialize = function (peripheral) {
        if (this.initialized) {
            console.log('already initialized');
            return;
        }

        this.initialized = true;
        console.log('device initialized');
        this.RxCharacteristic.notify(true, function (error) { });

        console.log('ready for commands');
        this.listPlenCommands();
        this.givePlenCommands(peripheral);
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
    Device.prototype.givePlenCommands = function (peripheral) {
        var _this = this;
        var commandToWrite = null;
        _this.checkForConnection(peripheral);
        if (this.disconnected == true) {
            return;
        }
        prompt.start();
        prompt.get('command', function (err, result) {
            if (err) {
                return console.log(err);
            }
            if (result.command.toUpperCase() == "OFF") {
                throw new DeviceError(DeviceError.TURN_OFF, "turn off connection");
            }
            var device = _this;
            console.log('command recieved: ' + result.command);
            Device.prototype.parseData(device.plen_commands).forEach(function (index) {
                if (index.name.toUpperCase() === result.command.toUpperCase()) {
                    console.log('correct command code found');
                    commandToWrite = index.id;
                }
            });
            if (commandToWrite == null) {
                console.log("COMMAND INCORRECT");
                device.givePlenCommands(peripheral);
            } else {
                device.writeToPLEN(commandToWrite, peripheral);
            }
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
    Device.prototype.writeToPLEN = function (command, peripheral) {
        var device = this;
        device.checkForConnection(peripheral);
        var command_length = command.length;
        //console.log('ready to write');
        var ascii_command = [];
        for (index = 0; index < command_length; index++) {
            ascii_command[index] = command.charCodeAt(index);
        }
        var buffer = new Buffer(ascii_command);
        device.TxCharacteristic.write(buffer, true, function (error) {
            console.log("write error: " + error)
        });
        this.givePlenCommands(peripheral);
    }

    Device.prototype.checkForConnection = function (peripheral) {
        var device = this;
        device.peripheral = peripheral;
        console.log("Peripheral: " + device.peripheral);
        console.log("peripheral rssi: " + device.peripheral.rssi);
        if (device.peripheral.state != 'connected') {
            device.handleDisconnect(peripheral);
        }
        peripheral.updateRssi(function (error, rssi) {
            console.log("Peripheral: " + device.peripheral);
            console.log("peripheral rssi: " + device.peripheral.rssi);
        })
    }


    Device.prototype.handleDisconnect = function (peripheral) {
        var device = this;
        console.log('DISCONNECTING');
        device.disconnected = true;
        console.log('start scanning!');
        noble.startScanning([Device.Primary_Service_UUID]);
    }

    // The Promise to get any readable characteristic from services
    // @param services {[any]} The services to serach from
    Device.prototype.promiseAnyReadableCharacteristic = function (services) {
        var promises = [];
        var device = this;
        services.forEach(function (service) {
            promises.push(device.promiseAnyReadableCharacteristicWithService(service));
        });
        return q.any(promises);
    };

    //  The Promise to get any readable characteristic from one service
    //  @param service {any} The service to search
    Device.prototype.promiseAnyReadableCharacteristicWithService = function (service) {
        return q.Promise(function (resolve, reject, notify) {
            service.discoverCharacteristics([], function (error, characteristics) {
                if (error) {
                    reject(new DeviceError(DeviceError.UNEXPECTED_ERROR, "cannot access the characteristics from the service: " + service.uuid));
                }
                var target = null;
                characteristics.every(function (characteristic) {
                    var readable = (characteristic.uuid.length);
                    if (readable > 0) {
                        target = characteristic;
                        return false;
                    }
                    return true;
                });
                if (target) {
                    resolve(target);
                }
                else {
                    reject(new DeviceError(DeviceError.UNEXPECTED_ERROR, 'cannot find any readable characteristic'));
                }
            });
        });
    };

    //  The Promise to read the data from the specified characteristic
    //  @param characteristic {any} The characteristic to be read
    //  @param errorCode {number} The error code for the error response (if error occurred when reading the characteristic)
    //  @param errorMessage {string} The error message for the error response (if error occurred when reading the characteristic)
    Device.prototype.promiseReadDataFromCharacteristic = function (characteristic, errorCode, errorMessage) {
        var device = this;
        return q.Promise(function (resolve, reject, notify) {
            characteristic.read(function (error, data) {
                if (error) {
                    reject(new DeviceError(errorCode || DeviceError.UNEXPECTED_ERROR, errorMessage));
                }
                resolve(data);
            });
        });
    };

    //  PLEN UUID's for pairing
    Device.Device_Battery_UUID = '180F';
    Device.Info_Service_UUID = '180A';
    Device.Primary_Service_UUID = 'E1F40469CFE143C1838DDDBC9DAFDDE6';
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
    Device.supportedServices = [Device.Primary_Service_UUID,
        Device.Info_Service_UUID,
        Device.Device_Battery_UUID];

    //  The static method to get device with corresponding peripheral
    //  @param peripheral {any} The discovered peripheral instance
    //  @param success {function} The success callback. Will pass with a device instance corresponding to the peripheral
    //  @param failed {function} The failed callback. Will pass with the original peripheral and the error code.
    Device.deviceWithPeripheral = function (peripheral, success, failed) {
        console.log("getting peripheral: " + peripheral);
        console.log("advertisement: " + peripheral.advertisement);
        var localName = peripheral.advertisement['localName'];
        console.log("got device: PLEN (" + localName + ")");
        var device = new Device(peripheral);
        device.name = localName;
        //device.successConnectedCallback = success;
        peripheral.discoverServices(Device.supportedServices, function (error, services) {
            return device.promiseAnyReadableCharacteristic(services).then(function (characteristic) {
                console.log('found characteristic: ' + characteristic.uuid);
                return device.promiseReadDataFromCharacteristic(characteristic, DeviceError.REQUIRE_PAIRING, "cannot read data from characteristic: " + characteristic.uuid);
            }).then(function (data) {
                console.log('success read: ' + data);
            }).then(function (version) {
                console.log("tickleapp firware version: " + version);
                // check for the number of the discovered services:
                if (services.length < Device.supportedServices.length) {
                    throw new DeviceError(DeviceError.SERVICE_NOT_ENOUGH, 'not all services found');
                }
                device.getServiceInformation(peripheral, services);
            }).catch(function (error) {
                console.log(error);
                if (failed) {
                    failed(peripheral, error.code);
                }
            });
        });
    };

    //  Makes sure all the required services have been found
    //  pairs device and sends to getCharacteristicsInformation() to pair characteristics
    //  @param {services}: the services found in the discovered peripheral
    Device.prototype.getServiceInformation = function (peripheral, services) {
        //var serviceWithCharacteristics = null;
        console.log('discovered service count: ' + services.length);
        this.paired = true;
        var device = this;
        services.forEach(function (service) {
            device.getCharacteristicsInformation(peripheral, service);
        });
    };

    //  Checks the service sent by getServiceInformation() and matches/pairs each characteristic
    //  Once all characteristics are found & matched, device is initialized
    //  @param {service}: the individual service to look at for characteristics
    Device.prototype.getCharacteristicsInformation = function (peripheral, service) {
        var device = this;
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
                else {
                    throw new DeviceError(DeviceError.CHARACTERISTIC_NOT_MATCHED, 'characteristic not matched');
                }

                if (device.isReady()) {
                    console.log('READY');
                    device.initialize(peripheral);
                }
            });

        });
    };

    // setup the handler for stateChange:
    noble.on('stateChange', function (state) {
        console.log('state changed with value: ' + state);
        if (state == 'poweredOn') {
            console.log('start scanning!');
            noble.startScanning([Device.Primary_Service_UUID]);
        } else {
            noble.stopScanning();
        }
    });

    //	setup the callback for discover peripherals:
    //  when a peripheral is discovered, sends to getServiceInformation() to get services
    //  @param
    noble.on('discover', function (peripheral) {
        console.log('Got device');
        if (peripheral.advertisement['localName'] != 'PLEND') {
            return;
        };
        var localName = peripheral.advertisement['localName'];
        console.log('Got device: ' + localName);
        var device = new Device(peripheral);
        device.name = localName;
        //device.successConnectedCallback = 'success';
        peripheral.connect(function (error) {
            if (error != undefined) {
                console.log(peripherail.uuid + ' RSSI:' + peripherail.rssi + ' Connecting, Error : ' + error);
            } else {
                console.log(peripheral.uuid + ' RSSI:' + peripheral.rssi);
                console.log('connected to peripheral: ' + peripheral.uuid);
                Device.deviceWithPeripheral(peripheral);
            }

        });
    });

    return Device;
} ());

console.log("program running");