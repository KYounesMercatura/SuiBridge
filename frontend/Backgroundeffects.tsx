import React from "react";

interface BackgroundEffectsProps {
  variant?: "blue" | "cyan" | "purple" | "default";
}

export default function BackgroundEffects({ variant = "default" }: BackgroundEffectsProps) {
  const getGlowColors = () => {
    switch (variant) {
      case "blue":
        return {
          orb1: "bg-blue-500/10",
          orb2: "bg-blue-600/10",
          grid: "rgba(59,130,246,0.03)",
          scanline: "rgba(59,130,246,0.02)",
        };
      case "cyan":
        return {
          orb1: "bg-cyan-500/10",
          orb2: "bg-teal-500/10",
          grid: "rgba(6,182,212,0.03)",
          scanline: "rgba(6,182,212,0.02)",
        };
      case "purple":
        return {
          orb1: "bg-purple-500/10",
          orb2: "bg-violet-500/10",
          grid: "rgba(139,92,246,0.03)",
          scanline: "rgba(139,92,246,0.02)",
        };
      default:
        return {
          orb1: "bg-blue-500/10",
          orb2: "bg-cyan-500/10",
          grid: "rgba(59,130,246,0.03)",
          scanline: "rgba(59,130,246,0.02)",
        };
    }
  };

  const colors = getGlowColors();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Animated Grid Pattern */}
      <div
        className="absolute inset-0 bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage: `linear-gradient(${colors.grid} 1px, transparent 1px), linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)`,
        }}
      />

      {/* Top Left Glow Orb */}
      <div
        className={`absolute -top-24 -left-24 w-96 h-96 ${colors.orb1} rounded-full blur-3xl animate-pulse`}
      />

      {/* Top Right Glow Orb */}
      <div
        className={`absolute top-1/4 right-1/4 w-72 h-72 ${colors.orb2} rounded-full blur-3xl animate-pulse`}
        style={{ animationDelay: "1s", animationDuration: "4s" }}
      />

      {/* Bottom Left Glow Orb */}
      <div
        className={`absolute bottom-1/4 left-1/3 w-80 h-80 ${colors.orb1} rounded-full blur-3xl animate-pulse`}
        style={{ animationDelay: "2s", animationDuration: "5s" }}
      />

      {/* Bottom Right Glow Orb */}
      <div
        className={`absolute -bottom-24 -right-24 w-96 h-96 ${colors.orb2} rounded-full blur-3xl animate-pulse`}
        style={{ animationDelay: "1.5s", animationDuration: "3s" }}
      />

      {/* Scan Lines Effect */}
      <div
        className="absolute inset-0 bg-[length:100%_4px] pointer-events-none opacity-30"
        style={{
          backgroundImage: `linear-gradient(transparent 50%, ${colors.scanline} 50%)`,
        }}
      />

      {/* Vignette Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,14,26,0.8)_100%)]" />
    </div>
  );
}