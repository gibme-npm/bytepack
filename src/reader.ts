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
import Writer from './writer';
import { Writable } from 'stream';
import { BitSize, HashBytesSize } from './types';

export default class Reader extends Writable {
    private _current_offset = 0;

    /**
     * Creates a new instance of the reader
     *
     * @param blob
     * @param encoding
     */
    constructor (
        blob: Reader | Writer | Buffer | Uint8Array | string = Buffer.alloc(0),
        encoding: BufferEncoding = 'hex'
    ) {
        super();

        this.append(blob, encoding);
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

    /**
     * Returns the current read offset of the buffer
     */
    public get offset (): number {
        return this._current_offset;
    }

    /**
     * Returns the number of unread bytes left in the buffer
     */
    public get unreadBytes (): number {
        const unread = this.length - this.offset;

        return unread >= 0 ? unread : 0;
    }

    /**
     * Returns the unread portion of the buffer
     */
    public get unreadBuffer (): Buffer {
        return this.buffer.slice(this.offset);
    }

    /** @ignore */
    private static readUIntBE (
        buffer: Buffer,
        bytes: number,
        offset = 0,
        noAssert = false
    ): BigInteger {
        if (buffer.length < offset + bytes) {
            if (noAssert) {
                return BytePackBigInt.zero;
            }

            throw new RangeError('Out of bounds');
        }

        const slice = buffer.slice(offset, offset + bytes);

        return BytePackBigInt(slice.toString('hex'), 16);
    }

    /** @ignore */
    private static readUIntLE (
        buffer: Buffer,
        bytes: number,
        offset = 0,
        noAssert = false
    ): BigInteger {
        if (buffer.length < offset + bytes) {
            if (noAssert) {
                return BytePackBigInt.zero;
            }

            throw new RangeError('Out of bounds');
        }

        const buf = buffer.slice(offset, offset + bytes);

        const tempBuffer = Buffer.alloc(bytes);

        let position = bytes - 1;

        for (const slice of buf) {
            tempBuffer[position] = slice;

            position -= 1;
        }

        return BytePackBigInt(tempBuffer.toString('hex'), 16);
    }

    /** @ignore */
    public _write (
        chunk: Buffer | Uint8Array | string,
        encoding: BufferEncoding,
        callback: () => void
    ) {
        this.append(chunk);

        callback();
    }

    /**
     * Appends the supplied value to the end of the buffer
     *
     * @param blob
     * @param encoding
     */
    public append (
        blob: Reader | Writer | Buffer | Uint8Array | string,
        encoding: BufferEncoding = 'hex'
    ) {
        let buffer: Buffer;

        if (blob instanceof Reader || blob instanceof Writer) {
            buffer = blob.buffer;
        } else if (blob instanceof Buffer) {
            buffer = blob;
        } else if (blob instanceof Uint8Array) {
            buffer = Buffer.from(blob);
        } else if (blob.length % 2 === 0) {
            buffer = Buffer.from(blob, encoding);
        } else {
            throw new Error('Unknown data type');
        }

        this._buffer = Buffer.concat([this._buffer, buffer]);
    }

    /**
     * Read the specified number of bytes from the buffer
     *
     * @param count
     */
    public bytes (count = 1): Buffer {
        if (this.unreadBytes < count) {
            throw new RangeError(`Requested ${count} bytes but only ${this.unreadBytes} bytes remain`);
        }

        const start = this.offset;

        this._current_offset += count;

        return this._buffer.slice(start, this.offset);
    }

    /**
     * Compacts the current buffer by truncating up to the unread position of the buffer
     *
     * @param offset
     */
    public compact (offset = this.offset) {
        this._buffer = this._buffer.slice(offset);

        this._current_offset = 0;
    }

    /**
     * Reads a hash from the buffer
     *
     * @param size
     * @param encoding
     */
    public hash (size: HashBytesSize = 32, encoding: BufferEncoding = 'hex'): string {
        return this.bytes(size).toString(encoding);
    }

    /**
     * Reads the specified number of hex encoded bytes from the buffer
     *
     * @param count
     * @param encoding
     */
    public hex (count = 1, encoding: BufferEncoding = 'hex'): string {
        return this.bytes(count).toString(encoding);
    }

    /**
     * Reads a signed integer from the buffer
     *
     * @param bits
     * @param bigEndian
     */
    public signed_integer (bits: BitSize, bigEndian = false): BigInteger {
        if (bits % 8 !== 0) {
            throw new RangeError('bits must be a multiple of 8');
        }

        const bytes = bits / 8;

        const result = this.bytes(bytes);

        switch (bytes) {
            case 1:
                return BytePackBigInt(result.readInt8());
            case 2:
                return BytePackBigInt(bigEndian ? result.readInt16BE() : result.readInt16LE());
            case 4:
                return BytePackBigInt(bigEndian ? result.readInt32BE() : result.readInt32LE());
            case 8:
                return BytePackBigInt(bigEndian ? result.readBigInt64BE() : result.readBigInt64LE());
            default:
                throw new RangeError('Data type');
        }
    }

    /**
     * Reads an int8_t from the buffer
     */
    public int8_t (): BigInteger {
        return this.signed_integer(8);
    }

    /**
     * Reads an int16_t from the buffer
     *
     * @param bigEndian
     */
    public int16_t (bigEndian = false): BigInteger {
        return this.signed_integer(16, bigEndian);
    }

    /**
     * Reads an int32_t from the buffer
     *
     * @param bigEndian
     */
    public int32_t (bigEndian = false): BigInteger {
        return this.signed_integer(32, bigEndian);
    }

    /**
     * Reads an int64_t from the buffer
     *
     * @param bigEndian
     */
    public int64_t (bigEndian = false): BigInteger {
        return this.signed_integer(64, bigEndian);
    }

    /**
     * Resets the current position of the buffer back to the beginning
     *
     * @param offset
     */
    public reset (offset = 0) {
        this._current_offset = offset;
    }

    /**
     * Skips reading the specified number of bytes from the buffer
     *
     * @param count
     */
    public skip (count = 1) {
        this._current_offset += count;
    }

    /**
     * Reads a string from the buffer
     *
     * @param encoding
     */
    public string (encoding: BufferEncoding = 'utf-8'): string {
        const length = this.varint().toJSNumber();

        return this.bytes(length).toString(encoding);
    }

    /**
     * Reads a time_t from the buffer
     *
     * @param bigEndian
     */
    public time_t (bigEndian = false): Date {
        const epoch = this.uint64_t(!bigEndian).toJSNumber();

        return new Date(epoch * 1_000);
    }

    /**
     * Returns the current contents of the buffer as a string
     *
     * @param encoding
     */
    public toString (encoding: BufferEncoding = 'hex'): string {
        return this._buffer.toString(encoding);
    }

    /**
     * Reads an unsigned integer from the buffer
     *
     * @param bits
     * @param bigEndian
     */
    public unsigned_integer (bits: BitSize, bigEndian = false): BigInteger {
        if (bits % 8 !== 0) {
            throw new RangeError('bits must be a multiple of 8');
        }

        const bytes = bits / 8;

        return bigEndian
            ? Reader.readUIntBE(this.bytes(bytes), bytes)
            : Reader.readUIntLE(this.bytes(bytes), bytes);
    }

    /**
     * Reads an uint8_t from the buffer
     */
    public uint8_t (): BigInteger {
        return this.unsigned_integer(8);
    }

    /**
     * Reads an uint16_t from the buffer
     *
     * @param bigEndian
     */
    public uint16_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(16, bigEndian);
    }

