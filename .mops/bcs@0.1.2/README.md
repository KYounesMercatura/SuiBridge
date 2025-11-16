# BCS (Binary Canonical Serialization) for Motoko

A complete implementation of Binary Canonical Serialization (BCS) for Motoko, compatible with the SUI blockchain's BCS specification and byte-for-byte compatible with the [official TypeScript implementation](https://github.com/MystenLabs/ts-sdks/tree/main/packages/bcs).

## Features

- ✅ **Primitive Types**: u8, u16, u32, u64, u128, u256, bool, string, bytes

- ✅ **Composite Types**: vectors, options, tuples, fixed arrays

- ✅ **ULEB128 Encoding**: Variable-length integer encoding for efficient serialization

- ✅ **Little-Endian**: All multi-byte integers use little-endian byte ordering

- ✅ **Type-Safe**: Leverages Motoko's type system for compile-time safety

- ✅ **Well-Tested**: Comprehensive test suite comparing output with TypeScript reference implementation


## Installation

Install via mops:

```bash
mops add bcs
```

## Quick Start

```motoko
import Bcs "mo:bcs";

// Serialize primitives
let u8Bytes = Bcs.serializeU8(255);           // [255]
let u64Bytes = Bcs.serializeU64(1000000);     // [64, 66, 15, 0, 0, 0, 0, 0]
let boolBytes = Bcs.serializeBool(true);      // [1]
let stringBytes = Bcs.serializeString("hi");  // [2, 104, 105]

// Serialize vectors
let vecBytes = Bcs.serializeVector<Nat8>(
  [1, 2, 3],
  Bcs.serializeU8
); // [3, 1, 2, 3]

// Serialize options
let noneBytes : [Nat8] = Bcs.serializeOption<Nat8>(null, Bcs.serializeU8); // [0]
let someBytes : [Nat8] = Bcs.serializeOption<Nat8>(?42, Bcs.serializeU8);  // [1, 42]

// Deserialize
let value = Bcs.deserializeU8([255]);        // 255
let text = Bcs.deserializeString([2, 104, 105]); // "hi"
```

## Advanced Usage

### Using Writer and Reader Classes

For complex serialization tasks, you can use the Writer and Reader classes directly:

```motoko
import Bcs "mo:bcs";

// Serialization with Writer
let writer = Bcs.newWriter();
writer.write64(412412400000);
writer.writeULEB(14);
writer.writeBytes([66, 105, 103, 32, 87, 97, 108, 108, 101, 116, 32, 71, 117, 121]); // "Big Wallet Guy"
writer.write8(0);
let bytes = writer.toBytes();

// Deserialization with Reader
let reader = Bcs.newReader(bytes);
let value = reader.read64();
let length = reader.readULEB();
let name = reader.readBytes(length);
let flag = reader.read8();
```

### Custom Struct Serialization

```motoko
import Bcs "mo:bcs";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";

// Define a custom struct type
type Coin = {
  value: Nat64;
  owner: Text;
  is_locked: Bool;
};

// Serialize the struct
func serializeCoin(coin: Coin) : [Nat8] {
  let writer = Bcs.newWriter();
  writer.write64(coin.value);
  
  let ownerBytes = Bcs.serializeString(coin.owner);
  writer.writeBytes(ownerBytes);
  
  writer.write8(if (coin.is_locked) 1 else 0);
  writer.toBytes()
};

// Deserialize the struct
func deserializeCoin(bytes: [Nat8]) : Coin {
  let reader = Bcs.newReader(bytes);
  let value = reader.read64();
  
  let ownerLength = reader.readULEB();
  let ownerBytes = reader.readBytes(ownerLength);
  let owner = switch (Text.decodeUtf8(Blob.fromArray(ownerBytes))) {
    case (?t) t;
    case null Debug.trap("Invalid UTF-8");
  };
  
  let is_locked = reader.read8() == 1;
  
  { value; owner; is_locked }
};
```

## API Reference

### Primitive Type Serialization

- `serializeU8(value: Nat8) : [Nat8]`
- `serializeU16(value: Nat16) : [Nat8]`
- `serializeU32(value: Nat32) : [Nat8]`
- `serializeU64(value: Nat64) : [Nat8]`
- `serializeU128(value: Nat) : [Nat8]`
- `serializeU256(value: Nat) : [Nat8]`
- `serializeBool(value: Bool) : [Nat8]`
- `serializeString(text: Text) : [Nat8]`
- `serializeBytes(bytes: [Nat8]) : [Nat8]`
- `serializeByteVector(bytes: [Nat8]) : [Nat8]`
- `serializeUleb128(value: Nat) : [Nat8]`

### Primitive Type Deserialization

- `deserializeU8(bytes: [Nat8]) : Nat8`
- `deserializeU16(bytes: [Nat8]) : Nat16`
- `deserializeU32(bytes: [Nat8]) : Nat32`
- `deserializeU64(bytes: [Nat8]) : Nat64`
- `deserializeU128(bytes: [Nat8]) : Nat`
- `deserializeU256(bytes: [Nat8]) : Nat`
- `deserializeBool(bytes: [Nat8]) : Bool`
- `deserializeString(bytes: [Nat8]) : Text`
- `deserializeUleb128(bytes: [Nat8]) : Nat`

