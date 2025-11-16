# BLAKE2b for Motoko

A pure Motoko implementation of the BLAKE2b cryptographic hash function for the Internet Computer.

## Features

- Full BLAKE2b implementation with configurable output length
- Support for keyed hashing (HMAC-style)
- Salt and personalization parameters
- One-shot and streaming API

## Installation

```bash
mops add blake2b
```

## Usage

```motoko
import Blake2b "mo:blake2b";
import Blob "mo:base/Blob";
import Text "mo:base/Text";

// Simple hash
let data = Text.encodeUtf8("Hello, World!");
let hash = Blake2b.digest(data);

// Keyed hash (HMAC-style)
let key = Text.encodeUtf8("my-secret-key");
let hmac = Blake2b.hmac(key, data);

// Custom configuration
let config = {
    digest_length = 32; // 256-bit output
    key = ?key;
    salt = null;
    personal = null;
};
let custom_hash = Blake2b.hash(data, ?config);

// Streaming API
let state = Blake2b.init(config);
Blake2b.update(state, Text.encodeUtf8("Hello, "));
Blake2b.update(state, Text.encodeUtf8("World!"));
let stream_hash = Blake2b.finalize(state);
```

## API Reference

### Types

- `Blake2bConfig`: Configuration for hash parameters
- `Blake2bState`: Streaming hash state

### Functions

- `digest(data: Blob): Blob` - Simple hash with default parameters
- `hash(data: Blob, config: ?Blake2bConfig): Blob` - Hash with custom config
- `hmac(key: Blob, message: Blob): Blob` - Keyed hash
- `init(config: Blake2bConfig): Blake2bState` - Initialize streaming state
- `update(state: Blake2bState, data: Blob)` - Add data to stream
- `finalize(state: Blake2bState): Blob` - Get final hash

## License

MIT License