// Copyright (c) 2018-2024, Brandon Lehmann <brandonlehmann@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import Varint from './varint';
import BigInteger from 'big-integer';
import { Readable } from 'stream';
import Reader from './reader';
import { BitSize } from './types';
import { Buffer } from 'buffer';

export default class Writer extends Readable {
    /**
     * Creates a new instance of the writer with the buffer preloaded with data if specified
     *
     * @param payload
     * @param encoding
     */
    constructor (
        payload: Reader | Writer | Buffer | Uint8Array | string = Buffer.alloc(0),
        encoding: BufferEncoding = 'hex'
    ) {
        super();

        this.append(payload, encoding);
    }

    private _buffer = Buffer.alloc(0);

    /**
     * Returns the current contents of the buffer
     */
    public get buffer (): Buffer {
        return this._buffer;
    }

    /**
     * Returns the byte size of the current buffer
     */
    public get length (): number {
        return this._buffer.length;
    }

    private _readIndex = 0;

    /** @ignore */
    private get readIndex (): number {
        return this._readIndex;
    }

    /** @ignore */
    private static determineBits (value: BigInteger.BigInteger | number): BitSize {
        if (typeof value === 'number') {
            value = BigInteger(value);
        }

        const bytes: number [] = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

        for (const byte of bytes) {
            let check = BigInteger.zero;

            if (value.greater(-1)) {
                check = BigInteger(2).pow(byte * 8)
                    .subtract(1);
            } else {
                check = BigInteger(2).pow((byte * 8) - 1)
                    .subtract(1)
                    .abs();
            }

            if (value.compare(check) <= 0) {
                return byte * 8 as BitSize;
            }
        }

        throw new RangeError('value is out of range');
    }

    /** @ignore */
    private static writeUIntBE (value: BigInteger.BigInteger, bytes: number): Buffer {
        const hex = value.toString(16).padStart(bytes * 2, '0');

        return Buffer.from(hex, 'hex');
    }

