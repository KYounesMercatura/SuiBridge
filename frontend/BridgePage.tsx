import React, { useEffect, useState } from "react";
import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";
import { idlFactory as backendIdl } from "../src/declarations/backend";
import type { _SERVICE } from "../src/declarations/backend/backend.did";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { blake2b } from "@noble/hashes/blake2b";
import { sha256 } from "@noble/hashes/sha256";
import {
  Wallet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Flame,
  ArrowLeft,
  ArrowRight,
  Coins,
  ExternalLink,
} from "lucide-react";
import {
  formatIcpAmount,
  truncateAddress,
  getSuiTxLink,
  getErrorMessage,
  principalToHex,
} from "./utils/helpers";
import BackgroundEffects from "./Backgroundeffects";

const BACKEND_CANISTER_ID = "mb53b-xiaaa-aaaad-actrq-cai";
const SUI_RPC = "https://fullnode.mainnet.sui.io:443";

// 👇 IC boundary + II provider (this was the actual problem)
const IC_HOST = "https://icp0.io";
const IDENTITY_PROVIDER = "https://id.ai";

// ✅ hardcoded to the package that we KNOW has `token::burn`
const WICP_PACKAGE =
  "0xc092cdc3495771f33a407039c52d1a935657868760f6c06a9dd6b4519cf4f1b5";
// ✅ hardcoded treasury cap from your tx history
const WICP_TREASURY_CAP =
  "0x4167bbcdeff2d816256e98a2446f05ab8644e06ef91e8e99c68b4d50e3b0eaf3";

const suiClient = new SuiClient({ url: SUI_RPC });

type BackendConfig = {
  admin: string;
  canisterSuiAddress: string;
  gasObjectId: string;
  paused: boolean;
};

type MintedCoin = {
  objectId: string;
  digest: string;
  amount: bigint;
  tokenType: string;
  ts: bigint;
  depositId: [] | [bigint];
};

