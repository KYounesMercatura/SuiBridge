// backend/BridgeState.mo
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Array "mo:base/Array";

module {
  // A deposit we locked on ICP side
  public type Deposit = {
    id : Nat;
    user : Principal;
    amount : Nat;          // use Nat so you can store ICRC-1 amounts directly
    suiRecipient : Text;
    createdAt : Int;
    released : Bool;
    suiBurnTx : ?Text;
  };

  // create a new deposit record
  public func makeDeposit(
    id : Nat,
    user : Principal,
    amount : Nat,
    suiRecipient : Text
  ) : Deposit {
    {
      id;
      user;
      amount;
      suiRecipient;
      createdAt = Time.now();
      released = false;
      suiBurnTx = null;
    };
  };

  // mark an existing deposit as released
  public func markReleased(d : Deposit, burnTx : Text) : Deposit {
    {
      id = d.id;
      user = d.user;
      amount = d.amount;
      suiRecipient = d.suiRecipient;
      createdAt = d.createdAt;
      released = true;
      suiBurnTx = ?burnTx;
    };
  };

  // replace a deposit with same id inside an array
  public func upsertDeposit(
    deposits : [Deposit],
    updated : Deposit
  ) : [Deposit] {
    var out : [Deposit] = [];
    for (d in deposits.vals()) {
      if (d.id == updated.id) {
        out := Array.append(out, [updated]);
      } else {
        out := Array.append(out, [d]);
      };
    };
    out;
  };

  // filter deposits for a specific user
  public func depositsFor(
    deposits : [Deposit],
    user : Principal
  ) : [Deposit] {
    Array.filter<Deposit>(deposits, func (d) = (d.user == user));
  };

  // find one deposit by id (returns null if not found)
  public func findById(
    deposits : [Deposit],
    id : Nat
  ) : ?Deposit {
    for (d in deposits.vals()) {
      if (d.id == id) {
        return ?d;
      };
    };
    null;
  };
}
