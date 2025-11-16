import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Result "mo:base/Result";
import Ledger "ledger";

module {
  // static texts so top-level stays pure
  let LEDGER_ID_TEXT : Text = Ledger.LEDGER_CANISTER_ID;
  let BRIDGE_CANISTER_TEXT : Text = "mb53b-xiaaa-aaaad-actrq-cai";

  // helper to get ledger actor
  func ledger() : Ledger.Ledger = actor (LEDGER_ID_TEXT);

  // helper to get bridge canister principal
  func bridgePrincipal() : Principal = Principal.fromText(BRIDGE_CANISTER_TEXT);

  // =============== deposit ===============
  public func depositICP(
    from : Ledger.IcrcAccount,
    amount : Nat64
  ) : async Result.Result<Nat64, Text> {
    let icp = ledger();
    let toAccount : Ledger.IcrcAccount = {
      owner = bridgePrincipal();
      subaccount = null;
    };

    let arg : Ledger.IcrcTransferArg = {
      to = toAccount;
      amount = Nat64.toNat(amount);   // ✅ convert Nat64 -> Nat
      fee = null;
      from_subaccount = from.subaccount;
      memo = null;
      created_at_time = null;
    };

    let res = await icp.icrc1_transfer(arg);
    switch (res) {
      case (#Ok(idx)) {
        #ok(Nat64.fromNat(idx));
      };
      case (#Err(_e)) {
        #err("Deposit failed (icrc1_transfer)");
      };
    };
  };

  // =============== withdraw ===============
  public func withdrawICP(
    to : Ledger.IcrcAccount,
    amount : Nat64
  ) : async Result.Result<Nat64, Text> {
    let icp = ledger();
    let fromAccount : Ledger.IcrcAccount = {
      owner = bridgePrincipal();
      subaccount = null;
    };

    let arg : Ledger.IcrcTransferArg = {
      to = to;
      amount = Nat64.toNat(amount);   // ✅ convert Nat64 -> Nat
      fee = null;
      from_subaccount = fromAccount.subaccount;
      memo = null;
      created_at_time = null;
    };

    let res = await icp.icrc1_transfer(arg);
    switch (res) {
      case (#Ok(idx)) {
        #ok(Nat64.fromNat(idx));
      };
      case (#Err(_e)) {
        #err("Withdraw failed (icrc1_transfer)");
      };
    };
  };

  // =============== balance ===============
  public func getBalance(
    account : Ledger.IcrcAccount
  ) : async Result.Result<Nat64, Text> {
    let icp = ledger();
    let balNat = await icp.icrc1_balance_of(account);
    #ok(Nat64.fromNat(balNat));
  };
};
