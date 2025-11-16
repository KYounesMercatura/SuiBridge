import Text "mo:base/Text";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";
import Iter "mo:base/Iter";
import Buffer "mo:base/Buffer";
import Nat64 "mo:base/Nat64";

module {
  // Convert Nat to hex string (with 0x prefix)
  public func natToHex(n : Nat) : Text {
    if (n == 0) return "0x0";
    var num = n;
    var hex = "";
    let hexChars = "0123456789abcdef";
    
    while (num > 0) {
      let digit = num % 16;
      let char = Text.fromIter(Iter.fromArray([switch (digit) {
        case 0 '0'; case 1 '1'; case 2 '2'; case 3 '3';
        case 4 '4'; case 5 '5'; case 6 '6'; case 7 '7';
        case 8 '8'; case 9 '9'; case 10 'a'; case 11 'b';
        case 12 'c'; case 13 'd'; case 14 'e'; case 15 'f';
        case _ '0';
      }]));
      hex := char # hex;
      num := num / 16;
    };
    "0x" # hex;
  };

  // Convert Nat to fixed-length hex (no 0x, padded to bytesLength)
  public func natToHexPadded(n : Nat, bytesLength : Nat) : Text {
    var num = n;
    var hex = "";
    
    if (num == 0) {
      hex := "0";
    } else {
      while (num > 0) {
        let digit = num % 16;
        let char = Text.fromIter(Iter.fromArray([switch (digit) {
          case 0 '0'; case 1 '1'; case 2 '2'; case 3 '3';
          case 4 '4'; case 5 '5'; case 6 '6'; case 7 '7';
          case 8 '8'; case 9 '9'; case 10 'a'; case 11 'b';
          case 12 'c'; case 13 'd'; case 14 'e'; case 15 'f';
          case _ '0';
        }]));
        hex := char # hex;
        num := num / 16;
      };
    };
    
    // Pad to required length (2 chars per byte)
    let requiredLength = bytesLength * 2;
    while (hex.size() < requiredLength) {
      hex := "0" # hex;
    };
    hex;
  };

  // Convert hex string to Nat
  public func hexToNat(hexString : Text) : Nat {
    let hex = if (Text.startsWith(hexString, #text "0x")) {
      let chars = Iter.toArray(Text.toIter(hexString));
      Text.fromIter(Iter.fromArray(Array.tabulate<Char>(chars.size() - 2, func(i) { chars[i + 2] })));
    } else {
      hexString;
    };
    
    var result : Nat = 0;
    for (c in Text.toIter(hex)) {
      let digit = switch c {
        case '0' 0; case '1' 1; case '2' 2; case '3' 3;
        case '4' 4; case '5' 5; case '6' 6; case '7' 7;
        case '8' 8; case '9' 9;
        case 'a' 10; case 'A' 10;
        case 'b' 11; case 'B' 11;
        case 'c' 12; case 'C' 12;
        case 'd' 13; case 'D' 13;
        case 'e' 14; case 'E' 14;
        case 'f' 15; case 'F' 15;
        case _ 0;
      };
      result := result * 16 + digit;
    };
    result;
  };

  // Pad address to 32 bytes (64 hex chars)
  public func padAddress(address : Text) : Text {
    var addr = Text.trimStart(address, #text "0x");
    while (addr.size() < 64) {
      addr := "0" # addr;
    };
    addr;
  };

  // Simple RLP encoding for transaction fields
  public func rlpEncodeLength(len : Nat, offset : Nat) : [Nat8] {
    if (len < 56) {
      [Nat8.fromNat(len + offset)];
    } else {
      let lenBytes = natToBytes(len);
      let firstByte = Nat8.fromNat(lenBytes.size() + offset + 55);
      Array.append([firstByte], lenBytes);
    };
  };

  // Convert Nat to bytes (big-endian)
  public func natToBytes(n : Nat) : [Nat8] {
    if (n == 0) return [0];
    
    let buffer = Buffer.Buffer<Nat8>(8);
    var num = n;
    
    while (num > 0) {
      buffer.add(Nat8.fromNat(num % 256));
      num := num / 256;
    };
    
    let bytes = Buffer.toArray(buffer);
    Array.reverse(bytes);
  };

  // Convert hex string to bytes
  public func hexToBytes(hex : Text) : [Nat8] {
    let cleanHex = Text.trimStart(hex, #text "0x");
    let buffer = Buffer.Buffer<Nat8>(cleanHex.size() / 2);
    
    let chars = Iter.toArray(Text.toIter(cleanHex));
    var i = 0;
    
    while (i < chars.size()) {
      if (i + 1 < chars.size()) {
        let highNibble = charToNibble(chars[i]);
        let lowNibble = charToNibble(chars[i + 1]);
        buffer.add(Nat8.fromNat(highNibble * 16 + lowNibble));
        i += 2;
      } else {
        i += 1;
      };
    };
    
    Buffer.toArray(buffer);
  };

  // Convert char to nibble (0-15)
  func charToNibble(c : Char) : Nat {
    switch c {
      case '0' 0; case '1' 1; case '2' 2; case '3' 3;
      case '4' 4; case '5' 5; case '6' 6; case '7' 7;
      case '8' 8; case '9' 9;
      case 'a' 10; case 'A' 10;
      case 'b' 11; case 'B' 11;
      case 'c' 12; case 'C' 12;
      case 'd' 13; case 'D' 13;
      case 'e' 14; case 'E' 14;
      case 'f' 15; case 'F' 15;
      case _ 0;
    };
  };

  // Convert bytes to hex string
  public func bytesToHex(bytes : [Nat8]) : Text {
    let hexChars = "0123456789abcdef";
    var result = "";
    for (byte in bytes.vals()) {
      let high = Nat8.toNat(byte) / 16;
      let low = Nat8.toNat(byte) % 16;
      result #= Text.fromIter(Iter.fromArray([
        Iter.toArray(Text.toIter(hexChars))[high],
        Iter.toArray(Text.toIter(hexChars))[low]
      ]));
    };
    "0x" # result;
  };

  // Build Ethereum transaction for signing
  public func buildTransaction(
    nonce : Nat,
    gasPrice : Nat,
    gasLimit : Nat,
    to : Text,
    value : Nat,
    data : Text,
    chainId : Nat
  ) : Text {
    "{" #
      "\"nonce\":\"" # natToHex(nonce) # "\"," #
      "\"gasPrice\":\"" # natToHex(gasPrice) # "\"," #
      "\"gas\":\"" # natToHex(gasLimit) # "\"," #
      "\"to\":\"" # to # "\"," #
      "\"value\":\"" # natToHex(value) # "\"," #
      "\"data\":\"" # data # "\"," #
      "\"chainId\":\"" # natToHex(chainId) # "\"" #
    "}";
  };
};