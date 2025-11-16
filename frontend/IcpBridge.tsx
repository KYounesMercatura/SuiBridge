import React, { useEffect, useState } from "react";
import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory as backendIdl } from "../src/declarations/backend";
import type { _SERVICE } from "../src/declarations/backend/backend.did";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { blake2b } from "@noble/hashes/blake2b";
import { sha256 } from "@noble/hashes/sha256";
import {
  ArrowRight,
  Wallet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  icpToE8s,
  validateIcpAmount,
  validateSuiAddress,
  truncateAddress,
  getErrorMessage,
} from "./utils/helpers";
import BackgroundEffects from "./Backgroundeffects";

const BACKEND_CANISTER_ID = "mb53b-xiaaa-aaaad-actrq-cai";
const IC_HOST = "https://icp0.io";
// ✅ use the standard II
const IDENTITY_PROVIDER = "https://identity.ic0.app";

const SUI_RPC = "https://fullnode.mainnet.sui.io:443";

// ✅ this is the Sui package we’re targeting from the ICP signer
const WICP_PACKAGE =
  "0xc092cdc3495771f33a407039c52d1a935657868760f6c06a9dd6b4519cf4f1b5";
const WICP_TREASURY_CAP =
  "0x4167bbcdeff2d816256e98a2446f05ab8644e06ef91e8e99c68b4d50e3b0eaf3";

const suiClient = new SuiClient({ url: SUI_RPC });

type BackendConfig = {
  admin: string;
  canisterSuiAddress: string;
  gasObjectId: string;
  paused: boolean;
};

type LastDeposit = {
  id: string | null;
  amountE8s: bigint;
  amountIcp: string;
  suiRecipient: string;
};

type FlowStep = "input" | "depositing" | "deposited" | "minting" | "complete";

