// Copyright (c) 2018-2022 Brandon Lehmann
//
// Please see the included LICENSE file for more information.

import Varint, { BigInteger, BytePackBigInt } from './varint';
import Writer from './writer';
import { Writable } from 'stream';
import { BitSize, HashBytesSize } from './types';

export default class Reader extends Writable {
    private _current_offset = 0;

    constructor (
        blob: Reader | Writer | Buffer | Uint8Array | string = Buffer.alloc(0),
        encoding: BufferEncoding = 'hex'
    ) {
        super();

        this.append(blob, encoding);
    }

    private _buffer = Buffer.alloc(0);

    public get buffer (): Buffer {
        return this._buffer;
    }

    public get length (): number {
        return this._buffer.length;
    }

    public get offset (): number {
        return this._current_offset;
    }

    public get unreadBytes (): number {
        const unread = this.length - this.offset;

        return unread >= 0 ? unread : 0;
    }

    public get unreadBuffer (): Buffer {
        return this.buffer.slice(this.offset);
    }

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

    public append (
        blob: Reader | Writer | Buffer | Uint8Array | string,
        encoding: BufferEncoding = 'hex'
    ) {
        let buffer: Buffer;

        if (blob instanceof Reader) {
            buffer = blob.buffer;
        } else if (blob instanceof Writer) {
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

    public bytes (count = 1): Buffer {
        if (this.unreadBytes < count) {
            throw new RangeError(`Requested ${count} bytes but only ${this.unreadBytes} bytes remain`);
        }

        const start = this.offset;

        this._current_offset += count;

        return this._buffer.slice(start, this.offset);
    }

    public compact (offset = this.offset) {
        this._buffer = this._buffer.slice(offset);

        this._current_offset = 0;
    }

    public hash (size: HashBytesSize = 32, encoding: BufferEncoding = 'hex'): string {
        return this.bytes(size).toString(encoding);
    }

    public hex (count = 1, encoding: BufferEncoding = 'hex'): string {
        return this.bytes(count).toString(encoding);
    }

    public integer (bits: BitSize, bigEndian = false): BigInteger {
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

    public int8_t (): BigInteger {
        return this.integer(8);
    }

    public int16_t (bigEndian = false): BigInteger {
        return this.integer(16, bigEndian);
    }

    public int32_t (bigEndian = false): BigInteger {
        return this.integer(32, bigEndian);
    }

    public int64_t (bigEndian = false): BigInteger {
        return this.integer(64, bigEndian);
    }

    public reset (offset = 0) {
        this._current_offset = offset;
    }

    public skip (count = 1) {
        this._current_offset += count;
    }

    public string (encoding: BufferEncoding = 'utf-8'): string {
        const length = this.varint().toJSNumber();

        return this.bytes(length).toString(encoding);
    }

    public time_t (bigEndian = false): Date {
        const epoch = this.uint64_t(!bigEndian).toJSNumber();

        return new Date(epoch * 1_000);
    }

    public toString (encoding: BufferEncoding = 'hex'): string {
        return this._buffer.toString(encoding);
    }

    public unsigned_integer (bits: BitSize, bigEndian = false): BigInteger {
        if (bits % 8 !== 0) {
            throw new RangeError('bits must be a multiple of 8');
        }

        const bytes = bits / 8;

        return bigEndian
            ? Reader.readUIntBE(this.bytes(bytes), bytes)
            : Reader.readUIntLE(this.bytes(bytes), bytes);
    }

    public uint8_t (): BigInteger {
        return this.unsigned_integer(8);
    }

    public uint16_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(16, bigEndian);
    }

    public uint32_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(32, bigEndian);
    }

    public uint64_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(64, bigEndian);
    }

    public uint128_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(128, bigEndian);
    }

    public uint256_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(256, bigEndian);
    }

    public uint512_t (bigEndian = false): BigInteger {
        return this.unsigned_integer(512, bigEndian);
    }

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
