// Copyright (c) 2018-2022 Brandon Lehmann
//
// Please see the included LICENSE file for more information.

import Varint, { BigInteger, BytePackBigInt } from './varint';
import { Readable } from 'stream';
import Reader from './reader';
import { BitSize } from './types';

export default class Writer extends Readable {
    private _buffer = Buffer.alloc(0);

    public get buffer (): Buffer {
        return this._buffer;
    }

    public get length (): number {
        return this._buffer.length;
    }

    private _readIndex = 0;

    private get readIndex (): number {
        return this._readIndex;
    }

    /** @ignore */
    private static determineBits (value: BigInteger | number): BitSize {
        if (typeof value === 'number') {
            value = BytePackBigInt(value);
        }

        const bytes: number [] = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

        for (const byte of bytes) {
            let check = BytePackBigInt.zero;

            if (value.greater(-1)) {
                check = BytePackBigInt(2).pow(byte * 8)
                    .subtract(1);
            } else {
                check = BytePackBigInt(2).pow((byte * 8) - 1)
                    .subtract(1)
                    .abs();
            }

            if (value.compare(check) <= 0) {
                return byte * 8 as BitSize;
            }
        }

        throw new RangeError('value is out of range');
    }

    private static writeUIntBE (value: BigInteger, bytes: number): Buffer {
        const hex = value.toString(16).padStart(bytes * 2, '0');

        return Buffer.from(hex, 'hex');
    }

    private static writeUIntLE (value: BigInteger, bytes: number): Buffer {
        const hex = value.toString(16).padStart(bytes * 2, '0');

        const buffer = Buffer.from(hex, 'hex');

        const tempBuffer = Buffer.alloc(bytes);

        let position = bytes - 1;

        for (const slice of buffer) {
            tempBuffer[position] = slice;

            position -= 1;
        }

        return tempBuffer;
    }

    /** @ignore */
    public _read (size: number) {
        let okToSend = true;

        while (okToSend) {
            let slice: Buffer = Buffer.alloc(0);

            if (this.readIndex + size > this.length) {
                slice = this._buffer.slice(this.readIndex);
            } else {
                slice = this._buffer.slice(this.readIndex, this.readIndex + size);
            }

            if (slice.length > 0) {
                this.push(slice);
            } else {
                this.push(null);

                okToSend = false;
            }

            this._readIndex += slice.length;
        }
    }

    public clear () {
        this._buffer = Buffer.alloc(0);
    }

    public hash (hash: Buffer | string, encoding: BufferEncoding = 'hex'): boolean {
        if (hash instanceof Buffer && (hash.length === 32 || hash.length === 64)) {
            return this.write(hash);
        } else if (typeof hash === 'string' && (hash.length === 64 || hash.length === 128)) {
            return this.write(hash, encoding);
        }

        return false;
    }

    public hex (hex: Buffer | string, encoding: BufferEncoding = 'hex'): boolean {
        if (hex instanceof Buffer) {
            return this.write(hex);
        } else if (hex.length % 2 === 0) {
            return this.write(hex, encoding);
        }

        return false;
    }

    public integer (
        value: BigInteger | number,
        bits: BitSize = Writer.determineBits(value),
        bigEndian = false
    ): boolean {
        if (bits % 8 !== 0) {
            throw new RangeError('bits must be a multiple of 8');
        }

        if (typeof value === 'number') {
            value = BytePackBigInt(value);
        }

        const bytes = bits / 8;

        const buffer = Buffer.alloc(bytes);

        switch (bytes) {
            case 1:
                buffer.writeInt8(value.toJSNumber(), 0);
                break;
            case 2:
                (bigEndian ? buffer.writeInt16BE : buffer.writeInt16LE)(value.toJSNumber(), 0);
                break;
            case 4:
                (bigEndian ? buffer.writeInt32BE : buffer.writeInt32LE)(value.toJSNumber(), 0);
                break;
            case 8:
                (bigEndian ? buffer.writeBigInt64BE : buffer.writeBigInt64LE)(BigInt(value.toString()), 0);
                break;
            default:
                return false;
        }

        return this.write(buffer);
    }

    public int8_t (value: BigInteger | number): boolean {
        return this.integer(value, 8);
    }

    public int16_t (value: BigInteger | number): boolean {
        return this.integer(value, 16);
    }

    public int32_t (value: BigInteger | number): boolean {
        return this.integer(value, 32);
    }

    public int64_t (value: BigInteger | number): boolean {
        return this.integer(value, 64);
    }

    public string (value: string, encoding: BufferEncoding = 'utf-8'): boolean {
        const success = this.varint(value.length);

        const buffer = Buffer.from(value, encoding);

        return success && this.write(buffer);
    }

    public time_t (value: Date, bigEndian = false): boolean {
        const num = BytePackBigInt(Math.floor(value.getTime() / 1000));

        return this.uint64_t(num, !bigEndian);
    }

    public toString (encoding: BufferEncoding = 'hex'): string {
        return this.buffer.toString(encoding);
    }

    public unsigned_integer (
        value: BigInteger | number,
        bits: BitSize = Writer.determineBits(value),
        bigEndian = false
    ): boolean {
        if (typeof value === 'number') {
            value = BytePackBigInt(value);
        }

        if (bits % 8 !== 0) {
            throw new RangeError('bits must be a multiple of 8');
        }

        if (value.lesser(0)) {
            throw new RangeError('cannot store signed value in unsigned type');
        }

        const bytes = bits / 8;

        const buffer = bigEndian ? Writer.writeUIntBE(value, bytes) : Writer.writeUIntLE(value, bytes);

        return this.write(buffer);
    }

    public uint8_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 8, bigEndian);
    }

    public uint16_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 16, bigEndian);
    }

    public uint32_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 32, bigEndian);
    }

    public uint64_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 64, bigEndian);
    }

    public uint128_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 128, bigEndian);
    }

    public uint256_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 256, bigEndian);
    }

    public uint512_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 512, bigEndian);
    }

    public varint (value: BigInteger | number, levin = false): boolean {
        if (typeof value === 'number') {
            value = BytePackBigInt(value);
        }

        if (!levin) {
            this.write(Buffer.from(Varint.encode(value)));

            return true;
        } else {
            if (value.greater(BytePackBigInt('1073741823'))) {
                throw new RangeError('value out of range');
            }

            value = value.toJSNumber();

            let tempValue = value << 2;

            let byteCount = 0;

            if (value <= 63) {
                tempValue |= 0;
                byteCount = 1;
            } else if (value <= 16383) {
                tempValue |= 1;
                byteCount = 2;
            } else {
                tempValue |= 2;
                byteCount = 4;
            }

            for (let i = 0; i < byteCount; i++) {
                if (!this.uint8_t((tempValue >> i * 8) & 0xFF)) {
                    return false;
                }
            }

            return true;
        }
    }

    public write (
        payload: Buffer | Writer | Reader | Uint8Array | string,
        encoding: BufferEncoding = 'hex'
    ): boolean {
        const write = (buffer: Buffer): boolean => {
            this._buffer = Buffer.concat([this._buffer, buffer]);

            return true;
        };

        if (payload instanceof Writer) {
            return write(payload.buffer);
        } else if (payload instanceof Reader) {
            return write(payload.buffer);
        } else if (payload instanceof Buffer) {
            return write(payload);
        } else if (typeof payload === 'string') {
            return write(Buffer.from(payload, encoding));
        } else { // if it's not a string, it needs to be
            return write(Buffer.from(JSON.stringify(payload)));
        }
    }
}
