
var util = require('utilities.js');

// First check if TCBuffer had been included in the JSContext

if (!(OJBBuffer instanceof Object)) {

    throw 'OJBBuffer is not defined';
}

// The Main Buffer Interface:

function Buffer() {

    this.ojcInstance = null;
    this.toString = function(encoding){
        
        if (encoding === undefined) {
            encoding = 'utf8';
        }
        
        return this.ojcInstance.stringValue(encoding);
    }

    var arg0 = arguments[0];
    var arg1 = arguments[1];
    
    if (util.isString(arg0)) {
        
        this.ojcInstance = OJBBuffer.buffer(arg0, arg1);

    } else if (util.isOJCBuffer(arg0)) {
        
        this.ojcInstance = arg0;
        
    } else if (util.isArray(arg0)) {

        // TODO: implement the corresponding constructor
        throw 'Error: not implemented';
    }
    
    return this;
}

// The conversion method for objc

function bufferFromOJCBuffer(ojcBuffer) {
    
    var buffer = null;
    if (isOJCBuffer(ojcBuffer)) {

        buffer = new Buffer()
        buffer.ojcInstance = ojcBuffer;
    }
    return buffer;
}

Buffer.bufferFromOJCBuffer = bufferFromOJCBuffer;

module.exports = Buffer;
