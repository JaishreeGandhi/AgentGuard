import React from "react";
import { Shield, ChevronDown, Search, Bell, Database } from "lucide-react";

export const ShellHeader: React.FC = () => {
  return (
    <header className="w-full bg-[#101622] border-b border-[#1e293b] px-6 py-2.5 flex items-center justify-between text-sm select-none">
      {/* Left: Logo & Project Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 font-semibold text-base tracking-tight text-white cursor-pointer group">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-bold text-white tracking-wide">
            Agent<span className="text-cyan-400">Guard</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            MVP v2.1
          </span>
        </div>

        {/* Project Selector (Shell) */}
        <div className="relative">
          <button className="flex items-center gap-2 bg-[#161f30] hover:bg-[#1a253a] border border-[#1e293b] rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Default-Project</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
          </button>
        </div>
      </div>

      {/* Center: Global Search Bar (Static shell with Ctrl+K shortcut) */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            readOnly
            placeholder="Search agents, traces, test suites... (Ctrl+K)"
            className="w-full bg-[#161f30] border border-[#1e293b] rounded-lg pl-9 pr-12 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-slate-800/80 text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications & Dev Profile Indicator */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-2 rounded-lg bg-[#161f30] border border-[#1e293b] text-slate-400 hover:text-slate-200 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161f30] border border-[#1e293b]">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200">Dev / Local</span>
            <span className="text-[10px] font-mono text-slate-500 leading-none">SQLite WAL</span>
          </div>
        </div>
      </div>
    </header>
  );
};

