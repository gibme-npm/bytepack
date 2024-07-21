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

import BigInteger from 'big-integer';
import { Buffer } from 'buffer';

export default abstract class Varint {
    /**
     * Decodes a varint from a buffer
     *
     * @param buffer
     */
    public static decode (buffer: Buffer): BigInteger.BigInteger {
        let counter = 0;

        let shift = 0;

        let b: number;

        let result = BigInteger.zero;

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
    public static encode (value: BigInteger.BigInteger | number): Buffer {
        if (typeof value === 'number') {
            value = BigInteger.zero.add(value);
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
