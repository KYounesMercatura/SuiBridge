import React, { useState } from "react";
import BridgePage from "./BridgePage";
import SuiMints from "./SuiMints";
import IcpBridge from "./IcpBridge";
import { Zap, Activity } from "lucide-react";

export default function App() {
  const [tab, setTab] = useState<"connection" | "mints" | "icp">("mints");

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative">
      {/* Background Effects Layer */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)]" />
        
        {/* Glow Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Scan Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(59,130,246,0.02)_50%)] bg-[length:100%_4px] pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-blue-500/20 backdrop-blur-xl bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur-lg opacity-50" />
                <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  ICP ↔ Sui Bridge
                </h1>
                <p className="text-xs text-slate-500">Chain-to-Chain</p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setTab("mints")}
                className={`relative px-6 py-2.5 font-medium text-sm rounded-lg transition-all ${
                  tab === "mints"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab === "mints" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur-xl opacity-50" />
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Dashboard
                </span>
              </button>
              
              <button
                onClick={() => setTab("icp")}
                className={`relative px-6 py-2.5 font-medium text-sm rounded-lg transition-all ${
                  tab === "icp"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab === "icp" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur-xl opacity-50" />
                  </>
                )}
                <span className="relative z-10">Deposit</span>
              </button>
              
              <button
                onClick={() => setTab("connection")}
                className={`relative px-6 py-2.5 font-medium text-sm rounded-lg transition-all ${
                  tab === "connection"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {tab === "connection" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur-xl opacity-50" />
                  </>
                )}
                <span className="relative z-10">Withdraw</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="relative z-10">
        {tab === "mints" && <SuiMints />}
        {tab === "icp" && <IcpBridge />}
        {tab === "connection" && <BridgePage />}
      </div>
    </div>
  );
}