### Composite Type Serialization

- `serializeVector<T>(values: [T], serializeElement: (T) -> [Nat8]) : [Nat8]`
- `serializeFixedArray<T>(values: [T], serializeElement: (T) -> [Nat8]) : [Nat8]`
- `serializeOption<T>(value: ?T, serializeElement: (T) -> [Nat8]) : [Nat8]`
- `serializeTuple2<T1, T2>(value: (T1, T2), serialize1: (T1) -> [Nat8], serialize2: (T2) -> [Nat8]) : [Nat8]`
- `serializeTuple3<T1, T2, T3>(value: (T1, T2, T3), ...) : [Nat8]`

### Composite Type Deserialization

- `deserializeVector<T>(bytes: [Nat8], deserializeElement: (Reader) -> T) : [T]`
- `deserializeFixedArray<T>(bytes: [Nat8], size: Nat, deserializeElement: (Reader) -> T) : [T]`
- `deserializeOption<T>(bytes: [Nat8], deserializeElement: (Reader) -> T) : ?T`
- `deserializeTuple2<T1, T2>(bytes: [Nat8], deserialize1: (Reader) -> T1, deserialize2: (Reader) -> T2) : (T1, T2)`
- `deserializeTuple3<T1, T2, T3>(bytes: [Nat8], ...) : (T1, T2, T3)`

### Writer Class Methods

- `write8(value: Nat8)`
- `write16(value: Nat16)`
- `write32(value: Nat32)`
- `write64(value: Nat64)`
- `write128(value: Nat)`
- `write256(value: Nat)`
- `writeULEB(value: Nat)`
- `writeBytes(bytes: [Nat8])`
- `toBytes() : [Nat8]`
- `size() : Nat`
- `clear()`

### Reader Class Methods

- `read8() : Nat8`
- `read16() : Nat16`
- `read32() : Nat32`
- `read64() : Nat64`
- `read128() : Nat`
- `read256() : Nat`
- `readULEB() : Nat`
- `readBytes(count: Nat) : [Nat8]`
- `readRemainingBytes() : [Nat8]`
- `getPosition() : Nat`
- `hasMore() : Bool`

### Utility Functions

- `newWriter() : Writer`
- `newReader(bytes: [Nat8]) : Reader`
- `toHex(bytes: [Nat8]) : Text`
- `ulebEncode(num: Nat) : [Nat8]`
- `ulebDecode(arr: [Nat8]) : { value: Nat; length: Nat }`

## BCS Specification

This implementation follows the [Binary Canonical Serialization (BCS)](https://github.com/diem/bcs) specification:

- **Integers**: Stored in little-endian format
- **Booleans**: `true` = 1, `false` = 0
- **Strings**: UTF-8 encoded, length-prefixed with ULEB128
- **Vectors**: Length-prefixed with ULEB128, followed by serialized elements
- **Options**: `None` = 0, `Some(x)` = 1 followed by serialized x
- **Structs**: Fields serialized in order of definition
- **Enums**: Variant index as ULEB128, followed by variant data

## Testing

Run the test suite:

```bash
mops test
```

The tests verify byte-for-byte compatibility with the TypeScript reference implementation.

## Compatibility

This library is designed to be compatible with:

- ✅ SUI blockchain BCS serialization
- ✅ Mysten Labs TypeScript BCS library
- ✅ Move language BCS serialization
- ✅ Diem/Libra BCS specification

## Use Cases

### SUI Blockchain Integration

This library is perfect for:
- Building SUI wallet canisters on the Internet Computer
- Serializing SUI transaction data
- Interacting with SUI RPC nodes
- Creating cross-chain applications between ICP and SUI

### Example: SUI Transaction Serialization

```motoko
import Bcs "mo:bcs";

// Serialize a SUI transaction
func serializeTransaction(tx: TransactionData) : [Nat8] {
  let writer = Bcs.newWriter();
  
  // Serialize transaction kind (enum variant)
  writer.writeULEB(0); // ProgrammableTransaction variant
  
  // Serialize inputs
  writer.writeULEB(tx.inputs.size());
  for (input in tx.inputs.vals()) {
    // Serialize each input...
  };
  
  // Serialize commands
  writer.writeULEB(tx.commands.size());
  for (cmd in tx.commands.vals()) {
    // Serialize each command...
  };
  
  writer.toBytes()
};
```

## Project Structure

```
bcs/
├── src/
│   ├── lib.mo          # Main public API
│   ├── Bcs.mo          # BCS serialization functions
│   ├── Writer.mo       # Writer class for serialization
│   ├── Reader.mo       # Reader class for deserialization
│   └── Uleb.mo         # ULEB128 encoding/decoding
├── test/
│   └── lib.test.mo     # Comprehensive test suite
├── mops.toml           # Package configuration
├── SPEC.md             # Project specification
└── README.md           # This file
```

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `mops test`
2. Code follows Motoko style guidelines
3. New features include tests
4. Serialization output matches TypeScript reference

## License

MIT License. See `LICENSE` file for details.

## Credits

This implementation is based on the [Mysten Labs TypeScript BCS library](https://github.com/MystenLabs/ts-sdks/tree/main/packages/bcs) and follows the [BCS specification](https://github.com/diem/bcs).

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/jneums/motoko-bcs).
