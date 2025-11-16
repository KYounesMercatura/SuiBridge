import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Cycles "mo:base/ExperimentalCycles";

actor class Factory(init_admin : Principal) = this {

  // --- admin and template wasm ---
  private stable var admin : Principal = init_admin;
  private stable var templateWasm : ?Blob = null;

  // principal -> vault canister id
  private stable var mapEntries : [(Principal, Principal)] = [];
  private var registry = HashMap.HashMap<Principal, Principal>(256, Principal.equal, Principal.hash);

  // mgmt interface
  type IC = actor {
    create_canister : ({ settings : ?{
      controllers : ?[Principal];
      compute_allocation : ?Nat;
      memory_allocation : ?Nat;
      freezing_threshold : ?Nat;
    } }) -> async { canister_id : Principal };
    install_code : ({
      mode : { #install; #reinstall; #upgrade };
      canister_id : Principal;
      wasm_module : Blob;
      arg : Blob;
    }) -> async ();
  };
  let ic : IC = actor "aaaaa-aa";

  // persist
  system func preupgrade() { mapEntries := Iter.toArray(registry.entries()) };
  system func postupgrade() {
    registry := HashMap.fromIter<Principal, Principal>(mapEntries.vals(), 256, Principal.equal, Principal.hash);
    mapEntries := [];
  };

  // set or rotate template wasm (admin only)
  public shared ({ caller }) func setTemplateWasm(wasm : Blob) : async () {
    assert caller == admin;
    templateWasm := ?wasm;
  };

  public query func getTemplateSet() : async Bool {
    switch templateWasm { case null false; case (?_) true };
  };

  // idempotent: returns existing vault if present
  public query ({ caller }) func getMyVault() : async ?Principal {
    registry.get(caller);
  };

  // spawn a new vault for caller
  public shared ({ caller }) func spawnVault() : async { canister_id : Principal } {
    switch (registry.get(caller)) {
      case (?cid) { return { canister_id = cid } };
      case null {
        assert templateWasm != null;

        // pay cycles to create
        Cycles.add<system>(200_000_000_000); // tune
        let { canister_id } = await ic.create_canister({
          settings = ?{
            controllers = ?[Principal.fromActor(this)]; // factory controls during init
            compute_allocation = null;
            memory_allocation = null;
            freezing_threshold = null;
          }
        });

        // init args for vault: set the factory as parent
        let initArg = to_candid (caller, Principal.fromActor(this));

        // install template
        await ic.install_code({
          mode = #install;
          canister_id;
          wasm_module = switch templateWasm { case (?w) w; case null Blob.fromArray([]) };
          arg = initArg;
        });

        // optional: drop control to make vault sovereign
        // controller can later be transferred to blackhole or SNS by proposal flow

        registry.put(caller, canister_id);
        { canister_id };
      }
    }
  };

  // lookup helper
  public query func lookup(p : Principal) : async ?Principal {
    registry.get(p);
  };

  // admin rotate admin
  public shared ({ caller }) func setAdmin(p : Principal) : async () {
    assert caller == admin;
    admin := p;
  };
}
