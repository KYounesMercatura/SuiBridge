import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";

module {
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    var userRoles : HashMap.HashMap<Principal, UserRole>;
  };

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      var userRoles = HashMap.HashMap<Principal, UserRole>(0, Principal.equal, Principal.hash);
    };
  };

  // First principal that calls this function becomes admin
  // ONLY assigns admin if no admin exists yet
  public func initialize(state : AccessControlState, caller : Principal) {
    if (not Principal.isAnonymous(caller)) {
      // ONLY assign admin if NO admin exists yet AND caller has no role
      if (not state.adminAssigned) {
        state.userRoles.put(caller, #admin);
        state.adminAssigned := true;
      };
      // Don't overwrite existing roles on subsequent calls
    };
  };

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (Principal.isAnonymous(caller)) {
      #guest;
    } else {
      switch (state.userRoles.get(caller)) {
        case (?role) { role };
        case (null) {
          Debug.trap("User is not registered");
        };
      };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      Debug.trap("Unauthorized: Only admins can assign user roles");
    };
    state.userRoles.put(user, role);
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let role = getUserRole(state, caller);
    switch (role) {
      case (#admin) { 
        // ✅ Admins can do EVERYTHING
        true 
      };
      case (#user) {
        switch (requiredRole) {
          case (#admin) { false };
          case (#user) { true };
          case (#guest) { true };
        };
      };
      case (#guest) {
        switch (requiredRole) {
          case (#admin) { false };
          case (#user) { false };
          case (#guest) { true };
        };
      };
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    switch (state.userRoles.get(caller)) {
      case (?#admin) true;
      case _ false;
    };
  };
};