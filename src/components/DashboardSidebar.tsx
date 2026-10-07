import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, CreditCard, Plus, Tag, BarChart3,
  Calculator, Wallet, Settings,
  HelpCircle, X, ChevronDown, Target, ArrowDownCircle, ArrowUpCircle,
  ChevronRight
} from "lucide-react";

interface NavItem {
  sidebarId: string;
  tabId?: string;
  label: string;
  icon: any;
  action?: () => void;
  disabled?: boolean;
}

interface DashboardSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openTxDialog: (type: "income" | "expense") => void;
  isOpen: boolean;
  onClose: () => void;
  ledgerName?: string;
  allLedgers?: any[];
  currentLedgerId?: string;
  user?: any;
}

const tabToSidebarMap: Record<string, string> = {
  transactions: "dashboard",
  categories: "categories",
  reports: "reports",
  zakat: "zakat",
  grocery: "grocery",
  settings: "settings",
  help: "help",
  profile: "profile",
  budget: "budget",
  savings: "savings",
};

const DashboardSidebar = ({
  activeTab,
  setActiveTab,
  openTxDialog,
  isOpen,
  onClose,
  ledgerName,
  allLedgers,
  currentLedgerId,
  user,
}: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const [ledgerDropdownOpen, setLedgerDropdownOpen] = useState(false);

  const activeSidebarId = tabToSidebarMap[activeTab] || "dashboard";

  const mainNav: NavItem[] = [
    { sidebarId: "dashboard", tabId: "transactions", label: "ড্যাশবোর্ড", icon: Home },
    { sidebarId: "ledger", tabId: "transactions", label: "লেনদেন", icon: CreditCard },
  ];

  const actionNav: NavItem[] = [
    { sidebarId: "add-expense", label: "খরচ যোগ করুন", icon: ArrowDownCircle, action: () => openTxDialog("expense") },
    { sidebarId: "add-income", label: "আয় যোগ করুন", icon: ArrowUpCircle, action: () => openTxDialog("income") },
  ];

  const featureNav: NavItem[] = [
    { sidebarId: "categories", tabId: "categories", label: "ক্যাটাগরি", icon: Tag },
    { sidebarId: "budget", tabId: "budget", label: "বাজেট", icon: Target },
    { sidebarId: "reports", tabId: "reports", label: "রিপোর্ট", icon: BarChart3 },
    { sidebarId: "zakat", tabId: "zakat", label: "যাকাত ক্যালকুলেটর", icon: Calculator },
    { sidebarId: "savings", tabId: "savings", label: "লক্ষ্য ও সঞ্চয়", icon: Wallet },
  ];

  const bottomNav: NavItem[] = [
    { sidebarId: "settings", tabId: "settings", label: "সেটিংস", icon: Settings },
    { sidebarId: "help", tabId: "help", label: "সাহায্য", icon: HelpCircle },
  ];

  const handleClick = (item: NavItem) => {
    if (item.disabled) return;
    if (item.action) {
      item.action();
    } else if (item.tabId) {
      setActiveTab(item.tabId);
    }
    onClose();
  };

  /* ── Section label ───────────────────────────────── */
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="px-[10px] pb-[6px] pt-[2px] text-[10px] font-bold uppercase tracking-[0.8px] text-[#94A3B8] dark:text-[#475569] select-none">
      {children}
    </p>
  );

  /* ── Nav item renderer ───────────────────────────── */
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = item.sidebarId === activeSidebarId;
    const isExpense = item.sidebarId === "add-expense";
    const isIncome = item.sidebarId === "add-income";
    const isQuickAction = isExpense || isIncome;

    if (isQuickAction) {
      return (
        <button
          key={item.sidebarId}
          onClick={() => handleClick(item)}
          className={`
            w-full flex items-center gap-[10px] h-[42px] px-[10px] rounded-[10px]
            text-[13.5px] font-medium transition-all duration-150 outline-none group
            ${isExpense
              ? "text-[#64748B] dark:text-[#94A3B8] hover:bg-[#FFF0F1] dark:hover:bg-[rgba(239,68,68,0.08)] hover:text-[#E5484D] dark:hover:text-[#F87171]"
              : "text-[#64748B] dark:text-[#94A3B8] hover:bg-[#ECFDF5] dark:hover:bg-[rgba(22,163,74,0.08)] hover:text-[#16A34A] dark:hover:text-[#4ADE80]"
            }
          `}
        >
          {/* Colored icon pill */}
          <span
            className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0 ${
              isExpense
                ? "bg-[#FEE2E2] dark:bg-[rgba(239,68,68,0.12)]"
                : "bg-[#DCFCE7] dark:bg-[rgba(22,163,74,0.12)]"
            }`}
          >
            <Icon
              size={15}
              strokeWidth={2}
              className={isExpense ? "text-[#E5484D] dark:text-[#F87171]" : "text-[#16A34A] dark:text-[#4ADE80]"}
            />
          </span>
          <span className="truncate">{item.label}</span>
        </button>
      );
    }

    return (
      <button
        key={item.sidebarId}
        onClick={() => handleClick(item)}
        disabled={item.disabled}
        className={`
          relative w-full flex items-center gap-[10px] h-[42px] px-[10px] rounded-[10px]
          text-[13.5px] transition-all duration-150 outline-none group
          ${active
            ? "bg-gradient-to-r from-[#F0EDFF] to-[#F5F3FF] dark:from-[rgba(99,102,241,0.12)] dark:to-[rgba(124,58,237,0.08)] text-[#5B3FE4] dark:text-[#A78BFA] font-semibold"
            : item.disabled
              ? "text-[#CBD5E1] dark:text-[#334155] cursor-not-allowed"
              : "text-[#475569] dark:text-[#94A3B8] font-medium hover:bg-[#F8F7FF] dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-[#5B3FE4] dark:hover:text-[#C4B5FD]"
          }
        `}
      >
        {/* Active left bar */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-full bg-gradient-to-b from-[#6366F1] to-[#7C3AED]" />
        )}

        {/* Icon pill */}
        <span
          className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0 transition-colors duration-150 ${
            active
              ? "bg-[#5B3FE4] dark:bg-[#6D28D9] shadow-[0_2px_8px_rgba(91,63,228,0.25)]"
              : "bg-[#F1F5F9] dark:bg-[rgba(255,255,255,0.05)] group-hover:bg-[#EDE9FE] dark:group-hover:bg-[rgba(99,102,241,0.10)]"
          }`}
        >
          <Icon
            size={15}
            strokeWidth={active ? 2.2 : 1.8}
            className={active
              ? "text-white"
              : "text-[#64748B] dark:text-[#94A3B8] group-hover:text-[#5B3FE4] dark:group-hover:text-[#A78BFA]"
            }
          />
        </span>

        <span className="truncate flex-1 text-left">{item.label}</span>

        {active && (
          <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-[#5B3FE4] dark:text-[#A78BFA] opacity-50" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-[55] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 z-[60] lg:z-auto
          h-screen w-[236px] shrink-0
          bg-[#FBFBFE] dark:bg-[#0F1629]
          border-r border-[#EBEDF5] dark:border-[rgba(255,255,255,0.06)]
          flex flex-col
          transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ── Brand ──────────────────────────────────── */}
        <div className="px-[14px] pt-[16px] pb-[14px] border-b border-[#F0F1F7] dark:border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-[10px]">
            {/* Logo — gradient ৳ */}
            <button
              onClick={() => navigate("/")}
              className="shrink-0 w-[38px] h-[38px] rounded-[11px] flex items-center justify-center select-none transition-transform hover:scale-105 bg-gradient-to-br from-[#6366F1] to-[#7C3AED] shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
              title="হোম পেজে যান"
            >
              <span className="text-white font-extrabold text-[17px] leading-none">৳</span>
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-[16px] font-extrabold text-[#1E293B] dark:text-[#F1F5F9] leading-tight tracking-tight">
                জমাখরচ
              </h1>
              <p className="text-[10px] font-medium text-[#94A3B8] dark:text-[#475569] leading-none mt-[3px]">
                আয় বুঝে ব্যয়
              </p>
            </div>

            {/* Mobile close */}
            <button
              onClick={onClose}
              className="lg:hidden w-[30px] h-[30px] flex items-center justify-center rounded-[8px] text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F3F8] dark:hover:bg-[rgba(255,255,255,0.06)] dark:hover:text-[#CBD5E1] transition-colors shrink-0"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Ledger Switcher */}
          {ledgerName && (
            <div className="mt-[12px] relative">
              <button
                onClick={() => setLedgerDropdownOpen(!ledgerDropdownOpen)}
                className="w-full flex items-center gap-[8px] px-[10px] py-[9px] rounded-[10px] text-left transition-all duration-150 bg-[#F0F0FB] dark:bg-[rgba(99,102,241,0.08)] border border-[rgba(91,63,228,0.12)] dark:border-[rgba(99,102,241,0.15)] hover:border-[rgba(91,63,228,0.25)] dark:hover:border-[rgba(99,102,241,0.25)] hover:bg-[#EBEAF8] dark:hover:bg-[rgba(99,102,241,0.12)]"
              >
                <span className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center shrink-0 bg-[rgba(91,63,228,0.12)] dark:bg-[rgba(99,102,241,0.15)]">
                  <Wallet size={12} strokeWidth={2} className="text-[#5B3FE4] dark:text-[#A78BFA]" />
                </span>
                <span className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] truncate flex-1">
                  {ledgerName}
                </span>
                <ChevronDown
                  size={13}
                  strokeWidth={2}
                  className={`text-[#94A3B8] dark:text-[#64748B] shrink-0 transition-transform duration-200 ${
                    ledgerDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {ledgerDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setLedgerDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 rounded-[12px] p-1.5 z-[70] bg-white dark:bg-[#1A2238] border border-[#E8EAF0] dark:border-[rgba(255,255,255,0.08)] shadow-[0_8px_28px_rgba(16,24,40,0.10)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.40)]">
                    {allLedgers?.map((l: any) => {
                      const isCurrent = l.id === currentLedgerId;
                      return (
                        <button
                          key={l.id}
                          onClick={() => {
                            setLedgerDropdownOpen(false);
                            if (!isCurrent) navigate(`/ledger/${l.id}`);
                          }}
                          className={`w-full flex items-center gap-[8px] px-[10px] py-[8px] rounded-[8px] text-left text-[13px] font-medium transition-all duration-100 ${
                            isCurrent
                              ? "bg-[#F0EDFF] dark:bg-[rgba(99,102,241,0.14)] text-[#5B3FE4] dark:text-[#A78BFA]"
                              : "text-[#334155] dark:text-[#CBD5E1] hover:bg-[#F8F7FF] dark:hover:bg-[rgba(255,255,255,0.05)]"
                          }`}
                        >
                          <span
                            className={`w-[22px] h-[22px] rounded-[6px] flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? "bg-[#5B3FE4] dark:bg-[#6D28D9]"
                                : "bg-[#F0EDFF] dark:bg-[rgba(99,102,241,0.10)]"
                            }`}
                          >
                            <Wallet
                              size={11}
                              strokeWidth={2}
                              className={isCurrent ? "text-white" : "text-[#5B3FE4] dark:text-[#A78BFA]"}
                            />
                          </span>
                          <span className="truncate">{l.name}</span>
                        </button>
                      );
                    })}
                    <div className="h-px bg-[#F1F3F8] dark:bg-[rgba(255,255,255,0.06)] my-1" />
                    <button
                      onClick={() => {
                        setLedgerDropdownOpen(false);
                        navigate("/");
                      }}
                      className="w-full flex items-center gap-[8px] px-[10px] py-[8px] rounded-[8px] text-left text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8F7FF] dark:hover:bg-[rgba(255,255,255,0.05)] hover:text-[#5B3FE4] dark:hover:text-[#A78BFA] transition-colors"
                    >
                      <span className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center shrink-0 border-[1.5px] border-dashed border-[#CBD5E1] dark:border-[#475569]">
                        <Plus size={11} strokeWidth={2.5} />
                      </span>
                      <span>নতুন খাতা</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────── */}
        <nav className="flex-1 px-[10px] py-[14px] overflow-y-auto no-scrollbar flex flex-col gap-[16px]">
          {/* Main nav */}
          <div className="flex flex-col gap-[2px]">
            <SectionLabel>মূল মেনু</SectionLabel>
            {mainNav.map(renderItem)}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-[2px]">
            <SectionLabel>দ্রুত যোগ করুন</SectionLabel>
            {actionNav.map(renderItem)}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#F0F1F7] dark:bg-[rgba(255,255,255,0.04)] mx-2" />

          {/* Feature nav */}
          <div className="flex flex-col gap-[2px]">
            <SectionLabel>বিশ্লেষণ ও টুলস</SectionLabel>
            {featureNav.map(renderItem)}
          </div>
        </nav>

        {/* ── Bottom ─────────────────────────────────── */}
        <div className="px-[10px] pb-[18px] pt-[10px] border-t border-[#F0F1F7] dark:border-[rgba(255,255,255,0.04)]">
          <div className="flex flex-col gap-[2px]">
            {bottomNav.map(renderItem)}
          </div>
          
          {/* ── Profile Section at bottom ─────────────────────────────────── */}
          {user && (
            <div className="mt-4 pt-4 border-t border-[#F0F1F7] dark:border-[rgba(255,255,255,0.04)]">
              <button
                onClick={() => {
                  setActiveTab("profile");
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`
                  w-full flex items-center gap-[12px] p-[10px] rounded-[12px] text-left transition-all duration-150 outline-none
                  ${activeTab === "profile" 
                    ? "bg-gradient-to-r from-[#F0EDFF] to-[#F5F3FF] dark:from-[rgba(99,102,241,0.12)] dark:to-[rgba(124,58,237,0.08)]"
                    : "hover:bg-[#F8F7FF] dark:hover:bg-[rgba(255,255,255,0.04)]"
                  }
                `}
              >
                <div
                  className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.1)]"
                  style={{
                    fontSize: "14px",
                    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                  }}
                >
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span
                    className={`font-semibold whitespace-nowrap truncate max-w-[140px] leading-tight text-[13.5px] ${
                      activeTab === "profile" ? "text-[#5B3FE4] dark:text-[#A78BFA]" : "text-[#1E293B] dark:text-[#E2E8F0]"
                    }`}
                  >
                    {user?.displayName || user?.email?.split("@")[0] || "ব্যবহারকারী"}
                  </span>
                  <span className="text-[#64748B] dark:text-[#94A3B8] text-[11px] truncate max-w-[140px]">
                    {user?.email}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
