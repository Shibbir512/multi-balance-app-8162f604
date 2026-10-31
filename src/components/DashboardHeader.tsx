import { Menu, Bell, ChevronDown, ChevronUp } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface DashboardHeaderProps {
  user?: any;
  onMenuClick: () => void;
  isCollapsed?: boolean;
  isHidden?: boolean;
  onToggleCollapse?: () => void;
  ledgerName?: string;
}

const DashboardHeader = ({
  user,
  onMenuClick,
  isCollapsed = false,
  isHidden = false,
  onToggleCollapse,
}: DashboardHeaderProps) => {
  return (
    <header
      className={`shrink-0 flex flex-col justify-center transition-all duration-300 ease-in-out relative overflow-hidden z-20 border-b border-white/10 ${
        isCollapsed
          ? "h-[56px] md:h-[60px] px-3.5 md:px-6 shadow-md"
          : "h-[64px] md:h-[150px] px-3.5 pt-1.5 md:px-6 md:pt-4"
      } ${
        isHidden
          ? "max-h-0 md:max-h-[60px] opacity-0 md:opacity-100 -translate-y-3 md:translate-y-0 pointer-events-none md:pointer-events-auto border-b-0 py-0"
          : "max-h-[64px] md:max-h-[150px] opacity-100 translate-y-0 pointer-events-auto"
      }`}
    >
      {/* Background Images with Crossfade */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 transition-opacity duration-300 opacity-100 dark:opacity-0"
          style={{
            backgroundImage: "url('/images/header/day-header.webp')",
            backgroundSize: "cover",
            backgroundPosition: isCollapsed ? "center 30%" : "center",
          }}
        />
        <div 
          className="absolute inset-0 transition-opacity duration-300 opacity-0 dark:opacity-100"
          style={{
            backgroundImage: "url('/images/header/night-header.webp')",
            backgroundSize: "cover",
            backgroundPosition: isCollapsed ? "center 30%" : "center",
          }}
        />
      </div>
      
      {/* Subtle Readability & Night Overlay */}
      <div className={`absolute inset-0 z-[1] pointer-events-none transition-colors duration-300 ${
        isCollapsed
          ? "bg-[#090C15]/40 dark:bg-[#090C15]/60 backdrop-blur-md"
          : "bg-[#090C15]/15 dark:bg-[#090C15]/30 backdrop-blur-[2px]"
      }`} />

      {/* Content wrapper for z-index */}
      <div className="relative z-[2] flex items-center w-full h-[44px]">

      {/* ── Mobile menu ──────────────────────────────── */}
      <button
        onClick={onMenuClick}
        aria-label="মেনু খুলুন"
        className="lg:hidden w-[38px] h-[38px] rounded-full flex items-center justify-center text-white/90 hover:text-white bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md shadow-sm transition-all duration-150 shrink-0"
      >
        <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
      </button>

      {/* ── Brand / Logo ─────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-2 ml-1 sm:ml-0 min-w-0">
        {/* Logo icon */}
        <div
          className={`rounded-full flex items-center justify-center shrink-0 select-none bg-white/20 border border-white/30 backdrop-blur-md shadow-sm transition-all duration-300 ${
            isCollapsed ? "w-[32px] h-[32px] sm:w-[34px] sm:h-[34px]" : "w-[36px] h-[36px] sm:w-[38px] sm:h-[38px]"
          }`}
        >
          <span
            className="text-white font-black leading-none"
            style={{ fontSize: isCollapsed ? "15px" : "17px", letterSpacing: "-0.5px", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
          >
            ৳
          </span>
        </div>

        {/* App Title */}
        <div className="flex flex-col drop-shadow-sm shrink-0">
          <span
            className="text-white font-extrabold leading-none tracking-tight"
            style={{ fontSize: isCollapsed ? "15px" : "17px", letterSpacing: "-0.3px", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
          >
            জমাখরচ
          </span>
          {!isCollapsed && (
            <span
              className="text-white/80 font-medium leading-none mt-[3px]"
              style={{ fontSize: "10px", letterSpacing: "0.3px" }}
            >
              আয় বুঝে ব্যয়
            </span>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* ── Right Controls ────────────────────────────── */}
      <div className="flex items-center gap-[8px] ml-auto shrink-0">

        {/* Desktop Collapse/Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "হেডার বড় করুন" : "হেডার ছোট করুন"}
            aria-label={isCollapsed ? "হেডার বড় করুন" : "হেডার ছোট করুন"}
            className="hidden md:flex w-[38px] h-[38px] rounded-full items-center justify-center transition-all duration-150 shrink-0 bg-white/15 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/25 hover:border-white/30 text-white/80 hover:text-white"
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Notification Bell */}
        <button
          title="বিজ্ঞপ্তি"
          aria-label="বিজ্ঞপ্তি"
          className="relative w-[38px] h-[38px] md:w-[40px] md:h-[40px] rounded-full flex items-center justify-center transition-all duration-150 shrink-0 bg-white/15 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/25 hover:border-white/30"
        >
          <Bell
            className="w-[17px] h-[17px] text-white/90"
            strokeWidth={2}
          />
          {/* Badge */}
          <span
            className="absolute rounded-full bg-red-500 border-[1.5px] border-white dark:border-[#0B1020]"
            style={{
              top: "9px",
              right: "9px",
              width: "7px",
              height: "7px",
            }}
          />
        </button>

        {/* Theme Toggle (circular, translucent glass) */}
        <div
          className="shrink-0 w-[38px] h-[38px] md:w-[40px] md:h-[40px] rounded-full overflow-hidden bg-white/15 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/25 hover:border-white/30 flex items-center justify-center"
        >
          <ThemeToggle />
        </div>

      </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
