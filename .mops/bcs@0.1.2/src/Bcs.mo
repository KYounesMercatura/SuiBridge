/// BCS (Binary Canonical Serialization) Library for Motoko
///
/// This is the main module that provides the public API for BCS serialization.
/// It exposes functions to serialize and deserialize primitive types, composite types,
/// and custom structures according to the BCS specification.
///
/// Example usage:
/// ```motoko
/// import Bcs "mo:bcs";
///
/// // Serialize a u8
/// let bytes = Bcs.serializeU8(255);
///
/// // Serialize a vector of u32
/// let vecBytes = Bcs.serializeVector([1, 2, 3], Bcs.serializeU32);
///
/// // Deserialize
/// let value = Bcs.deserializeU8(bytes);
/// ```

import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat16 "mo:base/Nat16";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Bool "mo:base/Bool";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import WriterModule "./Writer";
import ReaderModule "./Reader";
import Uleb "./Uleb";

module {
  // Re-export Writer and Reader classes for advanced usage
  public let Writer = WriterModule.Writer;
  public let Reader = ReaderModule.Reader;

  // ============================================================================
  // PRIMITIVE TYPES - Serialization
  // ============================================================================

  /// Serialize a u8 (8-bit unsigned integer)
  public func serializeU8(value : Nat8) : [Nat8] { [value] };

  /// Serialize a u16 (16-bit unsigned integer) in little-endian
  public func serializeU16(value : Nat16) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.write16(value);
    writer.toBytes();
  };

  /// Serialize a u32 (32-bit unsigned integer) in little-endian
  public func serializeU32(value : Nat32) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.write32(value);
    writer.toBytes();
  };

  /// Serialize a u64 (64-bit unsigned integer) in little-endian
  public func serializeU64(value : Nat64) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.write64(value);
    writer.toBytes();
  };

  /// Serialize a u128 (128-bit unsigned integer) in little-endian
  public func serializeU128(value : Nat) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.write128(value);
    writer.toBytes();
  };

  /// Serialize a u256 (256-bit unsigned integer) in little-endian
  public func serializeU256(value : Nat) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.write256(value);
    writer.toBytes();
  };

  /// Serialize a boolean (true = 1, false = 0)
  public func serializeBool(value : Bool) : [Nat8] {
    if (value) { [1] } else { [0] };
  };

  /// Serialize a ULEB128 encoded integer
  public func serializeUleb128(value : Nat) : [Nat8] {
    Uleb.ulebEncode(value);
  };

  /// Serialize fixed-length bytes
  public func serializeBytes(bytes : [Nat8]) : [Nat8] {
    bytes;
  };

  /// Serialize a byte vector (length-prefixed with ULEB128)
  public func serializeByteVector(bytes : [Nat8]) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.writeULEB(bytes.size());
    writer.writeBytes(bytes);
    writer.toBytes();
  };

  /// Serialize a string (UTF-8 encoded, length-prefixed with ULEB128)
  public func serializeString(text : Text) : [Nat8] {
    let blob = Text.encodeUtf8(text);
    let bytes = Blob.toArray(blob);
    serializeByteVector(bytes);
  };

  // ============================================================================
  // PRIMITIVE TYPES - Deserialization
  // ============================================================================

  /// Deserialize a u8 (8-bit unsigned integer)
  public func deserializeU8(bytes : [Nat8]) : Nat8 {
    let reader = ReaderModule.Reader(bytes);
    reader.read8();
  };

  /// Deserialize a u16 (16-bit unsigned integer)
  public func deserializeU16(bytes : [Nat8]) : Nat16 {
    let reader = ReaderModule.Reader(bytes);
    reader.read16();
  };

  /// Deserialize a u32 (32-bit unsigned integer)
  public func deserializeU32(bytes : [Nat8]) : Nat32 {
    let reader = ReaderModule.Reader(bytes);
    reader.read32();
  };

  /// Deserialize a u64 (64-bit unsigned integer)
  public func deserializeU64(bytes : [Nat8]) : Nat64 {
    let reader = ReaderModule.Reader(bytes);
    reader.read64();
  };

  /// Deserialize a u128 (128-bit unsigned integer)
  public func deserializeU128(bytes : [Nat8]) : Nat {
    let reader = ReaderModule.Reader(bytes);
    reader.read128();
  };

  /// Deserialize a u256 (256-bit unsigned integer)
  public func deserializeU256(bytes : [Nat8]) : Nat {
    let reader = ReaderModule.Reader(bytes);
    reader.read256();
  };

  /// Deserialize a boolean
  public func deserializeBool(bytes : [Nat8]) : Bool {
    let reader = ReaderModule.Reader(bytes);
    reader.read8() == 1;
  };

  /// Deserialize a ULEB128 encoded integer
  public func deserializeUleb128(bytes : [Nat8]) : Nat {
    Uleb.ulebDecode(bytes).value;
  };

  /// Deserialize a string (UTF-8 encoded, length-prefixed)
  public func deserializeString(bytes : [Nat8]) : Text {
    let reader = ReaderModule.Reader(bytes);
    let length = reader.readULEB();
    let strBytes = reader.readBytes(length);
    let blob = Blob.fromArray(strBytes);

    switch (Text.decodeUtf8(blob)) {
      case (?text) { text };
      case null { Debug.trap("Invalid UTF-8 encoding") };
    };
  };

  // ============================================================================
  // COMPOSITE TYPES - Serialization
  // ============================================================================

  /// Serialize a vector (array) with a custom element serializer
  /// The vector is prefixed with its length encoded as ULEB128
  public func serializeVector<T>(
    values : [T],
    serializeElement : (T) -> [Nat8],
  ) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.writeULEB(values.size());

    for (value in values.vals()) {
      let bytes = serializeElement(value);
      writer.writeBytes(bytes);
    };

    writer.toBytes();
  };

  /// Serialize a fixed-size array with a custom element serializer
  /// No length prefix is included
  public func serializeFixedArray<T>(
    values : [T],
    serializeElement : (T) -> [Nat8],
  ) : [Nat8] {
    let writer = WriterModule.Writer();

    for (value in values.vals()) {
      let bytes = serializeElement(value);
      writer.writeBytes(bytes);
    };

    writer.toBytes();
  };

  /// Serialize an option type
  /// None = [0], Some(value) = [1, ...serialized value]
  public func serializeOption<T>(
    value : ?T,
    serializeElement : (T) -> [Nat8],
  ) : [Nat8] {
    let writer = WriterModule.Writer();

    switch (value) {
      case null {
        writer.write8(0); // None variant
      };
      case (?v) {
        writer.write8(1); // Some variant
        let bytes = serializeElement(v);
        writer.writeBytes(bytes);
      };
    };

    writer.toBytes();
  };

  /// Serialize a tuple of 2 elements
  public func serializeTuple2<T1, T2>(
    value : (T1, T2),
    serialize1 : (T1) -> [Nat8],
    serialize2 : (T2) -> [Nat8],
  ) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.writeBytes(serialize1(value.0));
    writer.writeBytes(serialize2(value.1));
    writer.toBytes();
  };

  /// Serialize a tuple of 3 elements
  public func serializeTuple3<T1, T2, T3>(
    value : (T1, T2, T3),
    serialize1 : (T1) -> [Nat8],
    serialize2 : (T2) -> [Nat8],
    serialize3 : (T3) -> [Nat8],
  ) : [Nat8] {
    let writer = WriterModule.Writer();
    writer.writeBytes(serialize1(value.0));
    writer.writeBytes(serialize2(value.1));
    writer.writeBytes(serialize3(value.2));
    writer.toBytes();
  };

  // ============================================================================
  // COMPOSITE TYPES - Deserialization
  // ============================================================================

  /// Deserialize a vector with a custom element deserializer
  public func deserializeVector<T>(
    bytes : [Nat8],
    deserializeElement : (ReaderModule.Reader) -> T,
  ) : [T] {
    let reader = ReaderModule.Reader(bytes);
    let length = reader.readULEB();

    Array.tabulate<T>(
      length,
      func(_) {
        deserializeElement(reader);
      },
    );
  };

  /// Deserialize a fixed-size array with a custom element deserializer
  public func deserializeFixedArray<T>(
    bytes : [Nat8],
    size : Nat,
    deserializeElement : (ReaderModule.Reader) -> T,
  ) : [T] {
    let reader = ReaderModule.Reader(bytes);

    Array.tabulate<T>(
      size,
      func(_) {
        deserializeElement(reader);
      },
    );
  };

  /// Deserialize an option type
  public func deserializeOption<T>(
    bytes : [Nat8],
    deserializeElement : (ReaderModule.Reader) -> T,
  ) : ?T {
    let reader = ReaderModule.Reader(bytes);
    let variant = reader.read8();

    if (variant == 0) {
      null // None
    } else {
      ?deserializeElement(reader) // Some
    };
  };

  /// Deserialize a tuple of 2 elements
  public func deserializeTuple2<T1, T2>(
    bytes : [Nat8],
    deserialize1 : (ReaderModule.Reader) -> T1,
    deserialize2 : (ReaderModule.Reader) -> T2,
  ) : (T1, T2) {
    let reader = ReaderModule.Reader(bytes);
    let v1 = deserialize1(reader);
    let v2 = deserialize2(reader);
    (v1, v2);
  };

  /// Deserialize a tuple of 3 elements
  public func deserializeTuple3<T1, T2, T3>(
    bytes : [Nat8],
    deserialize1 : (ReaderModule.Reader) -> T1,
    deserialize2 : (ReaderModule.Reader) -> T2,
    deserialize3 : (ReaderModule.Reader) -> T3,
  ) : (T1, T2, T3) {
    let reader = ReaderModule.Reader(bytes);
    let v1 = deserialize1(reader);
    let v2 = deserialize2(reader);
    let v3 = deserialize3(reader);
    (v1, v2, v3);
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /// Create a new Writer instance
  public func newWriter() : WriterModule.Writer {
    WriterModule.Writer();
  };

  /// Create a new Reader instance
  public func newReader(bytes : [Nat8]) : ReaderModule.Reader {
    ReaderModule.Reader(bytes);
  };

  /// Convert bytes to hex string (for debugging)
  public func toHex(bytes : [Nat8]) : Text {
    var result = "";
    for (byte in bytes.vals()) {
      result #= byteToHex(byte);
    };
    result;
  };

  private func byteToHex(byte : Nat8) : Text {
    let chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    let high = Nat8.toNat(byte / 16);
    let low = Nat8.toNat(byte % 16);
    chars[high] # chars[low];
  };
};
