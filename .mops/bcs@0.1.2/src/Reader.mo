/// BCS Reader - Deserializes data from BCS (Binary Canonical Serialization) format
///
/// This module provides a reader for deserializing byte arrays according to the BCS
/// specification. All multi-byte integers are read in little-endian format.
///
/// Example usage:
/// ```motoko
/// let reader = Reader.Reader([0xFF, 0x01, 0x00, 0x00, 0x00]);
/// let byte = reader.read8(); // 255
/// let int = reader.read32(); // 1
/// ```

import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat16 "mo:base/Nat16";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Uleb "./Uleb";

module {
  /// BCS Reader class for deserializing byte arrays
  public class Reader(data : [Nat8]) {
    private var position : Nat = 0;
    private let bytes = data;

    /// Get the current position in the buffer
    public func getPosition() : Nat {
      position;
    };

    /// Check if there are more bytes to read
    public func hasMore() : Bool {
      position < bytes.size();
    };

    /// Shift the cursor position by the specified number of bytes
    public func shift(count : Nat) {
      position += count;
    };

    /// Read a single byte (u8) from the buffer
    public func read8() : Nat8 {
      if (position >= bytes.size()) {
        Debug.trap("BCS Reader: buffer overflow");
      };
      let value = bytes[position];
      position += 1;
      value;
    };

    /// Read a 16-bit unsigned integer in little-endian format
    public func read16() : Nat16 {
      let byte1 = Nat16.fromNat(Nat8.toNat(read8()));
      let byte2 = Nat16.fromNat(Nat8.toNat(read8()));
      byte1 | (byte2 << 8);
    };

    /// Read a 32-bit unsigned integer in little-endian format
    public func read32() : Nat32 {
      let byte1 = Nat32.fromNat(Nat8.toNat(read8()));
      let byte2 = Nat32.fromNat(Nat8.toNat(read8()));
      let byte3 = Nat32.fromNat(Nat8.toNat(read8()));
      let byte4 = Nat32.fromNat(Nat8.toNat(read8()));
      byte1 | (byte2 << 8) | (byte3 << 16) | (byte4 << 24);
    };

    /// Read a 64-bit unsigned integer in little-endian format
    /// Returns as Nat64
    public func read64() : Nat64 {
      var result : Nat64 = 0;
      var shift : Nat64 = 0;

      var i = 0;
      while (i < 8) {
        let byte = Nat64.fromNat(Nat8.toNat(read8()));
        result := result | (byte << shift);
        shift += 8;
        i += 1;
      };

      result;
    };

    /// Read a 128-bit unsigned integer in little-endian format
    /// Returns as Nat
    public func read128() : Nat {
      var result : Nat = 0;
      var multiplier : Nat = 1;

      var i = 0;
      while (i < 16) {
        let byte = Nat8.toNat(read8());
        result += byte * multiplier;
        multiplier *= 256;
        i += 1;
      };

      result;
    };

    /// Read a 256-bit unsigned integer in little-endian format
    /// Returns as Nat
    public func read256() : Nat {
      var result : Nat = 0;
      var multiplier : Nat = 1;

      var i = 0;
      while (i < 32) {
        let byte = Nat8.toNat(read8());
        result += byte * multiplier;
        multiplier *= 256;
        i += 1;
      };

      result;
    };

    /// Read a ULEB128 encoded unsigned integer
    public func readULEB() : Nat {
      // Get a slice of the remaining buffer starting from current position
      let remaining = Array.tabulate<Nat8>(
        bytes.size() - position,
        func(i) { bytes[position + i] },
      );

      let result = Uleb.ulebDecode(remaining);
      position += result.length;
      result.value;
    };

    /// Read a specific number of bytes from the buffer
    public func readBytes(count : Nat) : [Nat8] {
      if (position + count > bytes.size()) {
        Debug.trap("BCS Reader: buffer overflow - not enough bytes");
      };

      let result = Array.tabulate<Nat8>(
        count,
        func(i) { bytes[position + i] },
      );
      position += count;
      result;
    };

    /// Read remaining bytes from current position
    public func readRemainingBytes() : [Nat8] {
      readBytes(bytes.size() - position);
    };
  };
};
