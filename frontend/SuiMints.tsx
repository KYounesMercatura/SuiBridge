import React, { useEffect, useState } from "react";
import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory as backendIdl } from "../src/declarations/backend";
import type { _SERVICE } from "../src/declarations/backend/backend.did";
import {
  Wallet,
  Clock,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw,
  Package,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Lock,
  Eye,
  Coins,
  Flame,
  Loader2,
  LogOut,
} from "lucide-react";
import {
  e8sToIcp,
  formatIcpAmount,
  formatTimestamp,
  truncateAddress,
  getSuiTxLink,
  getSuiObjectLink,
  copyToClipboard,
} from "./utils/helpers";
import BackgroundEffects from "./Backgroundeffects";

// 👇 your canister
const BACKEND_CANISTER_ID = "mb53b-xiaaa-aaaad-actrq-cai";

// 👇 IC boundary (where your canister actually is)
const IC_HOST = "https://icp0.io";

// 👇 Internet Identity provider
const IDENTITY_PROVIDER = "https://id.ai";

type BackendMint = {
  objectId: string;
  digest: string;
  amount: bigint;
  tokenType: string;
  ts: bigint;
  depositId: [] | [bigint];
};

type LocalMint = {
  objectId: string;
  digest: string;
  amount: string;
  ts: number;
};

type BurnedToken = {
  objectId: string;
  digest: string;
  amount: string;
  depositId: string;
  ts: number;
};

