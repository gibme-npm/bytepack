// Copyright (c) 2018-2022 Brandon Lehmann
//
// Please see the included LICENSE file for more information.

import BytePackBigInt from 'big-integer';

export type BigInteger = BytePackBigInt.BigInteger;
export { BytePackBigInt };

export default class Varint {
    /**
     * Decodes a varint from a buffer
     *
     * @param buffer
     */
    public static decode (buffer: Buffer): BigInteger {
        let counter = 0;

        let shift = 0;

        let b: number;

        let result = BytePackBigInt.zero;

        do {
            if (counter >= buffer.length) {
                throw new RangeError('Could not decode varint');
            }

            b = buffer[counter++];

            const value = (shift < 28) ? (b & 0x7f) << shift : (b & 0x7f) * Math.pow(2, shift);

            result = result.add(value);

            shift += 7;
        } while (b >= 0x80);

        return result;
    }

    /**
     * Encodes a value into a varint encoded buffer
     *
     * @param value
     */
    public static encode (value: BigInteger | number): Buffer {
        if (typeof value === 'number') {
            value = BytePackBigInt.zero.add(value);
        }

        const out = [];

        let offset = 0;

        while (value.greaterOrEquals(Math.pow(2, 31))) {
            out[offset++] = value.and(0xFF).or(0x80).toJSNumber();

            value = value.divide(128);
        }

        while (value.and(~0x7F).greater(0)) {
            out[offset++] = value.and(0xFF).or(0x80).toJSNumber();

            value = value.shiftRight(7);
        }

        out[offset] = value.or(0).toJSNumber();

        return Buffer.from(out);
    }
}
