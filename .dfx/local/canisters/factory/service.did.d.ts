import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Factory {
  'getMyVault' : ActorMethod<[], [] | [Principal]>,
  'getTemplateSet' : ActorMethod<[], boolean>,
  'lookup' : ActorMethod<[Principal], [] | [Principal]>,
  'setAdmin' : ActorMethod<[Principal], undefined>,
  'setTemplateWasm' : ActorMethod<[Uint8Array | number[]], undefined>,
  'spawnVault' : ActorMethod<[], { 'canister_id' : Principal }>,
}
export interface _SERVICE extends Factory {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
