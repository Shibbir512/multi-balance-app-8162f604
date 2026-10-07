import { useNavigate } from "react-router-dom";
import { Ledger } from "@/integrations/firebase/types";
import {
  BookOpen,
  Home,
  Wallet,
  MoreVertical,
  FileText,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";

interface LedgerCardProps {
  ledger: Ledger;
  balance: number;
  transactionCount: number;
  lastTransactionDate: number | null;
  onDelete: (id: string, name: string) => void;
}

interface SemanticConfig {
  primaryColor: string;
  iconBg: string;
  // Balance panel
  balancePanelBg: string;
  balancePanelBgDark: string;
  balanceAccentStrip: string;
  // Action bar
  actionBg: string;
  actionBgDark: string;
  actionText: string;
  actionTextDark: string;
  // Icon
  Icon: React.ElementType;
  // Watermark SVG path or icon
  WatermarkIcon: React.ElementType;
}

const getSemanticConfig = (name: string): SemanticConfig => {
  const lowerName = name.toLowerCase();

  if (
    lowerName.includes("মাদরাসা") ||
    lowerName.includes("স্কুল") ||
    lowerName.includes("madrasa") ||
    lowerName.includes("school")
  ) {
    return {
      primaryColor: "#7C4DFF",
      iconBg: "linear-gradient(135deg, #7C4DFF 0%, #6D5DF6 100%)",
      balancePanelBg: "#F6F2FF",
      balancePanelBgDark: "#211C3A",
      balanceAccentStrip: "#7C4DFF",
      actionBg: "#F0EAFE",
      actionBgDark: "rgba(124,77,255,0.10)",
      actionText: "#7C4DFF",
      actionTextDark: "#A78BFA",
      Icon: BookOpen,
      WatermarkIcon: BookOpen,
    };
  }

  if (
    lowerName.includes("বাসা") ||
    lowerName.includes("বাড়ি") ||
    lowerName.includes("home") ||
    lowerName.includes("house")
  ) {
    return {
      primaryColor: "#3B82F6",
      iconBg: "#3B82F6",
      balancePanelBg: "#F2F7FF",
      balancePanelBgDark: "#172A46",
      balanceAccentStrip: "#3B82F6",
      actionBg: "#EAF3FF",
      actionBgDark: "rgba(59,130,246,0.10)",
      actionText: "#3B82F6",
      actionTextDark: "#60A5FA",
      Icon: Home,
      WatermarkIcon: Home,
    };
  }

  return {
    primaryColor: "#16A34A",
    iconBg: "#16A34A",
    balancePanelBg: "#F0FBF5",
    balancePanelBgDark: "#132F25",
    balanceAccentStrip: "#16A34A",
    actionBg: "#E8F9EF",
    actionBgDark: "rgba(22,163,74,0.10)",
    actionText: "#16A34A",
    actionTextDark: "#34D399",
    Icon: Wallet,
    WatermarkIcon: Wallet,
  };
};

export const LedgerCard = ({
  ledger,
  balance,
  transactionCount,
  lastTransactionDate,
  onDelete,
}: LedgerCardProps) => {
  const navigate = useNavigate();
  const config = getSemanticConfig(ledger.name);
  const {
    primaryColor,
    iconBg,
    balancePanelBg,
    balancePanelBgDark,
    balanceAccentStrip,
    actionBg,
    actionBgDark,
    actionText,
    actionTextDark,
    Icon,
    WatermarkIcon,
  } = config;

  const isPositive = balance >= 0;
  const isNegative = balance < 0;
  const isZero = balance === 0;

  // Balance icon config
  const BalanceIcon = isNegative ? TrendingDown : TrendingUp;
  const balanceIconBg = isNegative ? "#FEE2E2" : "#DCFCE7";
  const balanceIconBgDark = isNegative ? "rgba(239,68,68,0.14)" : "rgba(22,163,74,0.14)";
  const balanceIconColor = isNegative ? "#EF4444" : "#16A34A";
  const balanceIconColorDark = isNegative ? "#F87171" : "#34D399";

  // Balance amount color
  const balanceAmountColor = isNegative
    ? "#E5484D"
    : isZero
    ? "#334155"
    : "#159447";
  const balanceAmountColorDark = isNegative ? "#F87171" : isZero ? "#CBD5E1" : "#34D399";

  let formattedDate = "তথ্য নেই";
  if (lastTransactionDate) {
    const date = new Date(lastTransactionDate);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      formattedDate = `আজ, ${format(date, "h:mm a")}`;
    } else {
      formattedDate = format(date, "d MMM, yyyy");
    }
  }

  return (
    <div
      onClick={() => navigate(`/ledger/${ledger.id}`)}
      className="ledger-premium-card group relative flex flex-col w-full cursor-pointer overflow-hidden"
      style={{ borderColor: `${primaryColor}55` }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `0 12px 32px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)`;
        el.style.borderColor = `${primaryColor}99`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.borderColor = `${primaryColor}55`;
      }}
      tabIndex={0}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${primaryColor}`;
        e.currentTarget.style.outlineOffset = "2px";
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
      }}
    >
      {/* ── Watermark ────────────────────────────────────── */}
      <div
        className="absolute bottom-[46px] right-[10px] pointer-events-none z-0 transition-opacity duration-300 opacity-[0.045] group-hover:opacity-[0.07]"
        style={{ color: primaryColor }}
      >
        <WatermarkIcon
          size={120}
          strokeWidth={1.5}
          color={primaryColor}
        />
      </div>

      {/* ── Card Padding Wrapper ─────────────────────────── */}
      <div className="relative z-10 flex flex-col flex-1 p-[18px] pb-0">

        {/* ── ZONE 1: Header ───────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[12px] min-w-0 flex-1">
            {/* Icon */}
            <div
              className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0"
              style={{ background: iconBg }}
            >
              <Icon size={20} color="#ffffff" strokeWidth={2} />
            </div>

            {/* Title */}
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-bold text-[#172033] dark:text-[#F1F5F9] leading-[1.25] line-clamp-1 break-words">
                {ledger.name}
              </h3>
              <p className="text-[12px] font-medium text-[#94A3B8] mt-[1px]">
                {ledger.currency || "BDT"} · {transactionCount.toLocaleString("bn-BD")}টি লেনদেন
              </p>
            </div>
          </div>

          {/* Three-dot menu */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ledger.id, ledger.name);
            }}
            className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0 ml-1 transition-colors hover:bg-[#F1F5F9] dark:hover:bg-[rgba(255,255,255,0.07)] group/menu"
          >
            <MoreVertical
              size={18}
              className="text-[#94A3B8] group-hover/menu:text-[#64748B] dark:group-hover/menu:text-[#CBD5E1]"
            />
          </button>
        </div>

        {/* ── ZONE 2: Balance Panel ────────────────────────── */}
        <div className="mt-[16px] relative overflow-hidden rounded-[14px]">
          {/* Light mode panel */}
          <div
            className="dark:hidden rounded-[14px] px-[14px] py-[13px] flex flex-col justify-center"
            style={{
              background: balancePanelBg,
              minHeight: "80px",
            }}
          >
            {/* Left accent strip */}
            <div
              className="absolute left-0 top-[8px] bottom-[8px] w-[3px] rounded-full"
              style={{ background: balanceAccentStrip }}
            />

            {/* Balance icon + label */}
            <div className="flex items-center gap-[8px] mb-[5px]">
              <div
                className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: balanceIconBg }}
              >
                <BalanceIcon size={15} color={balanceIconColor} strokeWidth={2.5} />
              </div>
              <span className="text-[12px] font-medium text-[#64748B]">
                বর্তমান ব্যালেন্স
              </span>
            </div>

            {/* Amount */}
            <p
              className="font-bold leading-[1.1] truncate pl-[36px]"
              style={{
                fontSize: "clamp(22px, 2.0vw, 28px)",
                color: balanceAmountColor,
              }}
            >
              ৳ {balance.toLocaleString("bn-BD")}
            </p>
          </div>

          {/* Dark mode panel */}
          <div
            className="hidden dark:flex flex-col justify-center rounded-[14px] px-[14px] py-[13px]"
            style={{
              background: balancePanelBgDark,
              minHeight: "80px",
            }}
          >
            {/* Left accent strip */}
            <div
              className="absolute left-0 top-[8px] bottom-[8px] w-[3px] rounded-full opacity-80"
              style={{ background: balanceAccentStrip }}
            />

            {/* Balance icon + label */}
            <div className="flex items-center gap-[8px] mb-[5px]">
              <div
                className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: balanceIconBgDark }}
              >
                <BalanceIcon size={15} color={balanceIconColorDark} strokeWidth={2.5} />
              </div>
              <span className="text-[12px] font-medium text-[#94A3B8]">
                বর্তমান ব্যালেন্স
              </span>
            </div>

            {/* Amount */}
            <p
              className="font-bold leading-[1.1] truncate pl-[36px]"
              style={{
                fontSize: "clamp(22px, 2.0vw, 28px)",
                color: balanceAmountColorDark,
              }}
            >
              ৳ {balance.toLocaleString("bn-BD")}
            </p>
          </div>
        </div>

        {/* ── ZONE 3: Metadata Row ─────────────────────────── */}
        <div className="mt-[12px] pt-[12px] border-t border-[#E2E8F0] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <div className="flex items-center gap-[5px]">
            <FileText
              size={13}
              strokeWidth={1.8}
              className="text-[#94A3B8] shrink-0"
            />
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">
              {transactionCount.toLocaleString("bn-BD")}টি লেনদেন
            </span>
          </div>
          <div className="flex items-center gap-[5px]">
            <Calendar
              size={13}
              strokeWidth={1.8}
              className="text-[#94A3B8] shrink-0"
            />
            <span className="text-[11px] text-[#94A3B8]">
              শেষ: {formattedDate}
            </span>
          </div>
        </div>
      </div>

      {/* ── ZONE 4: Bottom Action Bar ────────────────────── */}
      <div className="relative z-10 px-[18px] pb-[18px] mt-[12px]">
        {/* Light mode */}
        <div
          className="dark:hidden h-[41px] rounded-[11px] flex items-center justify-between px-[14px] transition-all duration-200 group-hover:brightness-95"
          style={{ background: actionBg }}
        >
          <span
            className="text-[13px] font-semibold"
            style={{ color: actionText }}
          >
            বিস্তারিত দেখুন
          </span>
          <ArrowRight
            size={17}
            style={{ color: actionText }}
            className="transform group-hover:translate-x-[3px] transition-transform duration-200"
          />
        </div>

        {/* Dark mode */}
        <div
          className="hidden dark:flex h-[41px] rounded-[11px] items-center justify-between px-[14px] transition-all duration-200"
          style={{ background: actionBgDark }}
        >
          <span
            className="text-[13px] font-semibold"
            style={{ color: actionTextDark }}
          >
            বিস্তারিত দেখুন
          </span>
          <ArrowRight
            size={17}
            style={{ color: actionTextDark }}
            className="transform group-hover:translate-x-[3px] transition-transform duration-200"
          />
        </div>
      </div>
    </div>
  );
};
