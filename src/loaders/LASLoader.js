/**
 * Created by Sebastien.
 */
import * as RC from '../RenderCore.js'

export class LASLoader {
    constructor (manager = new RC.LoadingManager(), responseType = "", stream = true, chunkSize = 1024*1024) {
        this._manager = manager;
        this._responseType = responseType;
        this._stream = stream;
        this._chunkSize = chunkSize;

        this.PHBLoaded = false;
        this.VLRsLoaded = false;
        this.PDRLoaded = false;
        this.PointsLoaded = 0;
        this.PHB = null;
        this.DataBuffer = null;
        this.DataView = null;
        //LOAD INDICATORS
        this.LASSize = 0;
        this.LASLoaded = 0;
        this.LASChunk = 0;
        //OUTPUT
        this.output = {};
    }


    load (url, set, onLoad, onProgress, onError, onAbort, onHeaderLoad, onLoadChunk) {
        this._loadStream(url, set, onLoad, onProgress, onError, onAbort, onHeaderLoad, onLoadChunk);
    }

    _loadStream (url, set, onLoad, onProgress, onError, onAbort, onHeaderLoad, onLoadChunk) {
        const scope = this;
        const loader = new RC.XHRStreamer(this._manager, this._responseType, this._chunkSize);

        loader.load(
            url,
            function(data){
                onLoad(data);
                //clear
                scope.output = {};
            },
            function(xhr){
                scope.LASChunk = xhr.total;//LASChunk = xhr.total;
                onProgress(xhr);
            },
            onError,
            onAbort,
            function(headerData){
                scope.LASSize = headerData.size;
                scope.DataBuffer = new ArrayBuffer(headerData.size);
                scope.DataView = new DataView(scope.DataBuffer);
                scope.PHB = new RC.LASLoader.PHB();

                onHeaderLoad(headerData);
            },
            function(chunkData){
                var result = null;
                scope._copyArray(scope.DataBuffer, chunkData, 0, scope.LASLoaded, scope.LASChunk);
                scope.LASLoaded += scope.LASChunk;

                if(scope.PHBLoaded === false){
                    scope.PHBLoaded = scope._parseHeader(scope.DataView, scope.LASLoaded, scope.PHB);
                    if(scope.PHBLoaded){
                        console.log("PHB is loaded");
                        scope._printHeader(scope.PHB);

                        if(scope.PHB.inserts.NUMBER_OF_VARIABLE_LENGTH_RECORDS.data === 0) scope.VLRsLoaded = true;
                    }
                }
                if(scope.PHBLoaded === true && scope.VLRsLoaded === false){
                    // ignore parsing of VLRs
                }
                if(scope.PHBLoaded === true && scope.PDRLoaded === false){
                    result = scope._parsePointData(scope.DataView, scope.LASLoaded, set);
                }

                if(result != null) onLoadChunk(result);
            }
        );
    }

    _parsePointData(dataView, dataLoaded, set){
        let pointDataRecordNumber = this.PHB.inserts.LEGACY_NUMBER_OF_POINT_RECORDS.data;
        if(pointDataRecordNumber === -1) pointDataRecordNumber = this.PHB.inserts.NUMBER_OF_POINT_RECORDS.data;
        const pointDataRecordLength = this.PHB.inserts.POINT_DATA_RECORD_LENGTH.data;
        const pointDataRecord = this._generateFormat(this.PHB.inserts.POINT_DATA_RECORD_FORMAT.data);
        const offsetToPointData = this.PHB.inserts.OFFSET_TO_POINT_DATA.data;

        const X_offset = this.PHB.inserts.X_OFFSET.data;
        const Y_offset = this.PHB.inserts.Y_OFFSET.data;
        const Z_offset = this.PHB.inserts.Z_OFFSET.data;

        const X_scale = this.PHB.inserts.X_SCALE_FACTOR.data;
        const Y_scale = this.PHB.inserts.Y_SCALE_FACTOR.data;
        const Z_scale = this.PHB.inserts.Z_SCALE_FACTOR.data;

        var result = null;

        for(let pointIndex = this.PointsLoaded; pointIndex < pointDataRecordNumber; pointIndex++){
            const pointOffset = offsetToPointData + (pointDataRecordLength * pointIndex);
            if(pointOffset + pointDataRecordLength >= dataLoaded) break;

            for(let s = 0; s < set.length; s++){
                let data = this._readFromDataView(dataView, pointDataRecord.inserts[set[s]], pointOffset);
                switch(set[s]) {
                    case RC.LASLoader.PDRFormat0.Keys.X:
                        data = (data*X_scale) + X_offset;
                        break;
                    case RC.LASLoader.PDRFormat0.Keys.Y:
                        data = (data*Y_scale) + Y_offset;
                        break;
                    case RC.LASLoader.PDRFormat0.Keys.Z:
                        data = (data*Z_scale) + Z_offset;
                        break;
                    /*case RC.LASLoader.PDRFormat2.Keys.RED:
                    case RC.LASLoader.PDRFormat2.Keys.GREEN:
                    case RC.LASLoader.PDRFormat2.Keys.BLUE:
                        data = data/256/255;
                        break;*/
                    default:

                }
                if(result == null) result = {};
                if(result[set[s]] === undefined) result[set[s]] = new Array();
                result[set[s]][pointIndex] = data;
            }

            this.PointsLoaded++;
        }

        return result;
    }

