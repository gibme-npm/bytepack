# Byte-Packing Library

## Documentation

[https://gibme-npm.github.io/bytepack/](https://gibme-npm.github.io/bytepack/)

## Sample Code

```typescript
import { Reader, Writer } from '@gibme/bytepack';

const writer = new Writer();

writer.uint8_t(8);

const reader = new Reader(writer);

console.log(reader.uint8_t());
```
