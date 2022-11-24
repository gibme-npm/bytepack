// Copyright (c) 2018-2022 Brandon Lehmann
//
// Please see the included LICENSE file for more information.

import assert from 'assert';
import { describe, it } from 'mocha';
import { Reader, Writer, BytePackBigInt } from '../src/bytepack';
import { format } from 'util';

describe('string', () => {
    it('The quick brown fox jumped over the lazy dog.', () => {
        const str = 'The quick brown fox jumped over the lazy dog.';

        const w = new Writer();
        w.string(str);

        const r = new Reader(w);

        assert(r.string() === str);
    });
});

describe('hash', () => {
    it('7fb97df81221dd1366051b2d0bc7f49c66c22ac4431d879c895b06d66ef66f4c', () => {
        const value = '7fb97df81221dd1366051b2d0bc7f49c66c22ac4431d879c895b06d66ef66f4c';

        const w = new Writer();
        w.hash(value);

        const r = new Reader(w);

        assert(r.hash() === value);
    });
});

describe('time_t [little-endian]', () => {
    it('Wed Dec 25 2019 08:54:36 GMT-0500 (Eastern Standard Time)', () => {
        const date = new Date(1577282076 * 1000);
        const hex = '000000005e036a1c';

        const w = new Writer();
        w.time_t(date);

        assert(w.toString() === hex);

        const r = new Reader(w);

        assert.deepEqual(r.time_t(), date);
    });

    it('Wed Dec 25 2019 08:54:13 GMT-0500 (Eastern Standard Time)', () => {
        const date = new Date(1577282053 * 1000);
        const hex = '000000005e036a05';

        const w = new Writer();
        w.time_t(date);

        assert(w.toString() === hex);

        const r = new Reader(w);

        assert.deepEqual(r.time_t(), date);
    });

    it('Tue Dec 24 2019 15:24:29 GMT-0500 (Eastern Standard Time)', () => {
        const date = new Date(1577219069 * 1000);
        const hex = '000000005e0273fd';

        const w = new Writer();
        w.time_t(date);

        assert(w.toString() === hex);

        const r = new Reader(w);

        assert.deepEqual(r.time_t(), date);
    });

    it('Fri Jan 31 2020 13:17:32 GMT-0500 (Eastern Standard Time) [with ms]', () => {
        const date = new Date(1580494652032);
        const hex = '000000005e346f3c';

        const w = new Writer();
        w.time_t(date);

        assert(w.toString() === hex);

        const r = new Reader(w);

        const left = r.time_t().getTime() / 1000;
        const right = Math.floor(date.getTime() / 1000);

        assert(left === right);
    });
});

describe('time_t [big-endian]', () => {
    it('Wed Dec 25 2019 08:54:36 GMT-0500 (Eastern Standard Time)', () => {
        const date = new Date(1577282076 * 1000);
        const hex = '1c6a035e00000000';

        const w = new Writer();
        w.time_t(date, true);

        assert(w.toString() === hex);

        const r = new Reader(w);

        assert.deepEqual(r.time_t(true), date);
    });

    it('Wed Dec 25 2019 08:54:13 GMT-0500 (Eastern Standard Time)', () => {
        const date = new Date(1577282053 * 1000);
        const hex = '056a035e00000000';

        const w = new Writer();
        w.time_t(date, true);

        assert(w.toString() === hex);

        const r = new Reader(w);

        assert.deepEqual(r.time_t(true), date);
    });

    it('Tue Dec 24 2019 15:24:29 GMT-0500 (Eastern Standard Time)', () => {
        const date = new Date(1577219069 * 1000);
        const hex = 'fd73025e00000000';

        const w = new Writer();
        w.time_t(date, true);

        assert(w.toString() === hex);

        const r = new Reader(w);

        assert.deepEqual(r.time_t(true), date);
    });

    it('Fri Jan 31 2020 13:17:32 GMT-0500 (Eastern Standard Time) [with ms]', () => {
        const date = new Date(1580494652032);
        const hex = '3c6f345e00000000';

        const w = new Writer();
        w.time_t(date, true);

        assert(w.toString() === hex);

        const r = new Reader(w);

        const left = r.time_t(true).getTime() / 1000;
        const right = Math.floor(date.getTime() / 1000);

        assert(left === right);
    });
});

describe('uint8_t', () => {
    it('0', () => {
        const value = 0;

        const w = new Writer();
        w.uint8_t(value);

        const r = new Reader(w);

        assert(r.uint8_t().toJSNumber() === value);
    });

    it('127', () => {
        const value = 127;

        const w = new Writer();
        w.uint8_t(value);

        const r = new Reader(w);

        assert(r.uint8_t().toJSNumber() === value);
    });

    it('255', () => {
        const value = 255;

        const w = new Writer();
        w.uint8_t(value);

        const r = new Reader(w);

        assert(r.uint8_t().toJSNumber() === value);
    });
});