    _generateFormat(formatIndex){
        let format = null;

        switch(formatIndex) {
            case 0:
                format = new RC.LASLoader.PDRFormat0();
                break;
            case 1:
                format = new RC.LASLoader.PDRFormat1();
                break;
            case 2:
                format = new RC.LASLoader.PDRFormat2();
                break;
            case 3:
                format = new RC.LASLoader.PDRFormat3();
                break;
            case 4:
                format = new RC.LASLoader.PDRFormat4();
                break;
            case 5:
                format = new RC.LASLoader.PDRFormat5();
                break;
            case 6:
                format = new RC.LASLoader.PDRFormat6();
                break;
            case 7:
                format = new RC.LASLoader.PDRFormat7();
                break;
            case 8:
                format = new RC.LASLoader.PDRFormat8();
                break;
            case 9:
                format = new RC.LASLoader.PDRFormat9();
                break;
            case 10:
                format = new RC.LASLoader.PDRFormat10();
                break;
            default:
                console.error("Unknown LAS format: " + formatIndex);
        }

        return format;
    }

    _copyArray(destination, source, srcOffset, dstOffset, size){
        const dst = new Uint8Array(destination);
        const src = new Uint8Array(source, srcOffset, size);
        dst.set(src, dstOffset);
    }

    _readFromArrayBuffer(arrayBuffer, offset, size){
        const data = new ArrayBuffer(size);

        const arrayBufferView = new Uint8Array(arrayBuffer);
        const dataView = new Uint8Array(data);

        for(let i = 0; i < size; i++){
            dataView[i] = arrayBufferView[offset + i];
        }


        return data;
    }

    _parseHeader(dataView, dataLoaded, header){
        console.log("Trying to parse header with "+dataLoaded+" bytes loaded");
        for (let insert in header.inserts) {
            // skip loop if the property is from prototype
            if (!header.inserts.hasOwnProperty(insert)) continue;
            if(header.inserts[insert].hasData) continue;
            if(header.inserts[insert].endOffset > dataLoaded
                && header.inserts[insert].required == true) {
                console.log("property "+insert+" requires "+header.inserts[insert].endOffset+" bytes");
                return false;
            }
            header.inserts[insert].data = this._readFromDataView(dataView, header.inserts[insert]);
            console.log("Read "+insert+": "+header.inserts[insert].data);
        }

        return true;
    }

    _printHeader(header){
        for (let insert in header.inserts) {
            // skip loop if the property is from prototype
            if (!header.inserts.hasOwnProperty(insert)) continue;

            console.log(insert + ": " + header.inserts[insert].data);
        }
    }

    _readFromDataView(dataView, insert, baseOffset = 0){
        var offset = baseOffset + insert.offset;
        switch(insert.format.type){
            case "char":
                return this._typedArray2String(new Int8Array(dataView.buffer, offset, insert.size));
            case "unsigned char":
                return this._typedArray2String(new Uint8Array(dataView.buffer, offset, insert.size));
            case "unsigned int8":
                return dataView.getUint8(offset);
            case "short":
                return dataView.getInt16(offset, true);
            case "unsigned short":
                return dataView.getUint16(offset, true);
            case "long":
                return dataView.getInt32(offset, true);
            case "unsigned long":
                return dataView.getUint32(offset, true);
            case "long long":
                return dataView.getBigInt64(offset, true);
            case "unsigned long long":
                return dataView.getBigUint64(offset, true);
            case "float":
                return dataView.getFloat32(offset, true);
            case "double":
                return dataView.getFloat64(offset, true);
            default:
                console.error("Unknown LAZ insert format type.")
        }
    }

    _typedArray2String(typedArray) {
        return String.fromCharCode.apply(null, typedArray);
    }
};