    /**
     * Reads an uint32_t from the buffer
     *
     * @param bigEndian
     */
    public uint32_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(32, bigEndian);
    }

    /**
     * Reads an uint64_t from the buffer
     *
     * @param bigEndian
     */
    public uint64_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(64, bigEndian);
    }

    /**
     * Reads an uint128_t from the buffer
     *
     * @param bigEndian
     */
    public uint128_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(128, bigEndian);
    }

    /**
     * Reads an uint256_t from the buffer
     *
     * @param bigEndian
     */
    public uint256_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(256, bigEndian);
    }

    /**
     * Reads an uint512_t from the buffer
     *
     * @param bigEndian
     */
    public uint512_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(512, bigEndian);
    }

    /**
     * Reads a Varint from the buffer
     *
     * @param peek
     * @param levin
     */
    public varint (peek = false, levin = false): BigInteger {
        const start = this._current_offset;

        if (!levin) {
            do {
                if (this.buffer.readUInt8(this._current_offset) < 128) {
                    this._current_offset++;

                    const tmp = this.buffer.slice(start, this.offset);

                    if (peek) {
                        this._current_offset = start;
                    }
                    return Varint.decode(tmp);
                }

                this._current_offset++;
            } while (true);
        } else {
            let value: BigInteger | number = this.uint8_t().toJSNumber();

            const sizeMask = value & 0x03;

            value = BytePackBigInt(value);

            let bytesLeft = 0;

            switch (sizeMask) {
                case 0:
                    bytesLeft = 0;
                    break;
                case 1:
                    bytesLeft = 1;
                    break;
                case 2:
                    bytesLeft = 3;
                    break;
                case 3:
                    bytesLeft = 7;
                    break;
            }

            for (let i = 1; i <= bytesLeft; ++i) {
                const nv = this.uint8_t().shiftLeft(i * 8);
                value = value.or(nv);
            }

            return value.shiftRight(2);
        }
    }
}
