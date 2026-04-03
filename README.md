# @gibme/bytepack

A byte-packing library for reading and writing binary data with support for arbitrary-precision integers, variable-length encoding, and configurable byte ordering.

## Installation

```bash
npm install @gibme/bytepack
```

```bash
yarn add @gibme/bytepack
```

## Requirements

- Node.js >= 22

## Documentation

Full TypeDoc documentation is available at [https://gibme-npm.github.io/bytepack/](https://gibme-npm.github.io/bytepack/)

## Quick Start

```typescript
import { Reader, Writer } from '@gibme/bytepack';

const writer = new Writer();

writer.uint8_t(8);
writer.uint32_t(1024);
writer.string('hello');

const reader = new Reader(writer);

console.log(reader.uint8_t().toJSNumber()); // 8
console.log(reader.uint32_t().toJSNumber()); // 1024
console.log(reader.string()); // hello
```

## Features

- **Fixed-width integers**: `uint8_t`, `uint16_t`, `uint32_t`, `uint64_t`, `uint128_t`, `uint256_t`, `uint512_t` (and signed variants)
- **Arbitrary-precision integers**: Read/write integers of any bit size (up to 8192 bits and beyond) via `unsigned_integer()` / `signed_integer()`
- **Variable-length integers**: Standard varint encoding and Levin protocol varint encoding
- **Byte order control**: Little-endian (default) or big-endian for all integer types
- **Strings**: Automatically length-prefixed with varint encoding
- **Hashes**: Read/write 32-byte and 64-byte hashes
- **Date/time**: `time_t` support (epoch seconds as `uint64_t`)
- **Streaming**: `Writer` extends `Readable` and `Reader` extends `Writable`, enabling stream-based usage
- **Chainable writes**: All `Writer` methods return `this` for fluent API usage
- **BigInteger support**: All integer methods accept and return `BigInteger` values for arbitrary-precision arithmetic

## Usage Examples

### Writing and Reading Integers

```typescript
import { Reader, Writer, BigInteger } from '@gibme/bytepack';

const writer = new Writer();

// Fixed-width integers
writer.uint8_t(255);
writer.uint16_t(65535);
writer.uint32_t(4294967295);
writer.uint64_t(BigInteger('18446744073709551615'));

// Big-endian
writer.uint32_t(1024, true);

const reader = new Reader(writer);

console.log(reader.uint8_t().toJSNumber());   // 255
console.log(reader.uint16_t().toJSNumber());   // 65535
console.log(reader.uint32_t().toJSNumber());   // 4294967295
console.log(reader.uint64_t().toString());      // 18446744073709551615

// Big-endian
console.log(reader.uint32_t(true).toJSNumber()); // 1024
```

### Variable-Length Integers (Varint)

```typescript
const writer = new Writer();

writer.varint(300);
writer.varint(127, true); // Levin protocol encoding

const reader = new Reader(writer);

console.log(reader.varint().toJSNumber());             // 300
console.log(reader.varint(false, true).toJSNumber());  // 127
```

### Strings and Hashes

```typescript
const writer = new Writer();

writer.string('The quick brown fox');
writer.hash('7fb97df81221dd1366051b2d0bc7f49c66c22ac4431d879c895b06d66ef66f4c');

const reader = new Reader(writer);

console.log(reader.string());   // The quick brown fox
console.log(reader.hash());     // 7fb97df81221dd1366051b2d0bc7f49c66c22ac4431d879c895b06d66ef66f4c
```

### Date/Time

```typescript
const writer = new Writer();

writer.time_t(new Date());

const reader = new Reader(writer);

console.log(reader.time_t()); // Date object (seconds precision)
```

### Chainable Writes

```typescript
const writer = new Writer()
    .uint8_t(1)
    .uint16_t(2)
    .uint32_t(3)
    .string('chained');
```

### Constructing from Hex or Buffer

```typescript
// From hex string
const reader = new Reader('0102030405', 'hex');

// From Buffer
const reader2 = new Reader(Buffer.from([0x01, 0x02, 0x03]));

// From another Reader or Writer
const reader3 = new Reader(writer);
```

### Buffer Management

```typescript
const reader = new Reader('0102030405', 'hex');

console.log(reader.length);       // 5
console.log(reader.offset);       // 0
console.log(reader.unreadBytes);   // 5

reader.uint8_t();

console.log(reader.offset);       // 1
console.log(reader.unreadBytes);   // 4

reader.skip(2);                    // Skip 2 bytes
reader.reset();                    // Reset to beginning
reader.compact();                  // Truncate already-read bytes
```

## API Reference

### Exports

| Export | Description |
|--------|-------------|
| `Reader` | Binary data reader (extends `Writable` stream) |
| `Writer` | Binary data writer (extends `Readable` stream) |
| `Varint` | Static varint encode/decode utilities |
| `BigInteger` | Re-export of [big-integer](https://www.npmjs.com/package/big-integer) for arbitrary-precision arithmetic |
| `Buffer` | Re-export of the `buffer` module's `Buffer` class |
| `BitSize` | Type representing valid bit sizes: `8 \| 16 \| 32 \| 64 \| 128 \| 256 \| 512 \| 1024 \| 2048 \| 4096 \| 8192 \| number` |
| `HashBytesSize` | Type representing valid hash sizes: `32 \| 64 \| number` |

### Reader Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `uint8_t()` | `BigInteger` | Read unsigned 8-bit integer |
| `uint16_t(bigEndian?)` | `BigInteger` | Read unsigned 16-bit integer |
| `uint32_t(bigEndian?)` | `BigInteger` | Read unsigned 32-bit integer |
| `uint64_t(bigEndian?)` | `BigInteger` | Read unsigned 64-bit integer |
| `uint128_t(bigEndian?)` | `BigInteger` | Read unsigned 128-bit integer |
| `uint256_t(bigEndian?)` | `BigInteger` | Read unsigned 256-bit integer |
| `uint512_t(bigEndian?)` | `BigInteger` | Read unsigned 512-bit integer |
| `int8_t()` | `BigInteger` | Read signed 8-bit integer |
| `int16_t(bigEndian?)` | `BigInteger` | Read signed 16-bit integer |
| `int32_t(bigEndian?)` | `BigInteger` | Read signed 32-bit integer |
| `int64_t(bigEndian?)` | `BigInteger` | Read signed 64-bit integer |
| `unsigned_integer(bits, bigEndian?)` | `BigInteger` | Read unsigned integer of arbitrary bit size |
| `signed_integer(bits, bigEndian?)` | `BigInteger` | Read signed integer of arbitrary bit size |
| `varint(peek?, levin?)` | `BigInteger` | Read varint (optionally peek without advancing, optionally Levin encoding) |
| `string(encoding?)` | `string` | Read varint-prefixed string |
| `hash(size?, encoding?)` | `string` | Read hash (32 or 64 bytes) |
| `hex(count?, encoding?)` | `string` | Read hex-encoded bytes |
| `bytes(count?)` | `Buffer` | Read raw bytes |
| `time_t(bigEndian?)` | `Date` | Read epoch timestamp as Date |
| `skip(count?)` | `void` | Skip bytes |
| `reset(offset?)` | `void` | Reset read position |
| `compact(offset?)` | `void` | Truncate already-read bytes |
| `append(blob, encoding?)` | `void` | Append data to buffer |

### Writer Methods

All writer methods return `this` for chaining (except `clear` and `toString`).

| Method | Description |
|--------|-------------|
| `uint8_t(value, bigEndian?)` | Write unsigned 8-bit integer |
| `uint16_t(value, bigEndian?)` | Write unsigned 16-bit integer |
| `uint32_t(value, bigEndian?)` | Write unsigned 32-bit integer |
| `uint64_t(value, bigEndian?)` | Write unsigned 64-bit integer |
| `uint128_t(value, bigEndian?)` | Write unsigned 128-bit integer |
| `uint256_t(value, bigEndian?)` | Write unsigned 256-bit integer |
| `uint512_t(value, bigEndian?)` | Write unsigned 512-bit integer |
| `int8_t(value)` | Write signed 8-bit integer |
| `int16_t(value)` | Write signed 16-bit integer |
| `int32_t(value)` | Write signed 32-bit integer |
| `int64_t(value)` | Write signed 64-bit integer |
| `unsigned_integer(value, bits?, bigEndian?)` | Write unsigned integer (auto-sizes if bits omitted) |
| `signed_integer(value, bits?, bigEndian?)` | Write signed integer (auto-sizes if bits omitted) |
| `varint(value, levin?)` | Write varint (optionally Levin encoding) |
| `string(value, encoding?)` | Write varint-prefixed string |
| `hash(hash, encoding?)` | Write hash (32 or 64 bytes) |
| `hex(hex)` | Write hex-encoded bytes |
| `bytes(value)` | Write raw bytes |
| `time_t(value, bigEndian?)` | Write Date as epoch timestamp |
| `append(payload, encoding?)` | Append raw data |
| `clear()` | Clear the buffer |
| `toString(encoding?)` | Return buffer contents as string |

## License

MIT - see [LICENSE](LICENSE) for details.