export default function IcpBridgeHardcoded() {
  const [agent, setAgent] = useState<HttpAgent | null>(null);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [principal, setPrincipal] = useState("");

  const [config, setConfig] = useState<BackendConfig | null>(null);
  const [amountIcp, setAmountIcp] = useState("0.01");
  const [suiRecipient, setSuiRecipient] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [lastDeposit, setLastDeposit] = useState<LastDeposit | null>(null);
  const [currentStep, setCurrentStep] = useState<FlowStep>("input");
  const [depositOutput, setDepositOutput] = useState("");
  const [mintOutput, setMintOutput] = useState("");
  const [mintLoading, setMintLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const ac = await AuthClient.create();
      setAuthClient(ac);

      if (await ac.isAuthenticated()) {
        const id = ac.getIdentity();
        const ag = new HttpAgent({ host: IC_HOST, identity: id });
        setAgent(ag);
        setPrincipal(id.getPrincipal().toText());
        await loadConfig(ag);
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
      const raw = await backend.getConfig();
      const adminText =
        (raw.admin as any)?.toText?.() ?? (raw.admin as any)?.toString?.() ?? String(raw.admin);

      setConfig({
        admin: adminText,
        canisterSuiAddress: String(raw.canisterSuiAddress || ""),
        gasObjectId: String(raw.gasObjectId || ""),
        paused: Boolean(raw.paused),
      });
    } catch (e) {
      console.warn("getConfig failed", e);
      setConfig({
        admin: "",
        canisterSuiAddress: "",
        gasObjectId: "",
        paused: false,
      });
    }
  }

  async function ensureLogin() {
    if (!authClient) return;
    await authClient.login({
      identityProvider: IDENTITY_PROVIDER,
      onSuccess: async () => {
        const id = authClient.getIdentity();
        const ag = new HttpAgent({ host: IC_HOST, identity: id });
        setAgent(ag);
        setPrincipal(id.getPrincipal().toText());
        await loadConfig(ag);
      },
    });
  }

  function getBackend(actorAgent: HttpAgent) {
    return Actor.createActor<_SERVICE>(backendIdl as any, {
      agent: actorAgent,
      canisterId: BACKEND_CANISTER_ID,
    });
  }

  function validateInputs(): boolean {
    const amtErr = validateIcpAmount(amountIcp);
    const addrErr = validateSuiAddress(suiRecipient);
    setAmountError(amtErr);
    setAddressError(addrErr);
    return !amtErr && !addrErr;
  }

  async function handleDeposit() {
    if (!agent) {
      setDepositOutput("❌ Please sign in first");
      return;
    }
    if (!validateInputs()) return;

    setCurrentStep("depositing");
    setDepositOutput("");

    try {
      const backend = getBackend(agent);
      const e8s = icpToE8s(amountIcp);
      const res = await backend.bridgeDeposit(e8s, suiRecipient);

      if (res.ok) {
        const depositId =
          res.depositId && res.depositId.length > 0 ? res.depositId[0]?.toString() : null;

        setLastDeposit({
          id: depositId ?? null,
          amountE8s: e8s,
          amountIcp,
          suiRecipient,
        });

        setCurrentStep("deposited");

        // broadcast to dashboard
        window.dispatchEvent(
          new CustomEvent("bridge:deposit", {
            detail: { amountIcp, amountE8s: e8s.toString(), suiRecipient, depositId },
          })
        );

        setDepositOutput(
          `✅ ICP locked on-chain${depositId ? ` • Deposit #${depositId}` : ""}`
        );
      } else {
        setDepositOutput(`❌ ${res.msg}`);
        setCurrentStep("input");
      }
    } catch (e: any) {
      setDepositOutput(`❌ ${getErrorMessage(e)}`);
      setCurrentStep("input");
    }
  }

  // crypto helpers
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

    // we make Sui intent message, hash it, and ask the ICP canister to ECDSA-sign it
    const intentMessage = new Uint8Array(3 + txBytes.length);
    intentMessage[0] = 0;
    intentMessage[1] = 0;
    intentMessage[2] = 0;
    intentMessage.set(txBytes, 3);

    const blakeDigest = blake2b(intentMessage, { dkLen: 32 });
    const finalDigest = sha256(blakeDigest);

    const { signature, publicKey } = await backend.signTransactionHash(Array.from(finalDigest));

    const sigBytes = Uint8Array.from(signature);
    const pub = Uint8Array.from(publicKey);

    const r = sigBytes.slice(0, 32);
    const s = sigBytes.slice(32, 64);
    const sNormalized = normalizeS(s);

    // 0x01 prefix = Sui secp256k1
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

  // ICP-locked -> Sui-minted
  async function handleMintFromDeposit() {
    if (!agent || !config || !lastDeposit) {
      setMintOutput("❌ Missing requirements (agent/config/deposit)");
      return;
    }
    if (!config.canisterSuiAddress) {
      setMintOutput("❌ ICP signer Sui address not configured on backend.");
      return;
    }
    if (!config.gasObjectId) {
      setMintOutput("❌ Sui gas object not configured on backend.");
      return;
    }

    setMintLoading(true);
    setCurrentStep("minting");
    setMintOutput("");

    try {
      const tx = new TransactionBlock();
      tx.moveCall({
        target: `${WICP_PACKAGE}::token::mint`,
        arguments: [
          tx.object(WICP_TREASURY_CAP),
          tx.pure.address(lastDeposit.suiRecipient),
          tx.pure.u64(lastDeposit.amountE8s),
        ],
      });

      // Sui sender is the ICP ECDSA-controlled address
      tx.setSender(config.canisterSuiAddress);

      const gasRef = await getFreshGasRef(config.gasObjectId);
      tx.setGasPayment([gasRef]);
      tx.setGasBudget(10_000_000);

      const txBytes = await tx.build({ client: suiClient });
      const result = await signAndSubmit(agent, txBytes);

      // try to record it
      const created = (result as any).effects?.created || [];
      if (created.length > 0) {
        const mintedCoinId = created[0].reference.objectId;
        const backend = Actor.createActor<_SERVICE>(backendIdl as any, {
          agent,
          canisterId: BACKEND_CANISTER_ID,
        });
        try {
          await backend.recordSuiMint(
            mintedCoinId,
            result.digest,
            lastDeposit.amountE8s,
            "wICP",
            lastDeposit.id ? [BigInt(lastDeposit.id)] : []
          );
        } catch (e) {
          console.warn("recordSuiMint failed (non fatal)", e);
        }
      }

      setCurrentStep("complete");
      setMintOutput(
        `✅ ICP → Sui complete. On-chain ECDSA signer minted ${lastDeposit.amountIcp} wICP to your Sui address.`
      );
    } catch (err: any) {
      console.error(err);
      setMintOutput(`❌ ${getErrorMessage(err)}`);
      setCurrentStep("deposited");
    } finally {
      setMintLoading(false);
    }
  }

  function resetFlow() {
    setCurrentStep("input");
    setLastDeposit(null);
    setAmountIcp("0.01");
    setSuiRecipient("");
    setDepositOutput("");
    setMintOutput("");
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative">
      <BackgroundEffects variant="blue" />
      <div className="relative z-10">
        {/* hero */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full mb-6 border border-blue-500/30">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">
                Chain-to-chain, canister-driven
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
              ICP → Sui Native Bridge
            </h1>
            <p className="text-slate-300 max-w-2xl mx-auto">
              Lock ICP on the Internet Computer and have an ICP ECDSA smart contract
              sign a Sui Move mint — no multisig, no off-chain relayer, ready for
              full automation.
            </p>
          </div>
          {/* auth */}
          <div className="flex justify-center mb-8">
            {!principal ? (
              <button onClick={ensureLogin} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold">
                  <Wallet className="w-5 h-5" />
                  Connect Internet Identity
                </div>
              </button>
            ) : (
              <div className="bg-slate-800/70 px-6 py-3 rounded-xl border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Connected</p>
                <code className="text-sm font-mono text-blue-400">
                  {truncateAddress(principal, 10, 8)}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* main card */}
        <div className="max-w-4xl mx-auto px-6 pb-20">
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 mb-8">
            {/* steps */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    currentStep === "input" || currentStep === "depositing"
                      ? "bg-blue-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-white">1. Lock ICP</p>
                  <p className="text-xs text-slate-400">ICP canister tracks your deposit</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-600 mx-4" />
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    currentStep === "minting"
                      ? "bg-blue-600 text-white"
                      : currentStep === "complete"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p
                    className={`font-semibold ${
                      currentStep === "input" ? "text-slate-500" : "text-white"
                    }`}
                  >
                    2. ICP canister signs on Sui
                  </p>
                  <p className="text-xs text-slate-400">
                    ECDSA → Sui Move mint (automation-ready)
                  </p>
                </div>
              </div>
            </div>

            {/* step content */}
            {(currentStep === "input" || currentStep === "depositing") && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Amount (ICP)
                  </label>
                  <input
                    type="text"
                    value={amountIcp}
                    onChange={(e) => {
                      setAmountIcp(e.target.value);
                      setAmountError(null);
                    }}
                    className={`w-full px-4 py-3 rounded-lg border bg-slate-800/50 text-white ${
                      amountError ? "border-red-500/50" : "border-slate-700"
                    }`}
                  />
                  {amountError && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {amountError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Sui recipient address
                  </label>
                  <input
                    type="text"
                    value={suiRecipient}
                    onChange={(e) => {
                      setSuiRecipient(e.target.value);
                      setAddressError(null);
                    }}
                    className={`w-full px-4 py-3 rounded-lg border bg-slate-800/50 text-white ${
                      addressError ? "border-red-500/50" : "border-slate-700"
                    }`}
                    placeholder="0x..."
                  />
                  {addressError && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {addressError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={currentStep === "depositing" || !principal}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-semibold disabled:opacity-50"
                >
                  {currentStep === "depositing" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Locking ICP...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Lock ICP on Bridge
                    </>
                  )}
                </button>

                {depositOutput && (
                  <div
                    className={`p-4 rounded-lg ${
                      depositOutput.startsWith("✅")
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/10 border border-red-500/30 text-red-400"
                    }`}
                  >
                    {depositOutput}
                  </div>
                )}
              </div>
            )}

            {(currentStep === "deposited" || currentStep === "minting") && lastDeposit && (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-400 mb-3">
                    ICP locked — finalize Sui side
                  </h3>
                  <div className="flex justify-between text-sm text-slate-200 mb-2">
                    <span>Amount:</span>
                    <span>{lastDeposit.amountIcp} ICP</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-200">
                    <span>Sui recipient:</span>
                    <code className="text-xs text-blue-300">
                      {truncateAddress(lastDeposit.suiRecipient, 10, 8)}
                    </code>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    This call is signed by the Internet Computer’s ECDSA canister key and
                    executed on Sui — the same pattern an autonomous canister can run 24/7.
                  </p>
                </div>

                <button
                  onClick={handleMintFromDeposit}
                  disabled={mintLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl font-semibold disabled:opacity-50"
                >
                  {mintLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Finalizing Sui mint...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Finalize on Sui (ICP-signed)
                    </>
                  )}
                </button>

                {mintOutput && (
                  <div
                    className={`p-4 rounded-lg ${
                      mintOutput.startsWith("✅")
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/10 border border-red-500/30 text-red-400"
                    }`}
                  >
                    {mintOutput}
                  </div>
                )}
              </div>
            )}

            {currentStep === "complete" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Chain-to-chain mint complete
                </h3>
                <p className="text-slate-400 mb-6">
                  ICP canister signed a Sui transaction and minted your wICP to your Sui
                  address. This is the same pattern we can hand to an autonomous canister
                  to do it trustlessly.
                </p>
                {mintOutput && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6 text-emerald-400">
                    {mintOutput}
                  </div>
                )}
                <button
                  onClick={resetFlow}
                  className="px-6 py-3 bg-slate-800 text-slate-200 rounded-xl border border-slate-700"
                >
                  Bridge more ICP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
