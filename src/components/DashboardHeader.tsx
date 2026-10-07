import { useRef, useEffect } from "react";
import { Menu, Search, Calendar, Bell, ChevronDown, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import ThemeToggle from "@/components/ThemeToggle";

interface DashboardHeaderProps {
  user?: any;
  onMenuClick: () => void;
}

const DashboardHeader = ({
  user,
  onMenuClick,
}: DashboardHeaderProps) => {


  return (
    <header
      className="sticky top-0 z-20 shrink-0 flex items-start transition-all duration-300"
      style={{
        height: "180px",
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "20px",
        gap: "12px",
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 transition-opacity duration-300 opacity-100 dark:opacity-0"
          style={{
            backgroundImage: "url('/images/header/day-header.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div 
          className="absolute inset-0 transition-opacity duration-300 opacity-0 dark:opacity-100"
          style={{
            backgroundImage: "url('/images/header/night-header.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>
      
      {/* Subtle Readability & Night Overlay */}
      {/* Light: 10% dark | Dark: 25% navy */}
      <div className="absolute inset-0 z-[1] pointer-events-none transition-colors duration-300 bg-[#090C15]/10 dark:bg-[#090C15]/25" />

      {/* Content wrapper for z-index */}
      <div className="relative z-[2] flex items-start w-full h-[42px]">

      {/* ── Mobile menu ──────────────────────────────── */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-[40px] h-[40px] rounded-full flex items-center justify-center text-white/90 hover:text-white bg-white/10 border border-white/20 backdrop-blur-md shadow-sm transition-all duration-150 shrink-0"
      >
        <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
      </button>

      {/* ── Brand / Logo ─────────────────────────────── */}
      <div className="flex items-center gap-[10px] shrink-0 mr-2">
        {/* Logo icon */}
        <div
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 select-none bg-white/10 border border-white/20 backdrop-blur-md shadow-sm"
        >
          <span
            className="text-white font-extrabold leading-none"
            style={{ fontSize: "18px", letterSpacing: "-0.5px", textShadow: "0 1px 3px rgba(0,0,0,0.18)" }}
          >
            ৳
          </span>
        </div>

        {/* Name */}
        <div className="hidden sm:flex flex-col drop-shadow-sm">
          <span
            className="text-white font-extrabold leading-none tracking-tight"
            style={{ fontSize: "17px", letterSpacing: "-0.3px", textShadow: "0 1px 3px rgba(0,0,0,0.18)" }}
          >
            জমাখরচ
          </span>
          <span
            className="text-white/55 font-medium leading-none mt-[3px]"
            style={{ fontSize: "10px", letterSpacing: "0.3px" }}
          >
            আয় বুঝে ব্যয়
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* ── Right Controls ────────────────────────────── */}
      <div className="flex items-center gap-[8px] ml-auto shrink-0">

        {/* Notification Bell */}
        <button
          className="relative w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-150 shrink-0 bg-white/10 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/20 hover:border-white/30"
        >
          <Bell
            className="w-[18px] h-[18px] text-white/90"
            strokeWidth={2}
          />
          {/* Badge */}
          <span
            className="absolute rounded-full bg-red-500 border-[1.5px] border-white dark:border-[#0B1020]"
            style={{
              top: "10px",
              right: "10px",
              width: "8px",
              height: "8px",
            }}
          />
        </button>

        {/* Theme Toggle (circular, translucent glass) */}
        <div
          className="shrink-0 w-[42px] h-[42px] rounded-full overflow-hidden bg-white/10 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/20 hover:border-white/30 flex items-center justify-center"
        >
          <ThemeToggle />
        </div>

      </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
