import { useRef, useEffect } from "react";
import { Menu, Search, Calendar, Bell, ChevronDown, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import ThemeToggle from "@/components/ThemeToggle";

interface DashboardHeaderProps {
  dashboardMonth: string;
  onMonthChange: (month: string) => void;
  user: any;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onMenuClick: () => void;
  recentMonths: string[];
  getMonthYearLabel: (yyyyMm: string) => string;
  onProfileClick: () => void;
}

const DashboardHeader = ({
  dashboardMonth,
  onMonthChange,
  user,
  searchQuery,
  setSearchQuery,
  onMenuClick,
  recentMonths,
  getMonthYearLabel,
  onProfileClick,
}: DashboardHeaderProps) => {
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+K shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const userInitial =
    user?.displayName?.charAt(0) ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "?";

  const userName =
    user?.displayName || user?.email?.split("@")[0] || "ব্যবহারকারী";

  return (
    <header
      className="sticky top-0 z-20 shrink-0 flex items-center gradient-header"
      style={{
        height: "64px",
        paddingLeft: "20px",
        paddingRight: "20px",
        gap: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* ── Mobile menu ──────────────────────────────── */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-150 shrink-0"
      >
        <Menu className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </button>

      {/* ── Brand / Logo ─────────────────────────────── */}
      <div className="flex items-center gap-[10px] shrink-0 mr-2">
        {/* Logo icon — coin-style with ৳ symbol */}
        <div
          className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0 select-none"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.20)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
          }}
        >
          <span
            className="text-white font-extrabold leading-none"
            style={{ fontSize: "18px", letterSpacing: "-0.5px" }}
          >
            ৳
          </span>
        </div>

        {/* Name */}
        <div className="hidden sm:flex flex-col">
          <span
            className="text-white font-extrabold leading-none tracking-tight"
            style={{ fontSize: "17px", letterSpacing: "-0.3px" }}
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

      {/* ── Thin vertical separator ───────────────────── */}
      <div className="hidden lg:block w-[1px] h-[26px] bg-white/12 shrink-0" />

      {/* ── Search Bar ───────────────────────────────── */}
      <div className="flex-1 max-w-[420px]">
        <div
          className="relative flex items-center h-[38px] rounded-[11px] px-[12px] gap-[8px] transition-all duration-150 group"
          style={{
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.11)",
          }}
          onFocus={() => {}}
        >
          <Search
            className="w-[16px] h-[16px] shrink-0"
            style={{ color: "rgba(255,255,255,0.65)" }}
            strokeWidth={1.8}
          />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="লেনদেন খুঁজুন..."
            className="flex-1 bg-transparent border-0 outline-none text-white min-w-0"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "white",
            }}
            onFocus={(e) => {
              const parent = e.currentTarget.parentElement!;
              parent.style.background = "rgba(255,255,255,0.13)";
              parent.style.borderColor = "rgba(255,255,255,0.28)";
              parent.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.14)";
            }}
            onBlur={(e) => {
              const parent = e.currentTarget.parentElement!;
              parent.style.background = "rgba(255,255,255,0.09)";
              parent.style.borderColor = "rgba(255,255,255,0.11)";
              parent.style.boxShadow = "none";
            }}
          />
          <kbd
            className="hidden sm:inline-flex items-center justify-center shrink-0 rounded-[6px] font-medium"
            style={{
              height: "22px",
              padding: "0 6px",
              fontSize: "10px",
              color: "rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              letterSpacing: "0.2px",
            }}
          >
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* ── Right Controls ────────────────────────────── */}
      <div className="flex items-center gap-[6px] ml-auto shrink-0">

        {/* Month Selector */}
        <Select value={dashboardMonth} onValueChange={onMonthChange}>
          <SelectPrimitive.Trigger asChild>
            <button
              className="hidden sm:flex items-center gap-[6px] h-[38px] rounded-[11px] transition-all duration-150 shrink-0"
              style={{
                padding: "0 12px",
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.11)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.13)";
                el.style.borderColor = "rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.09)";
                el.style.borderColor = "rgba(255,255,255,0.11)";
              }}
            >
              <Calendar
                className="w-[15px] h-[15px] shrink-0"
                style={{ color: "rgba(255,255,255,0.80)" }}
                strokeWidth={1.8}
              />
              <span
                className="text-white whitespace-nowrap font-semibold"
                style={{ fontSize: "12px" }}
              >
                {getMonthYearLabel(dashboardMonth)}
              </span>
              <ChevronDown
                className="w-[13px] h-[13px] shrink-0"
                style={{ color: "rgba(255,255,255,0.55)" }}
                strokeWidth={2}
              />
            </button>
          </SelectPrimitive.Trigger>
          <SelectContent className="max-h-[300px]">
            {recentMonths.map((ym) => (
              <SelectItem key={ym} value={ym} className="text-xs font-semibold">
                {getMonthYearLabel(ym)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Notification Bell */}
        <button
          className="relative w-[38px] h-[38px] rounded-[11px] flex items-center justify-center transition-all duration-150 shrink-0"
          style={{
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.11)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.background = "rgba(255,255,255,0.13)";
            el.style.borderColor = "rgba(255,255,255,0.18)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = "rgba(255,255,255,0.09)";
            el.style.borderColor = "rgba(255,255,255,0.11)";
          }}
        >
          <Bell
            className="w-[16px] h-[16px]"
            style={{ color: "rgba(255,255,255,0.80)" }}
            strokeWidth={1.8}
          />
          {/* Badge */}
          <span
            className="absolute rounded-full"
            style={{
              top: "9px",
              right: "9px",
              width: "7px",
              height: "7px",
              background: "#EF4444",
              border: "1.5px solid rgba(67,56,202,0.9)",
            }}
          />
        </button>

        {/* Theme Toggle */}
        <div
          className="shrink-0 rounded-[11px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.11)",
          }}
        >
          <ThemeToggle />
        </div>

        {/* Vertical Divider */}
        <div
          className="hidden md:block shrink-0"
          style={{
            width: "1px",
            height: "26px",
            background: "rgba(255,255,255,0.13)",
            marginLeft: "2px",
          }}
        />

        {/* Profile Button */}
        <button
          onClick={onProfileClick}
          className="hidden md:flex items-center gap-[8px] shrink-0 rounded-[11px] transition-all duration-150"
          style={{
            padding: "5px 8px 5px 5px",
            background: "rgba(255,255,255,0.00)",
            border: "1px solid rgba(255,255,255,0.00)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.background = "rgba(255,255,255,0.09)";
            el.style.borderColor = "rgba(255,255,255,0.11)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = "rgba(255,255,255,0.00)";
            el.style.borderColor = "rgba(255,255,255,0.00)";
          }}
        >
          {/* Avatar */}
          <div
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{
              fontSize: "13px",
              background: "rgba(255,255,255,0.20)",
              border: "1.5px solid rgba(255,255,255,0.28)",
              letterSpacing: "-0.2px",
            }}
          >
            {userInitial}
          </div>
          {/* Name + email */}
          <div className="flex flex-col items-start min-w-0">
            <span
              className="text-white font-semibold whitespace-nowrap truncate max-w-[130px] leading-tight"
              style={{ fontSize: "13px" }}
            >
              {userName}
            </span>
          </div>
          <ChevronDown
            className="w-[13px] h-[13px] shrink-0"
            style={{ color: "rgba(255,255,255,0.55)" }}
            strokeWidth={2}
          />
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
