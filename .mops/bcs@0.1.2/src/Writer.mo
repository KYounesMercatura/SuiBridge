/// BCS Writer - Serializes data into BCS (Binary Canonical Serialization) format
///
/// This module provides a buffer-based writer for serializing data according to the BCS
/// specification. All multi-byte integers are written in little-endian format.
///
/// Example usage:
/// ```motoko
/// let writer = Writer.Writer();
/// writer.write8(255);
/// writer.write32(1000000);
/// let bytes = writer.toBytes();
/// ```

import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat16 "mo:base/Nat16";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Uleb "./Uleb";

module {
  /// BCS Writer class for serializing data into byte arrays
  public class Writer() {
    private let buffer = Buffer.Buffer<Nat8>(1024);

    /// Write a single byte (u8) to the buffer
    public func write8(value : Nat8) {
      buffer.add(value);
    };

    /// Write a 16-bit unsigned integer in little-endian format
    public func write16(value : Nat16) {
      let v = Nat16.toNat(value);
      buffer.add(Nat8.fromNat(v % 256));
      buffer.add(Nat8.fromNat(v / 256));
    };

    /// Write a 32-bit unsigned integer in little-endian format
    public func write32(value : Nat32) {
      let v = value;
      buffer.add(Nat8.fromNat(Nat32.toNat((v >> 0) & 0xFF)));
      buffer.add(Nat8.fromNat(Nat32.toNat((v >> 8) & 0xFF)));
      buffer.add(Nat8.fromNat(Nat32.toNat((v >> 16) & 0xFF)));
      buffer.add(Nat8.fromNat(Nat32.toNat((v >> 24) & 0xFF)));
    };

    /// Write a 64-bit unsigned integer in little-endian format
    public func write64(value : Nat64) {
      let bytes = toLittleEndian64(value);
      for (byte in bytes.vals()) {
        buffer.add(byte);
      };
    };

    /// Write a 128-bit unsigned integer in little-endian format
    public func write128(value : Nat) {
      let bytes = toLittleEndian(value, 16);
      for (byte in bytes.vals()) {
        buffer.add(byte);
      };
    };

    /// Write a 256-bit unsigned integer in little-endian format
    public func write256(value : Nat) {
      let bytes = toLittleEndian(value, 32);
      for (byte in bytes.vals()) {
        buffer.add(byte);
      };
    };

    /// Write a ULEB128 encoded unsigned integer
    public func writeULEB(value : Nat) {
      let encoded = Uleb.ulebEncode(value);
      for (byte in encoded.vals()) {
        buffer.add(byte);
      };
    };

    /// Write a byte array to the buffer
    public func writeBytes(bytes : [Nat8]) {
      for (byte in bytes.vals()) {
        buffer.add(byte);
      };
    };

    /// Get the serialized bytes
    public func toBytes() : [Nat8] {
      Buffer.toArray(buffer);
    };

    /// Get the current size of the buffer
    public func size() : Nat {
      buffer.size();
    };

    /// Clear the buffer
    public func clear() {
      buffer.clear();
    };

    // Helper function to convert Nat64 to little-endian bytes
    private func toLittleEndian64(value : Nat64) : [Nat8] {
      let result = Array.init<Nat8>(8, 0);
      var v = value;
      var i = 0;

      while (i < 8) {
        result[i] := Nat8.fromNat(Nat64.toNat(v & 0xFF));
        v := v >> 8;
        i += 1;
      };

      Array.freeze(result);
    };

    // Helper function to convert Nat to little-endian bytes with specific size
    private func toLittleEndian(value : Nat, size : Nat) : [Nat8] {
      let result = Array.init<Nat8>(size, 0);
      var v = value;
      var i = 0;

      while (i < size) {
        result[i] := Nat8.fromNat(v % 256);
        v := v / 256;
        i += 1;
      };

      Array.freeze(result);
    };
  };
};
