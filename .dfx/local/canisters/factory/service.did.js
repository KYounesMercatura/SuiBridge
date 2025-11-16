export const idlFactory = ({ IDL }) => {
  const Factory = IDL.Service({
    'getMyVault' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'getTemplateSet' : IDL.Func([], [IDL.Bool], ['query']),
    'lookup' : IDL.Func([IDL.Principal], [IDL.Opt(IDL.Principal)], ['query']),
    'setAdmin' : IDL.Func([IDL.Principal], [], []),
    'setTemplateWasm' : IDL.Func([IDL.Vec(IDL.Nat8)], [], []),
    'spawnVault' : IDL.Func(
        [],
        [IDL.Record({ 'canister_id' : IDL.Principal })],
        [],
      ),
  });
  return Factory;
};
export const init = ({ IDL }) => { return [IDL.Principal]; };
