// backend/ledger.mo
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";

module {
  // Mainnet ICP ledger canister
  public let LEDGER_CANISTER_ID : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";

  //
  // ===== 1. Classic ICP Ledger Types =====
  // These are from the original ledger (AccountIdentifier + transfer)
  //

  // 32-byte account identifier (hashed principal+subaccount on the real ledger)
  public type AccountIdentifier = Blob;

  // Amount in e8s
  public type Tokens = {
    e8s : Nat64;
  };

  // Transfer memo (u64)
  public type Memo = Nat64;

  // ICP timestamp
  public type TimeStamp = {
    timestamp_nanos : Nat64;
  };

  // 32-byte subaccount (classic ledger uses [Nat8])
  public type Subaccount = [Nat8];

  // Ledger block index
  public type BlockIndex = Nat64;

  // Args for classic ledger transfer
  public type TransferArgs = {
    memo : Memo;
    amount : Tokens;
    fee : Tokens;
    from_subaccount : ?Subaccount;
    to : AccountIdentifier;
    created_at_time : ?TimeStamp;
  };

  // Errors for classic ledger transfer
  public type TransferError = {
    #BadFee : { expected_fee : Tokens };
    #InsufficientFunds : { balance : Tokens };
    #TxTooOld : { allowed_window_nanos : Nat64 };
    #TxCreatedInFuture;
    #TxDuplicate : { duplicate_of : BlockIndex };
  };

  // Result for classic ledger transfer
  public type TransferResult = {
    #Ok : BlockIndex;
    #Err : TransferError;
  };

  //
  // ===== 2. ICRC-1 Types =====
  // These are from the newer standard the ICP ledger also implements.
  // Difference: it uses principal+subaccount directly and Nat amounts.
  //

  // ICRC account = owner principal + optional 32-byte subaccount
  public type IcrcAccount = {
    owner : Principal;
    subaccount : ?[Nat8];
  };

  // ICRC metadata values
  public type MetadataValue = {
    #Int : Int;
    #Nat : Nat;
    #Blob : [Nat8];
    #Text : Text;
  };

  public type StandardRecord = {
    name : Text;
    url : Text;
  };

  // Args for icrc1_transfer
  public type IcrcTransferArg = {
    to : IcrcAccount;
    amount : Nat;
    fee : ?Nat;
    from_subaccount : ?[Nat8];
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };

  // Errors for icrc1_transfer
  public type IcrcTransferError = {
    #InsufficientFunds : { balance : Nat };
    #BadFee : { expected_fee : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
    #BadBurn : { min_burn_amount : Nat };
  };

  public type IcrcTransferResult = {
    #Ok : Nat; // block index
    #Err : IcrcTransferError;
  };

  //
  // ===== 3. Ledger Actor Interface =====
  // We expose both classic + ICRC-1 so the backend can choose.
  //

  public type Ledger = actor {
    // --- classic ICP ledger ---
    transfer : shared TransferArgs -> async TransferResult;
    account_balance : shared query AccountIdentifier -> async Tokens;

    // --- ICRC-1 surface (subset that’s usually needed) ---
    icrc1_name : shared query () -> async Text;
    icrc1_symbol : shared query () -> async Text;
    icrc1_decimals : shared query () -> async Nat8;
    icrc1_fee : shared query () -> async Nat;
    icrc1_metadata : shared query () -> async [(Text, MetadataValue)];
    icrc1_total_supply : shared query () -> async Nat;
    icrc1_supported_standards : shared query () -> async [StandardRecord];
    icrc1_balance_of : shared query IcrcAccount -> async Nat;
    icrc1_transfer : shared IcrcTransferArg -> async IcrcTransferResult;
  };
}