    /** @ignore */
    private static writeUIntLE (value: BigInteger.BigInteger, bytes: number): Buffer {
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

    /**
     * Clears the current write buffer
     */
    public clear () {
        this._buffer = Buffer.alloc(0);
    }

    /**
     * Writes a hash to the buffer
     *
     * @param hash
     * @param encoding
     */
    public hash (hash: Buffer | Uint8Array | string, encoding: BufferEncoding = 'hex'): Writer {
        if ((hash instanceof Buffer || hash instanceof Uint8Array) && (hash.length === 32 || hash.length === 64)) {
            return this.append(hash);
        } else if (typeof hash === 'string' && (hash.length === 64 || hash.length === 128)) {
            return this.append(hash, encoding);
        }

        throw new TypeError('hash is of wrong size and/or type');
    }

    /**
     * Writes the hex encoded value to the buffer
     *
     * @param hex
     */
    public hex (hex: Buffer | Uint8Array | string): Writer {
        if (hex instanceof Buffer || hex instanceof Uint8Array) {
            return this.append(hex);
        } else if (hex.length % 2 === 0) {
            return this.append(hex, 'hex');
        }

        throw new TypeError('hex is of the wrong size and/or type');
    }

    /**
     * Writes a signed integer to the buffer
     *
     * @param value
     * @param bits
     * @param bigEndian
     */
    public signed_integer (
        value: BigInteger.BigInteger | number,
        bits: BitSize = Writer.determineBits(value),
        bigEndian = false
    ): Writer {
        if (bits % 8 !== 0) {
            throw new RangeError('bits must be a multiple of 8');
        }

        if (typeof value === 'number') {
            value = BigInteger(value);
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
                throw new TypeError('value bit size is not supported');
        }

        return this.append(buffer);
    }

    /**
     * Writes an int8_t to the buffer
     *
     * @param value
     */
    public int8_t (value: BigInteger.BigInteger | number): Writer {
        return this.signed_integer(value, 8);
    }

    /**
     * Writes an int16_t to the buffer
     *
     * @param value
     */
    public int16_t (value: BigInteger.BigInteger | number): Writer {
        return this.signed_integer(value, 16);
    }

    /**
     * Writes an int32_t to the buffer
     *
     * @param value
     */
    public int32_t (value: BigInteger.BigInteger | number): Writer {
        return this.signed_integer(value, 32);
    }

    /**
     * Writes an int64_t to the buffer
     *
     * @param value
     */
    public int64_t (value: BigInteger.BigInteger | number): Writer {
        return this.signed_integer(value, 64);
    }

    /**
     * Writes a string to the buffer
     *
     * @param value
     * @param encoding
     */
    public string (value: string, encoding: BufferEncoding = 'utf-8'): Writer {
        const success = this.varint(value.length);

        if (!success) {
            throw new Error('could not encode string length as varint');
        }

        const buffer = Buffer.from(value, encoding);

        return this.append(buffer);
    }

    /**
     * Writes a time_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public time_t (value: Date, bigEndian = false): Writer {
        const num = BigInteger(Math.floor(value.getTime() / 1000));

        return this.uint64_t(num, !bigEndian);
    }

    /**
     * Dumps the buffer to a string
     *
     * @param encoding
     */
    public toString (encoding: BufferEncoding = 'hex'): string {
        return this.buffer.toString(encoding);
    }

    /**
     * Writes an unsigned integer to the buffer
     *
     * @param value
     * @param bits
     * @param bigEndian
     */
    public unsigned_integer (
        value: BigInteger.BigInteger | number,
        bits: BitSize = Writer.determineBits(value),
        bigEndian = false
    ): Writer {
        if (typeof value === 'number') {
            value = BigInteger(value);
        }

        if (bits % 8 !== 0) {
            throw new RangeError('bits must be a multiple of 8');
        }

        if (value.lesser(0)) {
            throw new RangeError('cannot store signed value in unsigned type');
        }

        const bytes = bits / 8;

        const buffer = bigEndian ? Writer.writeUIntBE(value, bytes) : Writer.writeUIntLE(value, bytes);

        return this.append(buffer);
    }

    /**
     * Writes an uint8_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint8_t (value: BigInteger.BigInteger | number, bigEndian = false): Writer {
        return this.unsigned_integer(value, 8, bigEndian);
    }

    /**
     * Writes an uint16_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint16_t (value: BigInteger.BigInteger | number, bigEndian = false): Writer {
        return this.unsigned_integer(value, 16, bigEndian);
    }

    /**
     * Writes an uint32_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint32_t (value: BigInteger.BigInteger | number, bigEndian = false): Writer {
        return this.unsigned_integer(value, 32, bigEndian);
    }

    /**
     * Writes an uint64_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint64_t (value: BigInteger.BigInteger | number, bigEndian = false): Writer {
        return this.unsigned_integer(value, 64, bigEndian);
    }

    /**
     * Writes an uint128_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint128_t (value: BigInteger.BigInteger | number, bigEndian = false): Writer {
        return this.unsigned_integer(value, 128, bigEndian);
    }

    /**
     * Writes an uint256_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint256_t (value: BigInteger.BigInteger | number, bigEndian = false): Writer {
        return this.unsigned_integer(value, 256, bigEndian);
    }

    /**
     * Writes an uint512_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint512_t (value: BigInteger.BigInteger | number, bigEndian = false): Writer {
        return this.unsigned_integer(value, 512, bigEndian);
    }

    /**
     * Writes a Varint to the buffer
     *
     * @param value
     * @param levin
     */
    public varint (value: BigInteger.BigInteger | number, levin = false): Writer {
        if (typeof value === 'number') {
            value = BigInteger(value);
        }

        if (!levin) {
            return this.append(Buffer.from(Varint.encode(value)));
        } else {
            if (value.greater(BigInteger('1073741823'))) {
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
                this.uint8_t((tempValue >> i * 8) & 0xFF);
            }

            return this;
        }
    }

    /**
     * Writes the supplied value to the buffer
     *
     * @param payload
     * @param encoding
     */
    public append (
        payload: Reader | Writer | Buffer | Uint8Array | string,
        encoding: BufferEncoding = 'hex'
    ): Writer {
        let buffer: Buffer;

        if (payload instanceof Reader || payload instanceof Writer) {
            buffer = payload.buffer;
        } else if (payload instanceof Buffer) {
            buffer = payload;
        } else if (payload instanceof Uint8Array) {
            buffer = Buffer.from(payload);
        } else {
            buffer = Buffer.from(payload, encoding);
        }

        this._buffer = Buffer.concat([this._buffer, buffer]);

        return this;
    }

    /**
     * Writes the specified bytes to the buffer
     *
     * @param value
     */
    public bytes (value: Buffer | Uint8Array): Writer {
        return this.append(value);
    }
}
