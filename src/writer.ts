// Copyright (c) 2018-2022, Brandon Lehmann <brandonlehmann@gmail.com>
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

import Varint, { BigInteger, BytePackBigInt } from './varint';
import { Readable } from 'stream';
import Reader from './reader';
import { BitSize } from './types';

export default class Writer extends Readable {
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

    /** @ignore */
    private static writeUIntBE (value: BigInteger, bytes: number): Buffer {
        const hex = value.toString(16).padStart(bytes * 2, '0');

        return Buffer.from(hex, 'hex');
    }

    /** @ignore */
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
    public hash (hash: Buffer | string, encoding: BufferEncoding = 'hex'): boolean {
        if (hash instanceof Buffer && (hash.length === 32 || hash.length === 64)) {
            return this.write(hash);
        } else if (typeof hash === 'string' && (hash.length === 64 || hash.length === 128)) {
            return this.write(hash, encoding);
        }

        return false;
    }

    /**
     * Writes the hex encoded value to the buffer
     *
     * @param hex
     */
    public hex (hex: Buffer | string): boolean {
        if (hex instanceof Buffer) {
            return this.write(hex);
        } else if (hex.length % 2 === 0) {
            return this.write(hex, 'hex');
        }

        return false;
    }

    /**
     * Writes a signed integer to the buffer
     *
     * @param value
     * @param bits
     * @param bigEndian
     */
    public signed_integer (
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

    /**
     * Writes an int8_t to the buffer
     *
     * @param value
     */
    public int8_t (value: BigInteger | number): boolean {
        return this.signed_integer(value, 8);
    }

    /**
     * Writes an int16_t to the buffer
     *
     * @param value
     */
    public int16_t (value: BigInteger | number): boolean {
        return this.signed_integer(value, 16);
    }

    /**
     * Writes an int32_t to the buffer
     *
     * @param value
     */
    public int32_t (value: BigInteger | number): boolean {
        return this.signed_integer(value, 32);
    }

    /**
     * Writes an int64_t to the buffer
     *
     * @param value
     */
    public int64_t (value: BigInteger | number): boolean {
        return this.signed_integer(value, 64);
    }

    /**
     * Writes a string to the buffer
     *
     * @param value
     * @param encoding
     */
    public string (value: string, encoding: BufferEncoding = 'utf-8'): boolean {
        const success = this.varint(value.length);

        const buffer = Buffer.from(value, encoding);

        return success && this.write(buffer);
    }

    /**
     * Writes a time_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public time_t (value: Date, bigEndian = false): boolean {
        const num = BytePackBigInt(Math.floor(value.getTime() / 1000));

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

    /**
     * Writes an uint8_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint8_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 8, bigEndian);
    }

    /**
     * Writes an uint16_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint16_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 16, bigEndian);
    }

    /**
     * Writes an uint32_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint32_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 32, bigEndian);
    }

    /**
     * Writes an uint64_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint64_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 64, bigEndian);
    }

    /**
     * Writes an uint128_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint128_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 128, bigEndian);
    }

    /**
     * Writes an uint256_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint256_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 256, bigEndian);
    }

    /**
     * Writes an uint512_t to the buffer
     *
     * @param value
     * @param bigEndian
     */
    public uint512_t (value: BigInteger | number, bigEndian = false): boolean {
        return this.unsigned_integer(value, 512, bigEndian);
    }

    /**
     * Writes a Varint to the buffer
     *
     * @param value
     * @param levin
     */
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

    /**
     * Writes the supplied value to the buffer
     *
     * @param payload
     * @param encoding
     */
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

    /**
     * Writes the specified bytes to the buffer
     *
     * @param value
     */
    public bytes (value: Buffer | Uint8Array): boolean {
        return this.write(value);
    }
}