RC.LASLoader.DataTypes = {
    char: {type: "char", byteSize: 1},
    unsignedChar: {type: "unsigned char", byteSize: 1},
    uint8: {type: "unsigned int8", byteSize: 1},
    short: {type: "short", byteSize: 2},
    unsignedShort: {type: "unsigned short", byteSize: 2},
    long: {type: "long", byteSize: 4},
    unsignedLong: {type: "unsigned long", byteSize: 4},
    longLong: {type: "long long", byteSize: 8},
    unsignedLongLong: {type: "unsigned long long", byteSize: 8},
    float: {type: "float", byteSize: 4},
    double: {type: "double", byteSize: 8},
    string:  undefined
};
RC.LASLoader.PHB = class {
    constructor () {
        this._headerLength = 375;

        //this._dataTypes = new RC.LASLoader.DataTypes();
        this._dataTypes = RC.LASLoader.DataTypes;
        this._inserts = {
            FILE_SIGNATURE: new RC.LASLoader.PHBInsert("File Signature (“LASF”)", this._dataTypes.char, 4, true, 0),
            FILE_SOURCE_ID: new RC.LASLoader.PHBInsert("File Source ID", this._dataTypes.unsignedShort, 1, true, 4),
            GLOBAL_ENCODING: new RC.LASLoader.PHBInsert("Global Encoding", this._dataTypes.unsignedShort, 1, true, 6),

            GUID_DATA_1: new RC.LASLoader.PHBInsert("Project ID - GUID Data 1", this._dataTypes.unsignedLong, 1, false, 8),
            GUID_DATA_2: new RC.LASLoader.PHBInsert("Project ID - GUID Data 2", this._dataTypes.unsignedShort, 1, false, 12),
            GUID_DATA_3: new RC.LASLoader.PHBInsert("Project ID - GUID Data 3", this._dataTypes.unsignedShort, 1, false, 14),
            GUID_DATA_4: new RC.LASLoader.PHBInsert("Project ID - GUID Data 4", this._dataTypes.unsignedChar, 8, false, 16),

            VERSION_MAJOR: new RC.LASLoader.PHBInsert("Version Major", this._dataTypes.uint8, 1, true, 24),
            VERSION_MINOR: new RC.LASLoader.PHBInsert("Version Minor", this._dataTypes.uint8, 1, true, 25),

            SYSTEM_IDENTIFIER: new RC.LASLoader.PHBInsert("System Identifier", this._dataTypes.char, 32, true, 26),
            GENERATING_SOFTWARE: new RC.LASLoader.PHBInsert("Generating Software ", this._dataTypes.char, 32, true, 58),
            FILE_CREATION_DAY: new RC.LASLoader.PHBInsert("File Creation Day of Year", this._dataTypes.unsignedShort, 1, true, 90),
            FILE_CREATION_YEAR: new RC.LASLoader.PHBInsert("File Creation Year", this._dataTypes.unsignedShort, 1, true, 92),

            HEADER_SIZE: new RC.LASLoader.PHBInsert("Header Size", this._dataTypes.unsignedShort, 1, true, 94),
            OFFSET_TO_POINT_DATA: new RC.LASLoader.PHBInsert("Offset to Point Data", this._dataTypes.unsignedLong, 1, true, 96),
            NUMBER_OF_VARIABLE_LENGTH_RECORDS: new RC.LASLoader.PHBInsert("Number of Variable Length Records", this._dataTypes.unsignedLong, 1, true, 100),
            POINT_DATA_RECORD_FORMAT: new RC.LASLoader.PHBInsert("Point Data Record Format", this._dataTypes.uint8, 1, true, 104),
            POINT_DATA_RECORD_LENGTH: new RC.LASLoader.PHBInsert("Point Data Record Length", this._dataTypes.unsignedShort, 1, true, 105),
            LEGACY_NUMBER_OF_POINT_RECORDS: new RC.LASLoader.PHBInsert("Legacy Number of Point Records", this._dataTypes.unsignedLong, 1, true, 107),
            LEGACY_NUMBER_OF_POINT_BY_RETURN: new RC.LASLoader.PHBInsert("Legacy Number of Point by Return", this._dataTypes.unsignedLong, 20, true, 111),

            X_SCALE_FACTOR: new RC.LASLoader.PHBInsert("X Scale Factor", this._dataTypes.double, 1, true, 131),
            Y_SCALE_FACTOR: new RC.LASLoader.PHBInsert("Y Scale Factor", this._dataTypes.double, 1, true, 139),
            Z_SCALE_FACTOR: new RC.LASLoader.PHBInsert("Z Scale Factor", this._dataTypes.double, 1, true, 147),
            X_OFFSET: new RC.LASLoader.PHBInsert("X Offset", this._dataTypes.double, 1, true, 155),
            Y_OFFSET: new RC.LASLoader.PHBInsert("Y Offset", this._dataTypes.double, 1, true, 163),
            Z_OFFSET: new RC.LASLoader.PHBInsert("Z Offset", this._dataTypes.double, 1, true, 171),
            MAX_X: new RC.LASLoader.PHBInsert("Max X", this._dataTypes.double, 1, true, 179),
            MAX_Y: new RC.LASLoader.PHBInsert("Max Y", this._dataTypes.double, 1, true, 187),
            MAX_Z: new RC.LASLoader.PHBInsert("Max Z", this._dataTypes.double, 1, true, 195),
            MIN_X: new RC.LASLoader.PHBInsert("Min X", this._dataTypes.double, 1, true, 203),
            MIN_Y: new RC.LASLoader.PHBInsert("Min Y", this._dataTypes.double, 1, true, 211),
            MIN_Z: new RC.LASLoader.PHBInsert("Min Z", this._dataTypes.double, 1, true, 219),

            START_OF_WAVEFORM_DATA_PACKET_RECORD: new RC.LASLoader.PHBInsert("Start of Waveform Data Packet Record", this._dataTypes.unsignedLongLong, 1, true, 227),
            START_OF_FIRST_EXTENDED_VARIABLE_LENGTH_RECORD: new RC.LASLoader.PHBInsert("Start of First Extended Variable Length Record", this._dataTypes.unsignedLongLong, 1, true, 235),
            NUMBER_OF_EXTENDED_VARIABLE_LENGTH_RECORDS: new RC.LASLoader.PHBInsert("Number of Extended Variable Length Records", this._dataTypes.unsignedLong, 1, true, 243),

            NUMBER_OF_POINT_RECORDS: new RC.LASLoader.PHBInsert("Number of Point Records", this._dataTypes.unsignedLongLong, 1, true, 247),
            NUMBER_OF_POINTS_BY_RETURN: new RC.LASLoader.PHBInsert("Number of Points by Return", this._dataTypes.unsignedLongLong, 15, true, 255)

        };
    }


    get headerLength(){return this._headerLength}
    get inserts(){return this._inserts;}
};
RC.LASLoader.Insert = class {
    constructor (item, format, size, required, offset) {
        this._item = item;
        this._format = format;
        this._size = size;
        this._required = required;

        this._offset = offset;

        this._data = null;
    }


    set item(item){
        this._item = item;
    }
    set format(format){
        this._format = format;
    }
    set size(size){
        this._size = size;
    }
    set required(required){
        this._required = required;
    }
    set offset(offset){
        this._offset = offset;
    }
    set data(data){
        this._data = data;
    }

    get item(){
        return this._item;
    }
    get format(){
        return this._format;
    }
    get size(){
        return this._size;
    }
    get required(){
        return this._required;
    }
    get offset(){
        return this._offset;
    }
    get data(){
        return this._data;
    }
    get hasData(){
        return this._data != null;
    }
    get endOffset(){
        return this._offset + (this._format.byteSize * this._size);
    }
};
RC.LASLoader.PHBInsert = class extends RC.LASLoader.Insert{
    constructor (item, format, size, required, offset) {
        super(item, format, size, required, offset);
    }
};
RC.LASLoader.VLR = class {
    constructor () {
        this._headerLength = 54;

        //this._dataTypes = new RC.LASLoader.DataTypes();
        this._dataTypes = RC.LASLoader.DataTypes;
        this._inserts = {
            RESERVED: new RC.LASLoader.VLRInsert("Reserved", this._dataTypes.unsignedShort, 2, undefined, 0),
            USER_ID: new RC.LASLoader.VLRInsert("User ID", this._dataTypes.char, 16, true, 2),
            RECORD_ID: new RC.LASLoader.VLRInsert("Record ID", this._dataTypes.unsignedShort, 2, true, 18),
            RECORD_LENGTH_AFTER_HEADER: new RC.LASLoader.VLRInsert("Record Length After Header", this._dataTypes.unsignedShort, 2, true, 20),
            DESCRIPTION: new RC.LASLoader.VLRInsert("Description", this._dataTypes.char, 32, undefined, 22),

        };
    }


    get headerLength(){return this._headerLength}
    get inserts(){return this._inserts;}
};
RC.LASLoader.VLRInsert = class extends RC.LASLoader.Insert{
    constructor (item, format, size, required, offset) {
        super(item, format, size, required, offset);
    }
};