export default function BurnWicpPage() {
  const [agent, setAgent] = useState<HttpAgent | null>(null);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [principalText, setPrincipalText] = useState("");

  const [config, setConfig] = useState<BackendConfig | null>(null);
  const [myCoins, setMyCoins] = useState<MintedCoin[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<MintedCoin | null>(null);

  const [burning, setBurning] = useState(false);
  const [burnOutput, setBurnOutput] = useState("");
  const [burnSuccess, setBurnSuccess] = useState(false);

  // init
  useEffect(() => {
    (async () => {
      const ac = await AuthClient.create();
      setAuthClient(ac);

      if (await ac.isAuthenticated()) {
        const id = ac.getIdentity();
        // 🔁 FIX: talk to IC, not id.ai
        const ag = new HttpAgent({ host: IC_HOST, identity: id });
        setAgent(ag);

        const p = id.getPrincipal();
        setPrincipal(p);
        setPrincipalText(p.toText());

        await Promise.all([loadConfig(ag), fetchMyCoins(ag)]);
      } else {
        const ag = new HttpAgent({ host: IC_HOST });
        setAgent(ag);
        await loadConfig(ag);
      }
    })();
  }, []);

  async function loadConfig(ag: HttpAgent) {
    try {
      const backend = Actor.createActor<_SERVICE>(backendIdl as any, {
        agent: ag,
        canisterId: BACKEND_CANISTER_ID,
      });
      const raw: any = await backend.getConfig();
      const adminText =
        raw.admin?.toText?.() ?? raw.admin?.toString?.() ?? String(raw.admin);

      // 👇 we only trust backend for op stuff, NOT for package/treasury
      setConfig({
        admin: adminText,
        canisterSuiAddress: String(raw.canisterSuiAddress || ""),
        gasObjectId: String(raw.gasObjectId || ""),
        paused: Boolean(raw.paused),
      });
    } catch (e) {
      console.warn("getConfig failed", e);
      // fallback
      setConfig({
        admin: "",
        canisterSuiAddress: "",
        gasObjectId: "",
        paused: false,
      });
    }
  }

  async function fetchMyCoins(ag: HttpAgent) {
    setLoadingCoins(true);
    try {
      const backend = Actor.createActor<_SERVICE>(backendIdl as any, {
        agent: ag,
        canisterId: BACKEND_CANISTER_ID,
      });
      const res = (await backend.getMySuiMints()) as MintedCoin[];
      setMyCoins(res || []);
    } catch (e) {
      console.warn("getMySuiMints failed", e);
      setMyCoins([]);
    } finally {
      setLoadingCoins(false);
    }
  }

  async function handleLogin() {
    if (!authClient) return;
    await authClient.login({
      // 🔁 FIX: correct II URL
      identityProvider: IDENTITY_PROVIDER,
      onSuccess: async () => {
        const id = authClient.getIdentity();
        const ag = new HttpAgent({ host: IC_HOST, identity: id });
        setAgent(ag);
        const p = id.getPrincipal();
        setPrincipal(p);
        setPrincipalText(p.toText());
        await Promise.all([loadConfig(ag), fetchMyCoins(ag)]);
      },
    });
  }

  async function handleRefresh() {
    if (!agent) return;
    await fetchMyCoins(agent);
  }

  // helpers for signing
  function u8ToB64(bytes: Uint8Array): string {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function cmp32(a: Uint8Array, b: Uint8Array): number {
    for (let i = 0; i < 32; i++) {
      if (a[i] > b[i]) return 1;
      if (a[i] < b[i]) return -1;
    }
    return 0;
  }

  function sub32(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(32);
    let carry = 0;
    for (let i = 31; i >= 0; i--) {
      const ai = a[i];
      const bi = b[i] + carry;
      if (ai >= bi) {
        out[i] = ai - bi;
        carry = 0;
      } else {
        out[i] = 256 + ai - bi;
        carry = 1;
      }
    }
    return out;
  }

  function normalizeS(s: Uint8Array): Uint8Array {
    const N_HALF = Uint8Array.from([
      0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0x5d, 0x57, 0x6e, 0x73, 0x57, 0xa4, 0x50, 0x1d,
      0xdf, 0xe9, 0x2f, 0x46, 0x68, 0x1b, 0x20, 0xa0,
    ]);
    const N = Uint8Array.from([
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xba, 0xae, 0xdc, 0xe6, 0xaf, 0x48, 0xa0, 0x3b,
      0xbf, 0xd2, 0x5e, 0x8c, 0xd0, 0x36, 0x41, 0x41,
    ]);
    if (cmp32(s, N_HALF) > 0) {
      return sub32(N, s);
    }
    return s;
  }

  async function getFreshGasRef(id: string) {
    const obj = await suiClient.getObject({ id });
    if (!obj.data) throw new Error("Gas object not found on Sui");
    return {
      objectId: obj.data.objectId,
      version: Number(obj.data.version),
      digest: obj.data.digest,
    };
  }

  async function signAndSubmit(agent: HttpAgent, txBytes: Uint8Array) {
    const backend = Actor.createActor<_SERVICE>(backendIdl as any, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });

    const intentMessage = new Uint8Array(3 + txBytes.length);
    intentMessage[0] = 0;
    intentMessage[1] = 0;
    intentMessage[2] = 0;
    intentMessage.set(txBytes, 3);

    const blakeDigest = blake2b(intentMessage, { dkLen: 32 });
    const finalDigest = sha256(blakeDigest);

    const { signature, publicKey } = (await backend.signTransactionHash(
      Array.from(finalDigest)
    )) as { signature: number[]; publicKey: number[] };

    const sigBytes = Uint8Array.from(signature);
    const pub = Uint8Array.from(publicKey);

    const r = sigBytes.slice(0, 32);
    const s = sigBytes.slice(32, 64);
    const sNormalized = normalizeS(s);

    const suiSignature = new Uint8Array(1 + 32 + 32 + pub.length);
    suiSignature[0] = 0x01;
    suiSignature.set(r, 1);
    suiSignature.set(sNormalized, 33);
    suiSignature.set(pub, 65);

    const txB64 = u8ToB64(txBytes);
    const sigB64 = u8ToB64(suiSignature);

    const result = await suiClient.executeTransactionBlock({
      transactionBlock: txB64,
      signature: sigB64,
      options: { showEffects: true, showEvents: true },
      requestType: "WaitForLocalExecution",
    });

    return result;
  }

  // BURN
  async function handleBurnCoin() {
    if (!agent || !config || !selectedCoin || !principal) return;

    setBurning(true);
    setBurnOutput("");
    setBurnSuccess(false);

    try {
      // principal -> bytes
      const hex = principalToHex(principal);
      const principalBytes: number[] = [];
      for (let i = 0; i < hex.length; i += 2) {
        principalBytes.push(parseInt(hex.slice(i, i + 2), 16));
      }
      const nonce = BigInt(Date.now());

      const tx = new TransactionBlock();
      tx.moveCall({
        // ✅ hardcoded burn target
        target: `${WICP_PACKAGE}::token::burn`,
        arguments: [
          tx.object(WICP_TREASURY_CAP), // ✅ hardcoded treasury cap
          tx.object(selectedCoin.objectId), // ✅ user-selected coin
          tx.pure(principalBytes),
          tx.pure.u64(nonce),
        ],
      });

      // sender = canister ECDSA address from backend
      if (config.canisterSuiAddress) {
        tx.setSender(config.canisterSuiAddress);
      }

      // gas from backend
      if (config.gasObjectId) {
        const gasRef = await getFreshGasRef(config.gasObjectId);
        tx.setGasPayment([gasRef]);
      }
      tx.setGasBudget(10_000_000);

      const txBytes = await tx.build({ client: suiClient });
      const result = await signAndSubmit(agent, txBytes);

      // browser event
      window.dispatchEvent(
        new CustomEvent("bridge:burn", {
          detail: {
            objectId: selectedCoin.objectId,
            digest: result.digest,
            amount: selectedCoin.amount.toString(),
            depositId:
              selectedCoin.depositId.length > 0
                ? selectedCoin.depositId[0]?.toString()
                : "0",
          },
        })
      );

      setBurnOutput(`burn-success:${result.digest}`);
      setBurnSuccess(true);

      setTimeout(() => {
        if (agent) fetchMyCoins(agent);
        setSelectedCoin(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      // if coin is really from old package, THIS is where you’ll see it
      setBurnOutput(getErrorMessage(err));
      setBurnSuccess(false);
    } finally {
      setBurning(false);
    }
  }

  const totalBalance = myCoins.reduce((sum, c) => sum + c.amount, 0n);

  function formatTs(nanos: bigint): string {
    const date = new Date(Number(nanos) / 1_000_000);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative">
      <BackgroundEffects variant="cyan" />
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full mb-6 border border-cyan-500/30">
              <Flame className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-400 font-medium">
                Return to ICP
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400">
              Burn wICP
            </h1>
            <p className="text-slate-300">
              Destroy wrapped ICP on Sui, unlock real ICP on Internet Computer.
            </p>
          </div>

          {/* top bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            {!principal ? (
              <button onClick={handleLogin} className="group relative w-full md:w-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition" />
                <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold">
                  <Wallet className="w-5 h-5" />
                  Connect Internet Identity
                </div>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-800/70 px-6 py-3 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Connected Wallet</p>
                    <code className="text-sm text-cyan-400 font-mono">
                      {truncateAddress(principalText, 10, 8)}
                    </code>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={loadingCoins}
                    className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-5 h-5 text-cyan-400 ${
                        loadingCoins ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="relative min-w-[280px]">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur-xl opacity-30" />
                  <div className="relative bg-slate-800/70 border border-cyan-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-5 h-5 text-cyan-400" />
                      <p className="text-sm text-slate-300 font-medium">
                        Your wICP on Sui
                      </p>
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-1">
                      {formatIcpAmount(totalBalance, { showSymbol: false })}
                    </h2>
                    <p className="text-cyan-400 font-medium">wICP</p>
                    <p className="text-xs text-slate-400 mt-3">
                      {myCoins.length} coin{myCoins.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* main */}
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* coins list */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 p-6 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <Coins className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h3 className="text-white text-xl font-bold">
                        Select wICP to Burn
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Choose a coin you minted earlier
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {loadingCoins ? (
                    <div className="space-y-4">
                      <div className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                      <div className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                    </div>
                  ) : myCoins.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-slate-600" />
                      </div>
                      <p className="text-white font-semibold mb-2">
                        No wICP coins found
                      </p>
                      <p className="text-slate-400 text-sm">
                        Mint some wICP first from the bridge page
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myCoins.map((coin) => {
                        const isSelected =
                          selectedCoin?.objectId === coin.objectId;
                        return (
                          <button
                            key={coin.objectId}
                            onClick={() => setSelectedCoin(coin)}
                            className={`text-left p-5 rounded-xl border-2 transition ${
                              isSelected
                                ? "border-cyan-500 bg-cyan-500/10 scale-105"
                                : "border-slate-700 bg-slate-800/50 hover:border-cyan-500/50"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="text-2xl font-bold text-white">
                                  {formatIcpAmount(coin.amount, {
                                    symbol: "wICP",
                                  })}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Minted {formatTs(coin.ts)}
                                </p>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex justify-between">
                              <span>Object:</span>
                              <code className="text-cyan-400 font-mono">
                                {truncateAddress(coin.objectId, 6, 4)}
                              </code>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* burn panel */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 p-6 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h3 className="text-white text-xl font-bold">
                        Burn Action
                      </h3>
                      <p className="text-sm text-slate-400">Trigger ICP release</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {!selectedCoin ? (
                    <div className="text-center py-12">
                      <ArrowLeft className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-300 font-medium mb-1">
                        Select a coin
                      </p>
                      <p className="text-xs text-slate-500">
                        Choose a wICP coin from the left to burn
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-2">
                          You are burning:
                        </p>
                        <p className="text-3xl font-bold text-white">
                          {formatIcpAmount(selectedCoin.amount, {
                            symbol: "wICP",
                          })}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          ICP canister will see Sui event
                        </p>
                      </div>
                      <button
                        onClick={handleBurnCoin}
                        disabled={burning || !config}
                        className="group relative w-full disabled:opacity-50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition" />
                        <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold">
                          {burning ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Burning...
                            </>
                          ) : (
                            <>
                              <Flame className="w-5 h-5" />
                              Burn wICP
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </div>
                      </button>
                      {burnOutput && (
                        <div
                          className={`p-4 rounded-lg border ${
                            burnSuccess
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-red-500/10 border-red-500/30 text-red-400"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {burnSuccess ? (
                              <CheckCircle2 className="w-5 h-5 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 mt-0.5" />
                            )}
                            <div className="flex-1">
                              {burnSuccess &&
                              burnOutput.startsWith("burn-success:") ? (
                                <>
                                  <p className="text-sm font-medium mb-2">
                                    Your wICP has been burned on Sui.
                                  </p>
                                  <p className="text-xs mb-3">
                                    ICP side can now release funds.
                                  </p>
                                  <a
                                    href={getSuiTxLink(
                                      burnOutput.replace("burn-success:", "")
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-xs bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View on Sui Explorer
                                  </a>
                                </>
                              ) : (
                                <p className="text-sm">{burnOutput}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!principal && (
            <div className="mt-12 bg-slate-900/70 rounded-2xl border border-cyan-500/30 p-8 text-center relative">
              <Flame className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-2xl text-white font-bold mb-3">
                Connect to burn
              </h3>
              <p className="text-slate-300 mb-6">
                Connect your Internet Identity to see your Sui-minted wICP
              </p>
              <button onClick={handleLogin} className="group relative inline-flex">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition" />
                <div className="relative flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold">
                  <Wallet className="w-5 h-5" /> Connect Now
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
