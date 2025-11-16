import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Deposit {
  'id' : bigint,
  'suiBurnTx' : [] | [string],
  'suiRecipient' : string,
  'createdAt' : bigint,
  'user' : Principal,
  'released' : boolean,
  'amount' : bigint,
}
export interface MintedSuiCoin {
  'ts' : bigint,
  'depositId' : [] | [bigint],
  'objectId' : string,
  'tokenType' : string,
  'digest' : string,
  'amount' : bigint,
}
export interface TransformationInput {
  'context' : Uint8Array | number[],
  'response' : http_request_result,
}
export interface TransformationOutput {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<http_header>,
}
export interface http_header { 'value' : string, 'name' : string }
export interface http_request_result {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<http_header>,
}
export interface _SERVICE {
  'bridgeDeposit' : ActorMethod<
    [bigint, string],
    { 'ok' : boolean, 'msg' : string, 'depositId' : [] | [bigint] }
  >,
  'bridgeWithdraw' : ActorMethod<[bigint], { 'ok' : boolean, 'msg' : string }>,
  'deriveAndStoreSuiAddress' : ActorMethod<[], string>,
  'getCanisterIcrcBalance' : ActorMethod<[], bigint>,
  'getConfig' : ActorMethod<
    [],
    {
      'admin' : Principal,
      'treasuryCapId' : string,
      'canisterSuiAddress' : string,
      'gasObjectId' : string,
      'paused' : boolean,
      'packageId' : string,
    }
  >,
  'getMyDeposits' : ActorMethod<[], Array<Deposit>>,
  'getMyRegisteredSuiAddress' : ActorMethod<[], [] | [string]>,
  'getMySuiMints' : ActorMethod<[], Array<MintedSuiCoin>>,
  'getSuiTx' : ActorMethod<[string], string>,
  'initialize' : ActorMethod<[], undefined>,
  'markDepositReleased' : ActorMethod<[bigint, string], boolean>,
  'recordSuiMint' : ActorMethod<
    [string, string, bigint, string, [] | [bigint]],
    undefined
  >,
  'registerSuiAddress' : ActorMethod<[string], undefined>,
  'releaseFromFrontend' : ActorMethod<[string, bigint, string], string>,
  'setTreasuryCap' : ActorMethod<[string, bigint, string], undefined>,
  'setup' : ActorMethod<[string, string, bigint, string], undefined>,
  'signTransactionHash' : ActorMethod<
    [Uint8Array | number[]],
    { 'signature' : Uint8Array | number[], 'publicKey' : Uint8Array | number[] }
  >,
  'transform' : ActorMethod<[TransformationInput], TransformationOutput>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
