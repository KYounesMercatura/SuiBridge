/// ULEB128 (Unsigned Little Endian Base 128) encoding and decoding
///
/// This module implements variable-length integer encoding as specified in the BCS standard.
/// ULEB128 is used for encoding vector lengths, enum variant indices, and other variable-size integers.
///
/// Encoding: Numbers are encoded 7 bits at a time, with the high bit set to 1 for continuation
/// bytes and 0 for the final byte.
///
/// Example:
/// - 0 -> [0]
/// - 127 -> [127]
/// - 128 -> [0x80, 0x01]
/// - 300 -> [0xAC, 0x02]

import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";

module {
  /// Result of decoding a ULEB128 value
  public type DecodeResult = {
    /// The decoded value
    value : Nat;
    /// Number of bytes consumed from the input
    length : Nat;
  };

  /// Encodes a natural number into ULEB128 format
  ///
  /// Returns an array of bytes representing the encoded value.
  /// Each byte encodes 7 bits of the value, with the high bit indicating continuation.
  ///
  /// Example:
  /// ```motoko
  /// ulebEncode(0) // [0]
  /// ulebEncode(127) // [127]
  /// ulebEncode(128) // [0x80, 0x01]
  /// ulebEncode(300) // [0xAC, 0x02]
  /// ```
  public func ulebEncode(num : Nat) : [Nat8] {
    if (num == 0) {
      return [0];
    };

    let buffer = Buffer.Buffer<Nat8>(8); // Most numbers need <= 8 bytes
    var n = num;

    while (n > 0) {
      var byte = Nat8.fromNat(n % 128); // Get lower 7 bits
      n := n / 128;

      if (n > 0) {
        byte := byte | 0x80; // Set continuation bit
      };

      buffer.add(byte);
    };

    Buffer.toArray(buffer);
  };

  /// Decodes a ULEB128 encoded value from a byte array
  ///
  /// Returns a DecodeResult containing the decoded value and the number of bytes consumed.
  /// Throws an error if the buffer ends before a terminating byte is found.
  ///
  /// Example:
  /// ```motoko
  /// ulebDecode([0]) // { value = 0; length = 1 }
  /// ulebDecode([0x80, 0x01]) // { value = 128; length = 2 }
  /// ulebDecode([0xAC, 0x02]) // { value = 300; length = 2 }
  /// ```
  public func ulebDecode(arr : [Nat8]) : DecodeResult {
    var total : Nat = 0;
    var shift : Nat = 0;
    var len : Nat = 0;

    label decoding loop {
      if (len >= arr.size()) {
        Debug.trap("ULEB decode error: buffer overflow");
      };

      let byte = arr[len];
      len += 1;

      // Add the lower 7 bits to the total, shifted appropriately
      total += Nat8.toNat(byte & 0x7F) * (2 ** shift);

      // If high bit is not set, we're done
      if ((byte & 0x80) == 0) {
        break decoding;
      };

      shift += 7;
    };

    { value = total; length = len };
  };
};