describe('uint16_t', () => {
    it('0', () => {
        const value = 0;

        const w = new Writer();
        w.uint16_t(value);

        const r = new Reader(w);

        assert(r.uint16_t().toJSNumber() === value);
    });

    it('32767', () => {
        const value = 32767;

        const w = new Writer();
        w.uint16_t(value);

        const r = new Reader(w);

        assert(r.uint16_t().toJSNumber() === value);
    });

    it('65535', () => {
        const value = 65535;

        const w = new Writer();
        w.uint16_t(value);

        const r = new Reader(w);

        assert(r.uint16_t().toJSNumber() === value);
    });
});

describe('uint32_t', () => {
    it('0', () => {
        const value = 0;

        const w = new Writer();
        w.uint32_t(value);

        const r = new Reader(w);

        assert(r.uint32_t().toJSNumber() === value);
    });

    it('2147483647', () => {
        const value = 2147483647;

        const w = new Writer();
        w.uint32_t(value);

        const r = new Reader(w);

        assert(r.uint32_t().toJSNumber() === value);
    });

    it('4294967295', () => {
        const value = 4294967295;

        const w = new Writer();
        w.uint32_t(value);

        const r = new Reader(w);

        assert(r.uint32_t().toJSNumber() === value);
    });
});

describe('uint64_t [little-endian]', () => {
    it('0', () => {
        const value = 0;

        const w = new Writer();
        w.uint64_t(value);

        const r = new Reader(w);

        assert(r.uint64_t().toJSNumber() === value);
    });

    it('65535', () => {
        const value = 65535;

        const w = new Writer();
        w.uint64_t(value);

        const r = new Reader(w);

        assert(r.uint64_t().toJSNumber() === value);
    });

    it('2147483647', () => {
        const value = 2147483647;

        const w = new Writer();
        w.uint64_t(value);

        const r = new Reader(w);

        assert(r.uint64_t().toJSNumber() === value);
    });

    it('4294967295', () => {
        const value = 4294967295;

        const w = new Writer();
        w.uint64_t(value);

        const r = new Reader(w);

        assert(r.uint64_t().toJSNumber() === value);
    });

    it(Number.MAX_SAFE_INTEGER.toString() + ' [max safe integer]', () => {
        const value = Number.MAX_SAFE_INTEGER;

        const w = new Writer();
        w.uint64_t(value);

        const r = new Reader(w);

        assert(r.uint64_t().toJSNumber() === value);
    });

    it('9223372036854775807', () => {
        const value = BytePackBigInt('9223372036854775807');

        const w = new Writer();
        w.uint64_t(value);

        const r = new Reader(w);

        assert.deepEqual(r.uint64_t(), value);
    });

    it('18446744073709551615', () => {
        const value = BytePackBigInt('18446744073709551615');

        const w = new Writer();
        w.uint64_t(value);

        const r = new Reader(w);

        assert.deepEqual(r.uint64_t(), value);
    });
});

describe('uint64_t [big-endian]', () => {
    it('0', () => {
        const value = 0;

        const w = new Writer();
        w.uint64_t(value, true);

        const r = new Reader(w);

        assert(r.uint64_t(true).toJSNumber() === value);
    });

    it('65535', () => {
        const value = 65535;

        const w = new Writer();
        w.uint64_t(value, true);

        const r = new Reader(w);

        assert(r.uint64_t(true).toJSNumber() === value);
    });

    it('2147483647', () => {
        const value = 2147483647;

        const w = new Writer();
        w.uint64_t(value, true);

        const r = new Reader(w);

        assert(r.uint64_t(true).toJSNumber() === value);
    });

    it('4294967295', () => {
        const value = 4294967295;

        const w = new Writer();
        w.uint64_t(value, true);

        const r = new Reader(w);

        assert(r.uint64_t(true).toJSNumber() === value);
    });

    it(Number.MAX_SAFE_INTEGER.toString() + ' [max safe integer]', () => {
        const value = Number.MAX_SAFE_INTEGER;

        const w = new Writer();
        w.uint64_t(value, true);

        const r = new Reader(w);

        assert(r.uint64_t(true).toJSNumber() === value);
    });

    it('9223372036854775807', () => {
        const value = BytePackBigInt('9223372036854775807');

        const w = new Writer();
        w.uint64_t(value, true);

        const r = new Reader(w);

        assert.deepEqual(r.uint64_t(true), value);
    });

    it('18446744073709551615', () => {
        const value = BytePackBigInt('18446744073709551615');

        const w = new Writer();
        w.uint64_t(value, true);

        const r = new Reader(w);

        assert.deepEqual(r.uint64_t(true), value);
    });
});

