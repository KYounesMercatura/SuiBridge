import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Cycles "mo:base/ExperimentalCycles";
import Blake2b "mo:blake2b";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Int "mo:base/Int";
import OutCall "outcall";

import Ledger "ledger";          // ICP + ICRC types
import Bridge1 "Bridge1";        // ICP ledger mover (deposit/withdraw)
import BridgeState "BridgeState"; // pure deposit record helpers

actor Backend {
  let KEY_NAME = "key_1";

  // optional: direct ledger handle for read helpers
  let ledger : Ledger.Ledger = actor (Ledger.LEDGER_CANISTER_ID);

  // =========================
  // stable config
  // =========================
  private stable var admin : Principal = Principal.fromText("aaaaa-aa");
  private stable var paused : Bool = false;
  private stable var suiPackageId : Text = "";
  private stable var gasObjectId : Text = "";
  private stable var gasVersion : Nat64 = 0;
  private stable var gasDigest : Text = "";
  private stable var treasuryCapId : Text = "";
  private stable var treasuryCapVersion : Nat64 = 0;
  private stable var treasuryCapDigest : Text = "";
  private stable var canisterSuiAddress : Text = "";

  // stable map for user → sui address
  private stable var userSuiAddressesEntries : [(Principal, Text)] = [];
  private var userSuiAddresses = HashMap.HashMap<Principal, Text>(
    10,
    Principal.equal,
    Principal.hash
  );

  // stable deposit records
  private stable var depositRecords : [BridgeState.Deposit] = [];
  private stable var nextDepositId : Nat = 0;

  // ======================================================
  // NEW: per-principal Sui-minted tokens
  // ======================================================

  public type MintedSuiCoin = {
    objectId : Text;
    digest : Text;
    amount : Nat64;
    tokenType : Text;
    ts : Int;
    depositId : ?Nat;
  };

  // stable backing
  private stable var mintedSuiEntries : [(Principal, [MintedSuiCoin])] = [];
  // in-memory map
  private var mintedSui = HashMap.HashMap<Principal, [MintedSuiCoin]>(
    10,
    Principal.equal,
    Principal.hash
  );

  // management for ECDSA (unchanged)
  type ManagementCanister = actor {
    ecdsa_public_key : ({
      canister_id : ?Principal;
      derivation_path : [Blob];
      key_id : { curve : { #secp256k1 }; name : Text };
    }) -> async { public_key : Blob; chain_code : Blob };

    sign_with_ecdsa : ({
      message_hash : Blob;
      derivation_path : [Blob];
      key_id : { curve : { #secp256k1 }; name : Text };
    }) -> async { signature : Blob };
  };

  // =========================
  // upgrades
  // =========================

  system func preupgrade() {
    userSuiAddressesEntries := Iter.toArray(userSuiAddresses.entries());
    mintedSuiEntries := Iter.toArray(mintedSui.entries());
    // depositRecords and nextDepositId are already stable
  };

  system func postupgrade() {
    userSuiAddresses := HashMap.fromIter<Principal, Text>(
      userSuiAddressesEntries.vals(),
      10,
      Principal.equal,
      Principal.hash
    );
    userSuiAddressesEntries := [];

    mintedSui := HashMap.fromIter<Principal, [MintedSuiCoin]>(
      mintedSuiEntries.vals(),
      10,
      Principal.equal,
      Principal.hash
    );
    mintedSuiEntries := [];
  };

  // =========================
  // admin / setup
  // =========================

  public shared ({ caller }) func initialize() : async () {
    if (admin == Principal.fromText("aaaaa-aa")) {
      admin := caller;
    };
  };

  public shared ({ caller }) func setup(
    packageId: Text,
    gasObj: Text,
    gasVer: Nat64,
    gasDig: Text
  ) : async () {
    assert (caller == admin);
    suiPackageId := packageId;
    gasObjectId := gasObj;
    gasVersion := gasVer;
    gasDigest := gasDig;
    paused := false;
  };

  public shared ({ caller }) func setTreasuryCap(objId: Text, version: Nat64, digest: Text) : async () {
    assert (caller == admin);
    treasuryCapId := objId;
    treasuryCapVersion := version;
    treasuryCapDigest := digest;
  };

  // =========================
  // ICP / ICRC helpers
  // =========================

  public func getCanisterIcrcBalance() : async Nat64 {
    let acct : Ledger.IcrcAccount = {
      owner = Principal.fromActor(Backend);
      subaccount = null;
    };
    let bal : Nat = await ledger.icrc1_balance_of(acct);
    Nat64.fromNat(bal);
  };

  public query ({ caller }) func getMyRegisteredSuiAddress() : async ?Text {
    userSuiAddresses.get(caller);
  };

  // =========================
  // bridge → Bridge1 + record in BridgeState
  // =========================

  // user → bridge (deposit) AND record it
  public shared ({ caller }) func bridgeDeposit(amount : Nat64, suiRecipient : Text)
    : async { ok : Bool; msg : Text; depositId : ?Nat }
  {
    if (paused) {
      return { ok = false; msg = "Bridge paused"; depositId = null };
    };

    let from : Ledger.IcrcAccount = {
      owner = caller;
      subaccount = null;
    };

    let res = await Bridge1.depositICP(from, amount);
    switch (res) {
      case (#ok(height)) {
        let myId = nextDepositId;
        nextDepositId += 1;
        let rec = BridgeState.makeDeposit(
          myId,
          caller,
          Nat64.toNat(amount),
          suiRecipient,
        );
        depositRecords := Array.append(depositRecords, [rec]);

        {
          ok = true;
          msg = "Deposit sent to ICP ledger, height = " # Nat64.toText(height);
          depositId = ?myId;
        };
      };
      case (#err(e)) {
        {
          ok = false;
          msg = e;
          depositId = null;
        };
      };
    };
  };

  // bridge → user (withdraw)
  public shared ({ caller }) func bridgeWithdraw(amount : Nat64)
    : async { ok : Bool; msg : Text }
  {
    if (paused) {
      return { ok = false; msg = "Bridge paused" };
    };

    let to : Ledger.IcrcAccount = {
      owner = caller;
      subaccount = null;
    };

    let res = await Bridge1.withdrawICP(to, amount);
    switch (res) {
      case (#ok(height)) {
        { ok = true; msg = "Withdrawal sent, ledger height = " # Nat64.toText(height) };
      };
      case (#err(e)) {
        { ok = false; msg = e };
      };
    };
  };

  // list my deposit records
  public query ({ caller }) func getMyDeposits() : async [BridgeState.Deposit] {
    BridgeState.depositsFor(depositRecords, caller);
  };

  // mark a deposit as released manually
  public shared ({ caller }) func markDepositReleased(depositId : Nat, suiBurnTx : Text) : async Bool {
    switch (BridgeState.findById(depositRecords, depositId)) {
      case null { false };
      case (?d) {
        if (caller != admin and caller != d.user) {
          return false;
        };
        let updated = BridgeState.markReleased(d, suiBurnTx);
        depositRecords := BridgeState.upsertDeposit(depositRecords, updated);
        true;
      };
    };
  };

  // ======================================================
  // record Sui-minted tokens for this principal
  // ======================================================
  public shared ({ caller }) func recordSuiMint(
    objectId : Text,
    digest : Text,
    amount : Nat64,
    tokenType : Text,
    depositId : ?Nat,
  ) : async () {
    let existing : [MintedSuiCoin] = switch (mintedSui.get(caller)) {
      case null { [] };
      case (?arr) { arr };
    };

    let entry : MintedSuiCoin = {
      objectId = objectId;
      digest = digest;
      amount = amount;
      tokenType = tokenType;
      ts = Time.now();
      depositId = depositId;
    };

    let updated = Array.append<MintedSuiCoin>(existing, [entry]);
    mintedSui.put(caller, updated);
  };

  public query ({ caller }) func getMySuiMints() : async [MintedSuiCoin] {
    switch (mintedSui.get(caller)) {
      case null { [] };
      case (?arr) { arr };
    };
  };

  // =========================
  // derive Sui address from ICP ECDSA pubkey
  // =========================

  public shared ({ caller }) func deriveAndStoreSuiAddress() : async Text {
    assert (caller == admin);
    let management : ManagementCanister = actor "aaaaa-aa";

    let pkResp = await management.ecdsa_public_key({
      canister_id = null;
      derivation_path = [];
      key_id = { curve = #secp256k1; name = KEY_NAME };
    });

    let compressedPubkey = Blob.toArray(pkResp.public_key);

    var addrInput : [Nat8] = [0x01];
    addrInput := Array.append(addrInput, compressedPubkey);

    let addressHash = Blake2b.hash(
      Blob.fromArray(addrInput),
      ?{ digest_length = 32; key = null; salt = null; personal = null }
    );

  canisterSuiAddress := "0x" # blobToHex(addressHash);
    canisterSuiAddress;
  };

  public shared ({ caller }) func registerSuiAddress(suiAddress: Text) : async () {
    userSuiAddresses.put(caller, suiAddress);
  };

  // =========================
  // ECDSA signing
  // =========================

  public shared ({ caller }) func signTransactionHash(txHash: [Nat8]) : async {
    signature: [Nat8];
    publicKey: [Nat8];
  } {
    let management : ManagementCanister = actor "aaaaa-aa";
    Cycles.add<system>(30_000_000_000);

    let signResponse = await management.sign_with_ecdsa({
      message_hash = Blob.fromArray(txHash);
      derivation_path = [];
      key_id = { curve = #secp256k1; name = KEY_NAME };
    });

    let signature = Blob.toArray(signResponse.signature);

    let publicKeyResponse = await management.ecdsa_public_key({
      canister_id = null;
      derivation_path = [];
      key_id = { curve = #secp256k1; name = KEY_NAME };
    });
    let pubkey = Blob.toArray(publicKeyResponse.public_key);

    {
      signature = signature;
      publicKey = pubkey;
    };
  };

  // =========================
  // helper: hex
  // =========================

  private func digitToHex(digit : Nat) : Text {
    let chars = "0123456789abcdef";
    let iter = Text.toIter(chars);
    var i = 0;
    label l loop {
      switch (iter.next()) {
        case (?c) {
          if (i == digit) return Text.fromChar(c);
          i += 1;
        };
        case null break l;
      };
    };
    "0";
  };

  private func blobToHex(blob : Blob) : Text {
    let bytes = Blob.toArray(blob);
    var result = "";
    for (byte in bytes.vals()) {
      let high = Nat8.toNat(byte) / 16;
      let low = Nat8.toNat(byte) % 16;
      result #= digitToHex(high) # digitToHex(low);
    };
    result;
  };

  // =========================
  // HTTP transform
  // =========================

  public query func transform(
    input : OutCall.TransformationInput
  ) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // =========================
  // fetch Sui tx (still useful to debug from frontend)
  // =========================

  public shared func getSuiTx(txDigest : Text) : async Text {
    let url = "https://fullnode.mainnet.sui.io:443/";
    let body =
      "{ \"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"sui_getTransactionBlock\", \"params\": [\"" #
      txDigest # "\", {\"showEvents\": true}] }";
    let headers : [OutCall.Header] = [
      { name = "Content-Type"; value = "application/json" }
    ];

    let respText = await OutCall.httpPostRequest(url, headers, body, transform);
    respText;
  };

  // =========================================
  // tiny helper: find an unreleased deposit
  // =========================================

  private func findDeposit(p : Principal, amount : Nat) : ?BridgeState.Deposit {
    for (d in depositRecords.vals()) {
      if (d.user == p and d.amount == amount and d.released == false) {
        return ?d;
      };
    };
    null;
  };

  // =========================================
  // FRONTEND-CALLED release:
  // "I (frontend) saw the Sui burn, here is the principal/amount/tx"
  // =========================================

  public shared func releaseFromFrontend(
    icpPrincipalText : Text,
    amount : Nat,
    suiBurnTx : Text
  ) : async Text {
    let p = Principal.fromText(icpPrincipalText);
    let depOpt = findDeposit(p, amount);

    switch (depOpt) {
      case null {
        return "no matching deposit for that principal+amount";
      };
      case (?dep) {
        // mark released
        let updated = BridgeState.markReleased(dep, suiBurnTx);
        depositRecords := BridgeState.upsertDeposit(depositRecords, updated);

        // pay back ICP
        let acct : Ledger.IcrcAccount = {
          owner = p;
          subaccount = null;
        };

        let res = await Bridge1.withdrawICP(acct, Nat64.fromNat(amount));
        switch (res) {
          case (#ok(_)) { return "released"; };
          case (#err(e)) { return "marked released but withdraw failed: " # e; };
        };
      };
    };
  };

  // =========================
  // config getter
  // =========================

  public query func getConfig() : async {
    admin: Principal;
    paused: Bool;
    packageId: Text;
    gasObjectId: Text;
    treasuryCapId: Text;
    canisterSuiAddress: Text;
  } {
    {
      admin;
      paused;
      packageId = suiPackageId;
      gasObjectId;
      treasuryCapId;
      canisterSuiAddress;
    };
  };
};
