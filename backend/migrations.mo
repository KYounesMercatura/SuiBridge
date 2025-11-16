import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";

module {
  public type StableData = {
    admin: Principal;
    paused: Bool;
    suiPackageId: Text;
    gasObjectId: Text;
    gasVersion: Nat64;
    gasDigest: Text;
    treasuryCapId: Text;
    treasuryCapVersion: Nat64;
    treasuryCapDigest: Text;
    canisterSuiAddress: Text;
    userSuiAddressesEntries: [(Principal, Text)];
  };

  public func toStable(
    admin: Principal,
    paused: Bool,
    suiPackageId: Text,
    gasObjectId: Text,
    gasVersion: Nat64,
    gasDigest: Text,
    treasuryCapId: Text,
    treasuryCapVersion: Nat64,
    treasuryCapDigest: Text,
    canisterSuiAddress: Text,
    userSuiAddresses: HashMap.HashMap<Principal, Text>
  ) : StableData {
    {
      admin = admin;
      paused = paused;
      suiPackageId = suiPackageId;
      gasObjectId = gasObjectId;
      gasVersion = gasVersion;
      gasDigest = gasDigest;
      treasuryCapId = treasuryCapId;
      treasuryCapVersion = treasuryCapVersion;
      treasuryCapDigest = treasuryCapDigest;
      canisterSuiAddress = canisterSuiAddress;
      userSuiAddressesEntries = Iter.toArray(userSuiAddresses.entries());
    };
  };

  public func fromStable(
    data: StableData
  ) : {
    admin: Principal;
    paused: Bool;
    suiPackageId: Text;
    gasObjectId: Text;
    gasVersion: Nat64;
    gasDigest: Text;
    treasuryCapId: Text;
    treasuryCapVersion: Nat64;
    treasuryCapDigest: Text;
    canisterSuiAddress: Text;
    userSuiAddresses: HashMap.HashMap<Principal, Text>;
  } {
    {
      admin = data.admin;
      paused = data.paused;
      suiPackageId = data.suiPackageId;
      gasObjectId = data.gasObjectId;
      gasVersion = data.gasVersion;
      gasDigest = data.gasDigest;
      treasuryCapId = data.treasuryCapId;
      treasuryCapVersion = data.treasuryCapVersion;
      treasuryCapDigest = data.treasuryCapDigest;
      canisterSuiAddress = data.canisterSuiAddress;
      userSuiAddresses = HashMap.fromIter<Principal, Text>(
        data.userSuiAddressesEntries.vals(),
        10,
        Principal.equal,
        Principal.hash
      );
    };
  };
};