RC.LASLoader.PDRInsert = class extends RC.LASLoader.Insert{
    constructor (item, format, size, required, offset) {
        super(item, format, size, required, offset);
    }
};
RC.LASLoader.PDRFormat0 = class {
    constructor() {
        this._minSize = 20;

        //this._dataTypes = new RC.LASLoader.DataTypes();
        this._dataTypes = RC.LASLoader.DataTypes;
        this._inserts = {
            X: new RC.LASLoader.PDRInsert("X", this._dataTypes.long, 4, true, 0),
            Y: new RC.LASLoader.PDRInsert("Y", this._dataTypes.long, 4, true, 4),
            Z: new RC.LASLoader.PDRInsert("Z", this._dataTypes.long, 4, true, 8),

            INTENSITY: new RC.LASLoader.PDRInsert("Intensity", this._dataTypes.unsignedShort, 2, false, 12),

            RETURN_NUMBER: new RC.LASLoader.PDRInsert("Return Number", this._dataTypes.unsignedChar, 1, true, 14),
            NUMBER_OR_RETURNS: new RC.LASLoader.PDRInsert("Number of Returns (Given Pulse)", this._dataTypes.unsignedChar, 1, true, 14),
            SCAN_DIRECTION_FLAG: new RC.LASLoader.PDRInsert("Scan Direction Flag", this._dataTypes.unsignedChar, 1, true, 14),
            EDGE_OF_FLIGHT_LINE: new RC.LASLoader.PDRInsert("Edge of Flight Line", this._dataTypes.unsignedChar, 1, true, 14),

            CLASSIFICATION: new RC.LASLoader.PDRInsert("Classification", this._dataTypes.unsignedChar, 1, true, 15),
            SCAN_ANGELE_RANK: new RC.LASLoader.PDRInsert("Scan Angle Rank (-90 to +90) – Left Side", this._dataTypes.char, 1, true, 16),
            USER_DATA: new RC.LASLoader.PDRInsert("User Data", this._dataTypes.unsignedChar, 1, false, 17),
            POINT_SOURCE_ID: new RC.LASLoader.PDRInsert("Point Source ID", this._dataTypes.unsignedShort, 2, true, 18)

        };
    }


    set minSize(minSize){
        this._minSize = minSize;
    }
    get minSize(){
        return this._minSize;
    }
    get inserts(){return this._inserts;}
};
RC.LASLoader.PDRFormat0.Keys = {
    X: "X",
    Y: "Y",
    Z: "Z",
    INTENSITY: "INTENSITY",
    RETURN_NUMBER: "RETURN_NUMBER",
    NUMBER_OR_RETURNS: "NUMBER_OR_RETURNS",
    SCAN_DIRECTION_FLAG: "SCAN_DIRECTION_FLAG",
    EDGE_OF_FLIGHT_LINE: "EDGE_OF_FLIGHT_LINE",
    CLASSIFICATION: "CLASSIFICATION",
    SCAN_ANGELE_RANK: "SCAN_ANGELE_RANK",
    USER_DATA: "USER_DATA",
    POINT_SOURCE_ID: "POINT_SOURCE_ID"
};
RC.LASLoader.PDRFormat1 = class extends RC.LASLoader.PDRFormat0{
    constructor() {
        super();

        this.minSize = 28;

        /*this._inserts.concat([
            new RC.LASLoader.PDRInsert("GPS Time", this._dataTypes.double, 8, true, 20)
        ]);*/
        Object.assign(this._inserts, {
            GPS_TIME: new RC.LASLoader.PDRInsert("GPS Time", this._dataTypes.double, 8, true, 20)
        });
    }
};
RC.LASLoader.PDRFormat1.Keys = Object.assign({}, RC.LASLoader.PDRFormat0.Keys, {
    GPS_TIME: "GPS_TIME"
});
RC.LASLoader.PDRFormat2 = class extends RC.LASLoader.PDRFormat0{
    constructor() {
        super();

        this.minSize = 26;

        /*this._inserts.concat([
            new RC.LASLoader.PDRInsert("Red", this._dataTypes.unsignedShort, 2, true, 20),
            new RC.LASLoader.PDRInsert("Green", this._dataTypes.unsignedShort, 2, true, 22),
            new RC.LASLoader.PDRInsert("Blue", this._dataTypes.unsignedShort, 2, true, 24)
        ]);*/
        Object.assign(this._inserts, {
                RED: new RC.LASLoader.PDRInsert("Red", this._dataTypes.uint8, 1, true, 21),
                GREEN: new RC.LASLoader.PDRInsert("Green", this._dataTypes.uint8, 1, true, 23),
                BLUE: new RC.LASLoader.PDRInsert("Blue", this._dataTypes.uint8, 1, true, 25),
                NX: new RC.LASLoader.PDRInsert("NX", this._dataTypes.uint8, 1, true, 20),
                NY: new RC.LASLoader.PDRInsert("NY", this._dataTypes.uint8, 1, true, 22),
                NZ: new RC.LASLoader.PDRInsert("NZ", this._dataTypes.uint8, 1, true, 24)
        });
    }
};
RC.LASLoader.PDRFormat2.Keys = Object.assign({}, RC.LASLoader.PDRFormat0.Keys, {
    RED: "RED",
    GREEN: "GREEN",
    BLUE: "BLUE",
    NX: "NX",
    NY: "NY",
    NZ: "NZ"
});
RC.LASLoader.PDRFormat3 = class extends RC.LASLoader.PDRFormat1{
    constructor() {
        super();

        this.minSize = 34;

        /*this._inserts.concat([
            new RC.LASLoader.PDRInsert("Red", this._dataTypes.unsignedShort, 2, true, 28),
            new RC.LASLoader.PDRInsert("Green", this._dataTypes.unsignedShort, 2, true, 30),
            new RC.LASLoader.PDRInsert("Blue", this._dataTypes.unsignedShort, 2, true, 32)
        ]);*/
        Object.assign(this._inserts, {
            RED: new RC.LASLoader.PDRInsert("Red", this._dataTypes.unsignedShort, 2, true, 28),
            GREEN: new RC.LASLoader.PDRInsert("Green", this._dataTypes.unsignedShort, 2, true, 30),
            BLUE: new RC.LASLoader.PDRInsert("Blue", this._dataTypes.unsignedShort, 2, true, 32)
        });
    }
};
RC.LASLoader.PDRFormat3.Keys = Object.assign({}, RC.LASLoader.PDRFormat1.Keys, {
    RED: "RED",
    GREEN: "GREEN",
    BLUE: "BLUE"
});
RC.LASLoader.PDRFormat4 = class extends RC.LASLoader.PDRFormat1{
    constructor() {
        super();

        this.minSize = 57;

        /*this._inserts.concat([
            new RC.LASLoader.PDRInsert("Wave Packet Descriptor Index", this._dataTypes.unsignedChar, 1, true, 28),
            new RC.LASLoader.PDRInsert("Byte Offset to Waveform Data", this._dataTypes.unsignedLongLong, 8, true, 29),
            new RC.LASLoader.PDRInsert("Waveform Packet Size in Bytes", this._dataTypes.unsignedLong, 4, true, 37),
            new RC.LASLoader.PDRInsert("Return Point Waveform Location", this._dataTypes.float, 4, true, 41),
            new RC.LASLoader.PDRInsert("Parametric dx", this._dataTypes.float, 4, true, 45),
            new RC.LASLoader.PDRInsert("Parametric dy", this._dataTypes.float, 4, true, 49),
            new RC.LASLoader.PDRInsert("Parametric dz", this._dataTypes.float, 4, true, 53)
        ]);*/
        Object.assign(this._inserts, {
            WAVE_PACKET_DESCRIPTOR_INDEX: new RC.LASLoader.PDRInsert("Wave Packet Descriptor Index", this._dataTypes.unsignedChar, 1, true, 28),
            BYTE_OFFSET_TO_WAVEFORM_DATA: new RC.LASLoader.PDRInsert("Byte Offset to Waveform Data", this._dataTypes.unsignedLongLong, 8, true, 29),
            WAVEFORM_PACKET_SIZE_IN_BYTES: new RC.LASLoader.PDRInsert("Waveform Packet Size in Bytes", this._dataTypes.unsignedLong, 4, true, 37),
            RETURN_POINT_WAVEFORM_LOCATION: new RC.LASLoader.PDRInsert("Return Point Waveform Location", this._dataTypes.float, 4, true, 41),
            PARAMETRIC_DX: new RC.LASLoader.PDRInsert("Parametric dx", this._dataTypes.float, 4, true, 45),
            PARAMETRIC_DY: new RC.LASLoader.PDRInsert("Parametric dy", this._dataTypes.float, 4, true, 49),
            PARAMETRIC_DZ: new RC.LASLoader.PDRInsert("Parametric dz", this._dataTypes.float, 4, true, 53)
        });
    }
};
RC.LASLoader.PDRFormat4.Keys = Object.assign({}, RC.LASLoader.PDRFormat1.Keys, {
    WAVE_PACKET_DESCRIPTOR_INDEX: "WAVE_PACKET_DESCRIPTOR_INDEX",
    BYTE_OFFSET_TO_WAVEFORM_DATA: "BYTE_OFFSET_TO_WAVEFORM_DATA",
    WAVEFORM_PACKET_SIZE_IN_BYTES: "WAVEFORM_PACKET_SIZE_IN_BYTES",
    RETURN_POINT_WAVEFORM_LOCATION: "RETURN_POINT_WAVEFORM_LOCATION",
    PARAMETRIC_DX: "PARAMETRIC_DX",
    PARAMETRIC_DY: "PARAMETRIC_DY",
    PARAMETRIC_DZ: "PARAMETRIC_DZ"
});
RC.LASLoader.PDRFormat5 = class extends RC.LASLoader.PDRFormat3{
    constructor() {
        super();

        this.minSize = 63;

        Object.assign(this._inserts, {
            WAVE_PACKET_DESCRIPTOR_INDEX: new RC.LASLoader.PDRInsert("Wave Packet Descriptor Index", this._dataTypes.unsignedChar, 1, true, 34),
            BYTE_OFFSET_TO_WAVEFORM_DATA: new RC.LASLoader.PDRInsert("Byte Offset to Waveform Data", this._dataTypes.unsignedLongLong, 8, true, 35),
            WAVEFORM_PACKET_SIZE_IN_BYTES: new RC.LASLoader.PDRInsert("Waveform Packet Size in Bytes", this._dataTypes.unsignedLong, 4, true, 43),
            RETURN_POINT_WAVEFORM_LOCATION: new RC.LASLoader.PDRInsert("Return Point Waveform Location", this._dataTypes.float, 4, true, 47),
            PARAMETRIC_DX: new RC.LASLoader.PDRInsert("Parametric dx", this._dataTypes.float, 4, true, 51),
            PARAMETRIC_DY: new RC.LASLoader.PDRInsert("Parametric dy", this._dataTypes.float, 4, true, 55),
            PARAMETRIC_DZ: new RC.LASLoader.PDRInsert("Parametric dz", this._dataTypes.float, 4, true, 59)
        });
    }
};
RC.LASLoader.PDRFormat5.Keys = Object.assign({}, RC.LASLoader.PDRFormat3.Keys, {
    WAVE_PACKET_DESCRIPTOR_INDEX: "WAVE_PACKET_DESCRIPTOR_INDEX",
    BYTE_OFFSET_TO_WAVEFORM_DATA: "BYTE_OFFSET_TO_WAVEFORM_DATA",
    WAVEFORM_PACKET_SIZE_IN_BYTES: "WAVEFORM_PACKET_SIZE_IN_BYTES",
    RETURN_POINT_WAVEFORM_LOCATION: "RETURN_POINT_WAVEFORM_LOCATION",
    PARAMETRIC_DX: "PARAMETRIC_DX",
    PARAMETRIC_DY: "PARAMETRIC_DY",
    PARAMETRIC_DZ: "PARAMETRIC_DZ"
});
RC.LASLoader.PDRFormat6 = class extends RC.LASLoader.PDRFormat0{
    constructor() {
        super();

        this.minSize = 30;

        this._inserts = {
            X: new RC.LASLoader.PDRInsert("X", this._dataTypes.long, 4, true, 0),
            Y: new RC.LASLoader.PDRInsert("Y", this._dataTypes.long, 4, true, 4),
            Z: new RC.LASLoader.PDRInsert("Z", this._dataTypes.long, 4, true, 8),

            INTENSITY: new RC.LASLoader.PDRInsert("Intensity", this._dataTypes.unsignedShort, 2, false, 12),
            RETURN_NUMBER: new RC.LASLoader.PDRInsert("Return Number", this._dataTypes.unsignedChar, 1, true, 14),
            NUMBER_OR_RETURNS: new RC.LASLoader.PDRInsert("Number of Returns (Given Pulse)", this._dataTypes.unsignedChar, 1, true, 14),
            CLASSIFICATION_FLAGS: new RC.LASLoader.PDRInsert("Classification Flags", this._dataTypes.unsignedChar, 1, false, 15),
            SCANNER_CHANNEL: new RC.LASLoader.PDRInsert("Scanner Channel", this._dataTypes.unsignedChar, 1, true, 15),
            SCAN_DIRECTION_FLAG: new RC.LASLoader.PDRInsert("Scan Direction Flag", this._dataTypes.unsignedChar, 1, true, 15),
            EDGE_OF_FLIGHT_LINE: new RC.LASLoader.PDRInsert("Edge of Flight Line", this._dataTypes.unsignedChar, 1, true, 15),
            CLASSIFICATION: new RC.LASLoader.PDRInsert("Classification", this._dataTypes.unsignedChar, 1, true, 16),
            USER_DATA: new RC.LASLoader.PDRInsert("User Data", this._dataTypes.unsignedChar, 1, false, 17),
            SCAN_ANGELE: new RC.LASLoader.PDRInsert("Scan Angle", this._dataTypes.short, 2, true, 18),
            POINT_SOURCE_ID: new RC.LASLoader.PDRInsert("Point Source ID", this._dataTypes.unsignedShort, 2, true, 20),
            GPS_TIME: new RC.LASLoader.PDRInsert("GPS Time", this._dataTypes.double, 8, true, 22)
        };
    }
};
RC.LASLoader.PDRFormat6.Keys = Object.assign({}, RC.LASLoader.PDRFormat0.Keys, {
    X: "X",
    Y: "Y",
    Z: "Z",
    INTENSITY: "INTENSITY",
    RETURN_NUMBER: "RETURN_NUMBER",
    NUMBER_OR_RETURNS: "NUMBER_OR_RETURNS",
    CLASSIFICATION_FLAGS: "CLASSIFICATION_FLAGS",
    SCANNER_CHANNEL: "SCANNER_CHANNEL",
    SCAN_DIRECTION_FLAG: "SCAN_DIRECTION_FLAG",
    EDGE_OF_FLIGHT_LINE: "EDGE_OF_FLIGHT_LINE",
    CLASSIFICATION: "CLASSIFICATION",
    SCAN_ANGELE_RANK: undefined,
    USER_DATA: "USER_DATA",
    SCAN_ANGELE: "SCAN_ANGELE",
    POINT_SOURCE_ID: "POINT_SOURCE_ID",
    GPS_TIME: "GPS_TIME",
});
RC.LASLoader.PDRFormat7 = class extends RC.LASLoader.PDRFormat6{
    constructor() {
        super();

        this.minSize = 36;

        Object.assign(this._inserts, {
            RED: new RC.LASLoader.PDRInsert("Red", this._dataTypes.unsignedShort, 2, true, 30),
            GREEN: new RC.LASLoader.PDRInsert("Green", this._dataTypes.unsignedShort, 2, true, 32),
            BLUE: new RC.LASLoader.PDRInsert("Blue", this._dataTypes.unsignedShort, 2, true, 34)
        });
    }
};
RC.LASLoader.PDRFormat7.Keys = Object.assign({}, RC.LASLoader.PDRFormat6.Keys, {
    RED: "RED",
    GREEN: "GREEN",
    BLUE: "BLUE"
});
RC.LASLoader.PDRFormat8 = class extends RC.LASLoader.PDRFormat7{
    constructor() {
        super();

        this.minSize = 38;

        Object.assign(this._inserts, {
            NIR: new RC.LASLoader.PDRInsert("NIR", this._dataTypes.unsignedShort, 2, true, 36)
        });
    }
};
RC.LASLoader.PDRFormat8.Keys = Object.assign({}, RC.LASLoader.PDRFormat7.Keys, {
    NIR: "NIR"
});
RC.LASLoader.PDRFormat9 = class extends RC.LASLoader.PDRFormat6{
    constructor() {
        super();

        this.minSize = 59;

        Object.assign(this._inserts, {
            WAVE_PACKET_DESCRIPTOR_INDEX: new RC.LASLoader.PDRInsert("Wave Packet Descriptor Index", this._dataTypes.unsignedChar, 1, true, 30),
            BYTE_OFFSET_TO_WAVEFORM_DATA: new RC.LASLoader.PDRInsert("Byte Offset to Waveform Data", this._dataTypes.unsignedLongLong, 8, true, 31),
            WAVEFORM_PACKET_SIZE_IN_BYTES: new RC.LASLoader.PDRInsert("Waveform Packet Size in Bytes", this._dataTypes.unsignedLong, 4, true, 39),
            RETURN_POINT_WAVEFORM_LOCATION: new RC.LASLoader.PDRInsert("Return Point Waveform Location", this._dataTypes.float, 4, true, 43),
            PARAMETRIC_DX: new RC.LASLoader.PDRInsert("Parametric dx", this._dataTypes.float, 4, true, 47),
            PARAMETRIC_DY: new RC.LASLoader.PDRInsert("Parametric dy", this._dataTypes.float, 4, true, 51),
            PARAMETRIC_DZ: new RC.LASLoader.PDRInsert("Parametric dz", this._dataTypes.float, 4, true, 55)
        });
    }
};
RC.LASLoader.PDRFormat9.Keys = Object.assign({}, RC.LASLoader.PDRFormat6.Keys, {
    WAVE_PACKET_DESCRIPTOR_INDEX: "WAVE_PACKET_DESCRIPTOR_INDEX",
    BYTE_OFFSET_TO_WAVEFORM_DATA: "BYTE_OFFSET_TO_WAVEFORM_DATA",
    WAVEFORM_PACKET_SIZE_IN_BYTES: "WAVEFORM_PACKET_SIZE_IN_BYTES",
    RETURN_POINT_WAVEFORM_LOCATION: "RETURN_POINT_WAVEFORM_LOCATION",
    PARAMETRIC_DX: "PARAMETRIC_DX",
    PARAMETRIC_DY: "PARAMETRIC_DY",
    PARAMETRIC_DZ: "PARAMETRIC_DZ"
});
RC.LASLoader.PDRFormat10 = class extends RC.LASLoader.PDRFormat8{
    constructor() {
        super();

        this.minSize = 67;

        Object.assign(this._inserts, {
            WAVE_PACKET_DESCRIPTOR_INDEX: new RC.LASLoader.PDRInsert("Wave Packet Descriptor Index", this._dataTypes.unsignedChar, 1, true, 38),
            BYTE_OFFSET_TO_WAVEFORM_DATA: new RC.LASLoader.PDRInsert("Byte Offset to Waveform Data", this._dataTypes.unsignedLongLong, 8, true, 39),
            WAVEFORM_PACKET_SIZE_IN_BYTES: new RC.LASLoader.PDRInsert("Waveform Packet Size in Bytes", this._dataTypes.unsignedLong, 4, true, 47),
            RETURN_POINT_WAVEFORM_LOCATION: new RC.LASLoader.PDRInsert("Return Point Waveform Location", this._dataTypes.float, 4, true, 51),
            PARAMETRIC_DX: new RC.LASLoader.PDRInsert("Parametric dx", this._dataTypes.float, 4, true, 55),
            PARAMETRIC_DY: new RC.LASLoader.PDRInsert("Parametric dy", this._dataTypes.float, 4, true, 59),
            PARAMETRIC_DZ: new RC.LASLoader.PDRInsert("Parametric dz", this._dataTypes.float, 4, true, 63)
        });
    }
};
RC.LASLoader.PDRFormat10.Keys = Object.assign({}, RC.LASLoader.PDRFormat8.Keys, {
    WAVE_PACKET_DESCRIPTOR_INDEX: "WAVE_PACKET_DESCRIPTOR_INDEX",
    BYTE_OFFSET_TO_WAVEFORM_DATA: "BYTE_OFFSET_TO_WAVEFORM_DATA",
    WAVEFORM_PACKET_SIZE_IN_BYTES: "WAVEFORM_PACKET_SIZE_IN_BYTES",
    RETURN_POINT_WAVEFORM_LOCATION: "RETURN_POINT_WAVEFORM_LOCATION",
    PARAMETRIC_DX: "PARAMETRIC_DX",
    PARAMETRIC_DY: "PARAMETRIC_DY",
    PARAMETRIC_DZ: "PARAMETRIC_DZ"
});