export default function SuiMints() {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [agent, setAgent] = useState<HttpAgent | null>(null);
  const [principal, setPrincipal] = useState<string>("");

  const [localMints, setLocalMints] = useState<LocalMint[]>([]);
  const [burningCoins, setBurningCoins] = useState<BurnedToken[]>([]);
  const [burnedHistory, setBurnedHistory] = useState<BurnedToken[]>([]);
  const [backendMints, setBackendMints] = useState<BackendMint[]>([]);

  const [loadingMints, setLoadingMints] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string>("");

  // init auth + agent
  useEffect(() => {
    (async () => {
      const ac = await AuthClient.create();
      setAuthClient(ac);

      if (await ac.isAuthenticated()) {
        const id = ac.getIdentity();
        const ag = new HttpAgent({ host: IC_HOST, identity: id });
        setAgent(ag);
        setPrincipal(id.getPrincipal().toText());
        await fetchBackendMints(ag);
      } else {
        const ag = new HttpAgent({ host: IC_HOST });
        setAgent(ag);
      }
    })();
  }, []);

  // listen to bridge events from mint/burn pages
  useEffect(() => {
    function onMint(e: Event) {
      const ce = e as CustomEvent;
      const { objectId, digest, amount, ts } = ce.detail;
      setLocalMints((prev) => [{ objectId, digest, amount, ts }, ...prev]);
    }

    function onBurn(e: Event) {
      const ce = e as CustomEvent;
      const { objectId, digest, amount, depositId } = ce.detail;
      const burnedToken = { objectId, digest, amount, depositId, ts: Date.now() };

      setBurningCoins((prev) => [burnedToken, ...prev]);

      setTimeout(() => {
        setBurningCoins((prev) => prev.filter((b) => b.objectId !== objectId));
        setBurnedHistory((prev) => [burnedToken, ...prev]);
      }, 10000);
    }

    window.addEventListener("bridge:add-mint", onMint as any);
    window.addEventListener("bridge:burn", onBurn as any);
    return () => {
      window.removeEventListener("bridge:add-mint", onMint as any);
      window.removeEventListener("bridge:burn", onBurn as any);
    };
  }, []);

  async function handleLogin() {
    if (!authClient) return;
    await authClient.login({
      identityProvider: IDENTITY_PROVIDER,
      onSuccess: async () => {
        const id = authClient.getIdentity();
        const ag = new HttpAgent({ host: IC_HOST, identity: id });
        setAgent(ag);
        setPrincipal(id.getPrincipal().toText());
        await fetchBackendMints(ag);
      },
    });
  }

  async function handleLogout() {
    if (!authClient) return;
    await authClient.logout();
    // reset to unauthenticated state
    const ag = new HttpAgent({ host: IC_HOST });
    setAgent(ag);
    setPrincipal("");
    setBackendMints([]);
  }

  function getBackend(ag: HttpAgent) {
    return Actor.createActor<_SERVICE>(backendIdl as any, {
      agent: ag,
      canisterId: BACKEND_CANISTER_ID,
    });
  }

  async function fetchBackendMints(ag: HttpAgent) {
    setLoadingMints(true);
    try {
      const backend = getBackend(ag);
      const res = (await backend.getMySuiMints()) as BackendMint[];
      setBackendMints(res || []);
    } catch (e) {
      console.warn("getMySuiMints failed", e);
      setBackendMints([]);
    } finally {
      setLoadingMints(false);
    }
  }

  async function handleRefresh() {
    if (!agent) return;
    await fetchBackendMints(agent);
  }

  async function handleCopy(text: string, label: string) {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(""), 2000);
    }
  }

  const totalBalance = backendMints.reduce((sum, m) => sum + m.amount, 0n);

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative">
      <BackgroundEffects variant="default" />

      <div className="relative z-10">
        {/* HERO SECTION */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-blue-500/30">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">
                Secured by Cryptography
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Your Bridge Dashboard
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-2">
              Track your wICP on Sui. View burn history.
            </p>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              All your minted coins and burned tokens in one place.
              <br />
              <span className="text-cyan-400">Real-time updates. Full transparency.</span>
            </p>
          </div>

          {/* Auth & Stats */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            {!principal ? (
              <button
                onClick={handleLogin}
                className="group relative w-full md:w-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-2xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all">
                  <Wallet className="w-5 h-5" />
                  Connect Internet Identity
                </div>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800/70 backdrop-blur-sm px-6 py-3 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Connected Wallet</p>
                    <code className="text-sm font-mono text-cyan-400">
                      {truncateAddress(principal, 10, 8)}
                    </code>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={loadingMints}
                    className="bg-slate-800/70 backdrop-blur-sm p-3 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-all disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-5 h-5 text-cyan-400 ${loadingMints ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-slate-800/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700/50 hover:border-red-500/60 transition-all flex items-center gap-2 text-slate-200 text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>

                {/* Balance Card */}
                <div className="relative group min-w-[280px]">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-slate-800/70 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-5 h-5 text-emerald-400" />
                      <p className="text-sm text-slate-300 font-medium">Total on Sui</p>
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-1">
                      {e8sToIcp(totalBalance)}
                    </h2>
                    <p className="text-emerald-400 font-medium">wICP</p>
                    <div className="flex gap-4 mt-4 text-xs text-slate-400">
                      <span>{backendMints.length} Active</span>
                      <span>•</span>
                      <span>{burnedHistory.length} Burned</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: Shield,
                title: "No Middlemen",
                desc: "Direct chain-to-chain",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Lock,
                title: "ECDSA Secure",
                desc: "Threshold signatures",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Zap,
                title: "Instant",
                desc: "Seconds, not minutes",
                color: "from-amber-500 to-orange-500",
              },
              {
                icon: Eye,
                title: "Transparent",
                desc: "Everything on-chain",
                color: "from-emerald-500 to-teal-500",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/50 transition-all group"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-xs text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Active Coins */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active wICP Coins */}
              <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-slate-700/50 p-6">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Active wICP on Sui</h3>
                      <p className="text-sm text-slate-400">
                        {backendMints.length} coin{backendMints.length !== 1 ? "s" : ""} ready to
                        use
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {loadingMints ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : backendMints.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-slate-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">No coins yet</h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Bridge some ICP to start minting wICP on Sui
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {backendMints.map((m) => {
                        const amount = formatIcpAmount(m.amount, { symbol: "wICP" });
                        return (
                          <div
                            key={m.objectId + m.digest}
                            className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-5 border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-3xl font-bold text-white">
                                    {amount}
                                  </span>
                                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/30">
                                    {m.tokenType}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-400">
                                  {formatTimestamp(m.ts, "relative")} •{" "}
                                  {formatTimestamp(m.ts, "short")}
                                </p>
                              </div>
                              <Sparkles className="w-6 h-6 text-emerald-400" />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-emerald-500/20">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-medium">Sui Object</span>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-mono text-cyan-400 bg-slate-800/50 px-2 py-1 rounded">
                                    {truncateAddress(m.objectId, 8, 6)}
                                  </code>
                                  <button
                                    onClick={() => handleCopy(m.objectId, m.objectId)}
                                    className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors"
                                  >
                                    {copySuccess === m.objectId ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-slate-500" />
                                    )}
                                  </button>
                                  <a
                                    href={getSuiObjectLink(m.objectId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-medium">Transaction</span>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-mono text-cyan-400 bg-slate-800/50 px-2 py-1 rounded">
                                    {truncateAddress(m.digest, 8, 6)}
                                  </code>
                                  <a
                                    href={getSuiTxLink(m.digest)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                                  </a>
                                </div>
                              </div>

                              {m.depositId.length === 1 && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mt-2">
                                  <span className="text-xs text-blue-400 font-medium">
                                    Linked to Deposit #{m.depositId[0].toString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Session Mints */}
              {localMints.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="relative bg-slate-900/70 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-6 h-6 text-amber-400" />
                      <div>
                        <h3 className="text-xl font-bold text-white">Just Minted!</h3>
                        <p className="text-sm text-slate-400">Fresh from this session</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {localMints.map((m) => (
                        <div
                          key={m.objectId + m.ts}
                          className="bg-amber-500/10 backdrop-blur-sm rounded-xl p-4 border border-amber-500/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl font-bold text-white">
                              {e8sToIcp(BigInt(m.amount))} wICP
                            </span>
                            <span className="text-xs text-amber-400 font-medium bg-amber-500/20 px-2 py-1 rounded border border-amber-500/30">
                              Just now
                            </span>
                          </div>
                          <code className="text-xs font-mono text-slate-400">
                            {truncateAddress(m.objectId, 10, 8)}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Burning in Progress */}
              {burningCoins.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="relative bg-slate-900/70 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
                      <div>
                        <h3 className="text-xl font-bold text-white">Burning Now!</h3>
                        <p className="text-sm text-slate-400">Returning wICP to Internet Computer</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {burningCoins.map((b) => (
                        <div
                          key={b.objectId + b.ts}
                          className="bg-orange-500/10 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-2xl font-bold text-white block">
                                {e8sToIcp(BigInt(b.amount))} wICP
                              </span>
                              <span className="text-xs text-orange-400">
                                Unlocking ICP...
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <code className="text-slate-400 font-mono">
                              {truncateAddress(b.objectId, 10, 8)}
                            </code>
                            <a
                              href={getSuiTxLink(b.digest)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                            >
                              <span>Burn TX</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Burn History */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-slate-700/50 p-6">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-purple-400" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Burn History</h3>
                      <p className="text-sm text-slate-400">Tokens returned to ICP</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 max-h-[700px] overflow-y-auto">
                  {burnedHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-300 font-medium mb-1">No burns yet</p>
                      <p className="text-xs text-slate-500">Burned tokens will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {burnedHistory.map((b) => (
                        <div
                          key={b.objectId + b.ts}
                          className="rounded-xl p-4 border border-purple-500/30 bg-purple-500/10 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-2xl font-bold text-white">
                                {e8sToIcp(BigInt(b.amount))} ICP
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(b.ts).toLocaleString()}
                              </p>
                            </div>
                            <span className="text-2xl">🔥</span>
                          </div>

                          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Returned to ICP
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="bg-slate-800/50 rounded-lg p-2">
                              <span className="text-slate-400 block mb-1">Burned Coin:</span>
                              <code className="text-cyan-400 font-mono text-[10px]">
                                {truncateAddress(b.objectId, 12, 10)}
                              </code>
                            </div>

                            <a
                              href={getSuiTxLink(b.digest)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 bg-slate-800/50 rounded-lg p-2"
                            >
                              <span className="font-mono text-[10px]">
                                TX: {truncateAddress(b.digest, 8, 6)}
                              </span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          {!principal && (
            <div className="mt-12 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative bg-slate-900/70 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 text-center">
                <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-3">
                  Ready to Bridge?
                </h3>
                <p className="text-slate-300 mb-6 max-w-md mx-auto">
                  Connect your Internet Identity to start bridging ICP to Sui with cryptographic
                  security
                </p>
                <button
                  onClick={handleLogin}
                  className="group relative inline-flex"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all">
                    <Wallet className="w-5 h-5" />
                    Connect Now
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
