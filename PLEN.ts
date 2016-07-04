class DeviceError {
    message: string;
    code: number;

    constructor(code: number, message?: string) {
        this.code = code;
        this.message = message;
    }

    toString(): string {
        return `DeviceError(${this.code}) message: ${this.message}`;
    }

    static SERVICE_NOT_MATCHED = 501;
    static CHARACTERISTIC_NOT_MATCHED = 504;
    static REQUIRE_PAIRING = 401;
    static SERVICE_NOT_ENOUGH = 505;
    static UNEXPECTED_ERROR = 500;
    static DISCONNECTED_ERROR = 507;
    static COMMAND_INCORRECT = 506;
    static TURN_OFF = 508;
}


class Device {
    static Device_Battery_UUID = '180F';
    static Info_Service_UUID = '180A';
    static Primary_Service_UUID = 'E1F40469CFE143C1838DDDBC9DAFDDE6';

    static Bt_Characteristic_UUID = 'CF70EE7F2A264F62931F9087AB12552C';
    static Rx_Characteristic_UUID = '2ED17A59FC21488E9204503EB78158D7';
    static Tx_Characteristic_UUID = 'F90E9CFE7E0544A59D75F13644D6F645';
    static Manufacturer_Name_String_UUID = '2A29';
    static Model_Number_String_UUID = '2A24';
    static Serial_Number_String_UUID = '2A25';
    static Firmware_Revision_String_UUID = '2A26';
    static Hardware_Revision_String_UUID = '2A27';
    static Battery_level_UUID = '2A19';

    static supportedServices = [Device.Primary_Service_UUID,
        Device.Info_Service_UUID,
        Device.Device_Battery_UUID];

    peripheral = null;

    BtCharacteristic = null;
    RxCharacteristic = null;
    TxCharacteristic = null;
    ManufacturerNameStringCharacteristic = null;
    ModelNumberStringCharacteristic = null;
    SerialNumberStringCharacteristic = null;
    FirmwareRevisionStringCharacteristic = null;
    HardwareRevisionStringCharacteristic = null;
    BatteryLevelCharacteristic = null;

    rssiUpdateAvailable = true;
    disconnected = false;

    name: string = undefined;
    paired: boolean = false;
    initialized: boolean = false;
    plen_commands = fs.readFileSync('./commands.json', 'utf8');

    constructor(peripheral) {
        this.peripheral = peripheral;
    }

    isReady() {
        return this.BtCharacteristic != null &&
            this.RxCharacteristic != null &&
            this.TxCharacteristic != null &&
            this.ManufacturerNameStringCharacteristic != null &&
            this.ModelNumberStringCharacteristic != null &&
            this.SerialNumberStringCharacteristic != null &&
            this.FirmwareRevisionStringCharacteristic != null &&
            this.HardwareRevisionStringCharacteristic != null &&
            this.BatteryLevelCharacteristic != null;
    }

    toString(): string {
        return `PLEN: ${this.name}`;
    }

    initialize(peripheral) {
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
    }

    listPlenCommands() {
        return console.log(this.plen_commands);
    }

    givePlenCommands(peripheral) {
        let _this = this;
        var commandToWrite = null;
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

            let device = _this;
            console.log('command received: ' + result.command);
            device.parseData(device.plen_commands).forEach((index) => {
                if (index.name.toUpperCase() === result.command.toUpperCase()) {
                    console.log('correct command code found');
                    commandToWrite = index.id;
                }
            })
        })
    }

    parseData(dataToParse) {
        var parsedData = JSON.parse(dataToParse);
        return parsedData;
    }
    //writing and updating functions
    //
    //GAP
    //
    //connection functions

    /**
     * The Promise to get any readable characteristic from services
     * @param services {[any]} The services to serach from
     */
    promiseAnyReadableCharacteristic(services) {

        let promises = [];
        let device = this;
        services.forEach(function (service) {
            promises.push(device.promiseAnyReadableCharacteristicWithService(service));
        });

        return q.any(promises);
    }

    /**
     * The Promise to get any readable characteristic from one service
     * @param service {any} The service to search 
     */
    promiseAnyReadableCharacteristicWithService(service: any) {
        return q.Promise(function (resolve, reject, notify) {
            service.discoverCharacteristics([], function (error, characteristics) {
                if (error) {
                    reject(new DeviceError(DeviceError.UNEXPECTED_ERROR, `cannot access the characteristics from the service: ${service.uuid}`));
                }
                let target = null;
                characteristics.every(function (characteristic) {
                    let readable = (characteristic.properties & 0x02) >> 1;
                    if (readable > 0) {
                        target = characteristic;
                        return false;
                    }
                    return true;
                });
                if (target) {
                    resolve(target);
                } else {
                    reject(new DeviceError(DeviceError.UNEXPECTED_ERROR, 'cannot find any readable characteristic'));
                }
            });
        });
    }

    promiseReadDataFromCharacteristic(characteristic: any, errorCode?: number, errorMessage?: string) {
        let device = this;
        return q.Promise(function (resolve, reject, notify) {
            characteristic.read(function (error, data) {
                if (error) {
                    reject(new DeviceError(errorCode || DeviceError.UNEXPECTED_ERROR, errorMessage));
                }
                resolve(data);
            });

        });
    }

    static deviceWithPeripheral = function (
        peripheral: any,
        successs: (device: Device) => void,
        failed: (peripheral: any, code: number) => void) {
        console.log(`getting peripheral: ${peripheral}`);
        console.log(`advertisement: ${peripheral.advertisement}`);
        const localName = peripheral.advertisement['localName'];

        console.log(`got device: PLEN(${localName})`);
        let device = new Device(peripheral);
        device.name = localName;

        peripheral.discoverServices(Device.supportedServices, function (error: any, services: [any]) {
            return device.promiseAnyReadableCharacteristic(services).then(function (characteristic) {
                console.log('found characteristic: ' + characteristic.uuid);
                return device.promiseReadDataFromCharacteristic(characteristic, DeviceError.REQUIRE_PAIRING, "cannot read data from characteristic: " + characteristic.uuid);
            }).then((data) => {
                console.log('success read: ' + data);
            }).then((version: string) => {
                console.log(`tickleapp firmware version: ${version}`);

                if (services.length < Device.supportedServices.length) {
                    throw new DeviceError(DeviceError.SERVICE_NOT_ENOUGH, 'not all services found');
                }

                device.getServiceInformation(peripheral, services);
            }).catch((error: DeviceError) => {
                console.log(error);
                if (failed) {
                    failed(peripheral, error.code);
                }
            })
        })
    }

    getServiceInformation(
        peripheral,
        services) {
        let device = this;
        console.log(`discovered service count: ${services.length}`);
        services.every(function (service: any) {
            device.getCharacteristicsInformation(peripheral, service);
        })
    }

    getCharacteristicsInformation(peripheral, service) {
        let device = this;
        console.log(`searching for characteristics with service: ${service.uuid}`);
        service.discoverCharacteristics([], function (error, characteristics) {
            console.log(`discover characteristics with count: ${characteristics.length}`);
            if (error) {
                return console.log(`${error}`);
            }
            characteristics.forEach(characteristic => {
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
            })
        })

    }

    //end of Device
}




