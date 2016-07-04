declare var q: any;
declare class DeviceError {
    message: string;
    code: number;
    constructor(code: number, message?: string);
    toString(): string;
    static SERVICE_NOT_MATCHED: number;
    static CHARACTERISTIC_NOT_MATCHED: number;
    static REQUIRE_PAIRING: number;
    static SERVICE_NOT_ENOUGH: number;
    static UNEXPECTED_ERROR: number;
    static DISCONNECTED_ERROR: number;
    static COMMAND_INCORRECT: number;
    static TURN_OFF: number;
}
declare class Device {
    static Device_Battery_UUID: string;
    static Info_Service_UUID: string;
    static Primary_Service_UUID: string;

    static Bt_Characteristic_UUID: string;
    static Rx_Characteristic_UUID: string;
    static Tx_Characteristic_UUID: string;
    static Manufacturer_Name_String_UUID: string;
    static Model_Number_String_UUID: string;
    static Serial_Number_String_UUID: string;
    static Firmware_Revision_String_UUID: string;
    static Hardware_Revision_String_UUID: string;
    static Battery_level_UUID: string;
    static supportedServices: string[];
    
    peripheral: any;
    //successConnectedCallback: any;
    //ledService: any;
    BtCharacteristic: any;
    RxCharacteristic: any;
    TxCharacteristic: any;
    ManufacturerNameStringCharacteristic: any;
    ModelNumberStringCharacteristic: any;
    SerialNumberStringCharacteristic: any;
    FirmwareRevisionStringCharacteristic: any;
    HardwareRevisionStringCharacteristic: any;
    BatteryLevelCharacteristic: any;

    name: string;
    paired: boolean;
    initialized: boolean;
    plen_commands: any;
    constructor(peripheral: any);
    isReady(): boolean;
    toString(): string;
    /**
     * The initialization process after all required charateristics had been discover
     */
    initialize(peripheral: any): void;



    
    /**
     * The static method to get device with corresponding peripheral
     * @param peripheral {any} The discovered peripheral instance
     * @param success {function} The success callback. Will pass with a device instance corresponding to the peripheral
     * @param failed {function} The failed callback. Will pass with the original peripheral and the error code.
     */
    static deviceWithperipheral: (peripheral: any, success: (device: Device) => void, failed: (peripheral: any, code: number) => void) => void;
    /**
     * The Promise to get any readable characteristic from services
     * @param services {[any]} The services to serach from
     */
    promiseAnyReadableCharacteristic(services: any): any;
    /**
     * The Promise to get any readable characteristic from one service
     * @param service {any} The service to search
     */
    promiseAnyReadableCharacteristicWithService(service: any): any;
    /**
     * The Promise to read the data from the specified characteristic
     * @param characteristic {any} The characteristic to be read
     * @param errorCode {number} The error code for the error response (if error occurred when reading the characteristic)
     * @param errorMessage {string} The error message for the error response (if error occurred when reading the characteristic)
     */
    promiseReadDataFromCharacteristic(characteristic: any, errorCode?: number, errorMessage?: string): any;

    /**
     * The Promise to fetch the info service:
     */
    getServiceInformation(peripheral: any, services: any): any;
    /**
     * The Promise to fetch the revision characteristic
     */
    getCharactieristicsInformation(peripheral:any, service: any): any;

    //hexStringWithValue(value: number, padding: number, littleEndian: boolean): string;
}
