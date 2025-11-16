/// BCS (Binary Canonical Serialization) Library for Motoko
///
/// This library provides a complete implementation of BCS serialization for Motoko,
/// compatible with the SUI blockchain's BCS specification.
///
/// ## Features
/// - Primitive types: u8, u16, u32, u64, u128, u256, bool, string
/// - Composite types: vectors, options, tuples, structs, enums
/// - ULEB128 encoding for variable-length integers
/// - Little-endian byte ordering for all multi-byte integers
///
/// ## Example
/// ```motoko
/// import Bcs "mo:bcs";
///
/// // Serialize primitives
/// let bytes = Bcs.serializeU64(1000000);
///
/// // Serialize vectors
/// let vec = Bcs.serializeVector([1, 2, 3], Bcs.serializeU8);
///
/// // Deserialize
/// let value = Bcs.deserializeU64(bytes);
/// ```

import BcsModule "./Bcs";
import WriterModule "./Writer";
import ReaderModule "./Reader";
import UlebModule "./Uleb";

module {
  // Re-export all public modules
  public let Bcs = BcsModule;
  public let Writer = WriterModule;
  public let Reader = ReaderModule;
  public let Uleb = UlebModule;

  // Convenience re-exports of commonly used functions

  // Primitive serialization
  public let serializeU8 = BcsModule.serializeU8;
  public let serializeU16 = BcsModule.serializeU16;
  public let serializeU32 = BcsModule.serializeU32;
  public let serializeU64 = BcsModule.serializeU64;
  public let serializeU128 = BcsModule.serializeU128;
  public let serializeU256 = BcsModule.serializeU256;
  public let serializeBool = BcsModule.serializeBool;
  public let serializeString = BcsModule.serializeString;
  public let serializeBytes = BcsModule.serializeBytes;
  public let serializeByteVector = BcsModule.serializeByteVector;
  public let serializeUleb128 = BcsModule.serializeUleb128;

  // Primitive deserialization
  public let deserializeU8 = BcsModule.deserializeU8;
  public let deserializeU16 = BcsModule.deserializeU16;
  public let deserializeU32 = BcsModule.deserializeU32;
  public let deserializeU64 = BcsModule.deserializeU64;
  public let deserializeU128 = BcsModule.deserializeU128;
  public let deserializeU256 = BcsModule.deserializeU256;
  public let deserializeBool = BcsModule.deserializeBool;
  public let deserializeString = BcsModule.deserializeString;
  public let deserializeUleb128 = BcsModule.deserializeUleb128;

  // Composite types
  public let serializeVector = BcsModule.serializeVector;
  public let serializeFixedArray = BcsModule.serializeFixedArray;
  public let serializeOption = BcsModule.serializeOption;
  public let serializeTuple2 = BcsModule.serializeTuple2;
  public let serializeTuple3 = BcsModule.serializeTuple3;

  public let deserializeVector = BcsModule.deserializeVector;
  public let deserializeFixedArray = BcsModule.deserializeFixedArray;
  public let deserializeOption = BcsModule.deserializeOption;
  public let deserializeTuple2 = BcsModule.deserializeTuple2;
  public let deserializeTuple3 = BcsModule.deserializeTuple3;

  // Utilities
  public let newWriter = BcsModule.newWriter;
  public let newReader = BcsModule.newReader;
  public let toHex = BcsModule.toHex;

  // ULEB functions
  public let ulebEncode = UlebModule.ulebEncode;
  public let ulebDecode = UlebModule.ulebDecode;
};
