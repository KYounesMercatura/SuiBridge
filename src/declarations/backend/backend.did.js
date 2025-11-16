export const idlFactory = ({ IDL }) => {
  const Deposit = IDL.Record({
    'id' : IDL.Nat,
    'suiBurnTx' : IDL.Opt(IDL.Text),
    'suiRecipient' : IDL.Text,
    'createdAt' : IDL.Int,
    'user' : IDL.Principal,
    'released' : IDL.Bool,
    'amount' : IDL.Nat,
  });
  const MintedSuiCoin = IDL.Record({
    'ts' : IDL.Int,
    'depositId' : IDL.Opt(IDL.Nat),
    'objectId' : IDL.Text,
    'tokenType' : IDL.Text,
    'digest' : IDL.Text,
    'amount' : IDL.Nat64,
  });
  const http_header = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const http_request_result = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(http_header),
  });
  const TransformationInput = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : http_request_result,
  });
  const TransformationOutput = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(http_header),
  });
  return IDL.Service({
    'bridgeDeposit' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [
          IDL.Record({
            'ok' : IDL.Bool,
            'msg' : IDL.Text,
            'depositId' : IDL.Opt(IDL.Nat),
          }),
        ],
        [],
      ),
    'bridgeWithdraw' : IDL.Func(
        [IDL.Nat64],
        [IDL.Record({ 'ok' : IDL.Bool, 'msg' : IDL.Text })],
        [],
      ),
    'deriveAndStoreSuiAddress' : IDL.Func([], [IDL.Text], []),
    'getCanisterIcrcBalance' : IDL.Func([], [IDL.Nat64], []),
    'getConfig' : IDL.Func(
        [],
        [
          IDL.Record({
            'admin' : IDL.Principal,
            'treasuryCapId' : IDL.Text,
            'canisterSuiAddress' : IDL.Text,
            'gasObjectId' : IDL.Text,
            'paused' : IDL.Bool,
            'packageId' : IDL.Text,
          }),
        ],
        ['query'],
      ),
    'getMyDeposits' : IDL.Func([], [IDL.Vec(Deposit)], ['query']),
    'getMyRegisteredSuiAddress' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'getMySuiMints' : IDL.Func([], [IDL.Vec(MintedSuiCoin)], ['query']),
    'getSuiTx' : IDL.Func([IDL.Text], [IDL.Text], []),
    'initialize' : IDL.Func([], [], []),
    'markDepositReleased' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
    'recordSuiMint' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat64, IDL.Text, IDL.Opt(IDL.Nat)],
        [],
        [],
      ),
    'registerSuiAddress' : IDL.Func([IDL.Text], [], []),
    'releaseFromFrontend' : IDL.Func(
        [IDL.Text, IDL.Nat, IDL.Text],
        [IDL.Text],
        [],
      ),
    'setTreasuryCap' : IDL.Func([IDL.Text, IDL.Nat64, IDL.Text], [], []),
    'setup' : IDL.Func([IDL.Text, IDL.Text, IDL.Nat64, IDL.Text], [], []),
    'signTransactionHash' : IDL.Func(
        [IDL.Vec(IDL.Nat8)],
        [
          IDL.Record({
            'signature' : IDL.Vec(IDL.Nat8),
            'publicKey' : IDL.Vec(IDL.Nat8),
          }),
        ],
        [],
      ),
    'transform' : IDL.Func(
        [TransformationInput],
        [TransformationOutput],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