describe('varint', () => {
    it('0', () => {
        const value = 0;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === '00');
        assert(r.varint().toJSNumber() === value);
    });

    it('127', () => {
        const value = 127;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === '7f');
        assert(r.varint().toJSNumber() === value);
    });

    it('255', () => {
        const value = 255;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ff01');
        assert(r.varint().toJSNumber() === value);
    });

    it('32767', () => {
        const value = 32767;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ffff01');
        assert(r.varint().toJSNumber() === value);
    });

    it('65535', () => {
        const value = 65535;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ffff03');
        assert(r.varint().toJSNumber() === value);
    });

    it('2147483647', () => {
        const value = 2147483647;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ffffffff07');
        assert(r.varint().toJSNumber() === value);
    });

    it('4294967295', () => {
        const value = 4294967295;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ffffffff0f');
        assert(r.varint().toJSNumber() === value);
    });

    it(Number.MAX_SAFE_INTEGER.toString() + ' [max safe integer]', () => {
        const value = Number.MAX_SAFE_INTEGER;

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ffffffffffffff0f');
        assert(r.varint().toJSNumber() === value);
    });

    it('9223372036854775807', () => {
        const value = BytePackBigInt('9223372036854775807');

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ffffffffffffffff7f');
        assert.deepEqual(r.varint(), value);
    });

    it('18446744073709551615', () => {
        const value = BytePackBigInt('18446744073709551615');

        const w = new Writer();
        w.varint(value);

        const r = new Reader(w);

        assert(w.toString() === 'ffffffffffffffffff01');
        assert.deepEqual(r.varint(), value);
    });
});

describe('Levin varint', () => {
    it('0', () => {
        const value = 0;

        const w = new Writer();
        w.varint(value, true);

        const r = new Reader(w);

        assert(w.toString() === '00');
        assert(r.varint(false, true).toJSNumber() === value);
    });

    it('127', () => {
        const value = 127;

        const w = new Writer();
        w.varint(value, true);

        const r = new Reader(w);

        assert(w.toString() === 'fd01');
        assert(r.varint(false, true).toJSNumber() === value);
    });

    it('255', () => {
        const value = 255;

        const w = new Writer();
        w.varint(value, true);

        const r = new Reader(w);

        assert(w.toString() === 'fd03');
        assert(r.varint(false, true).toJSNumber() === value);
    });

    it('32767', () => {
        const value = 32767;

        const w = new Writer();
        w.varint(value, true);

        const r = new Reader(w);

        assert(w.toString() === 'feff0100');
        assert(r.varint(false, true).toJSNumber() === value);
    });

    it('65535', () => {
        const value = 65535;

        const w = new Writer();
        w.varint(value, true);

        const r = new Reader(w);

        assert(w.toString() === 'feff0300');
        assert(r.varint(false, true).toJSNumber() === value);
    });

    it('1073741823', () => {
        const value = 1073741823;

        const w = new Writer();
        w.varint(value, true);

        const r = new Reader(w);

        assert(w.toString() === 'feffffff');
        assert(r.varint(false, true).toJSNumber() === value);
    });
});

describe('Extremely Large Values', () => {
    const bitSizes: number[] = [128, 256, 512, 1024, 2048, 4096, 8192];

    describe('Big Endian', () => {
        for (const bits of bitSizes) {
            const value = BytePackBigInt(2).pow(bits)
                .subtract(1);

            const subValue = value.divide(2);

            it(format('%s [%s bits]', subValue.toString(), bits), () => {
                const w = new Writer();

                w.unsigned_integer(subValue, bits, true);

                const r = new Reader(w);

                assert.deepEqual(r.unsigned_integer(bits, true), subValue);
            });

            it(format('%s [%s bits]', value.toString(), bits), () => {
                const w = new Writer();

                w.unsigned_integer(value, bits, true);

                const r = new Reader(w);

                assert(w.toString() === ''.padStart(bits / 4, 'f'));
                assert.deepEqual(r.unsigned_integer(bits, true), value);
            });
        }
    });

    describe('Little Endian', () => {
        for (const bits of bitSizes) {
            const value = BytePackBigInt(2).pow(bits)
                .subtract(1);

            const subValue = value.divide(2);

            it(format('%s [%s bits]', subValue.toString(), bits), () => {
                const w = new Writer();

                w.unsigned_integer(subValue, bits);

                const r = new Reader(w);

                assert.deepEqual(r.unsigned_integer(bits), subValue);
            });

            it(format('%s [%s bits]', value.toString(), bits), () => {
                const w = new Writer();

                w.unsigned_integer(value, bits);

                const r = new Reader(w);

                assert(w.toString() === ''.padStart(bits / 4, 'f'));
                assert.deepEqual(r.unsigned_integer(bits), value);
            });
        }
    });
});
