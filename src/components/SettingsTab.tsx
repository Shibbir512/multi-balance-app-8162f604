import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Download, Database, ShieldCheck, FileSpreadsheet, FileText } from "lucide-react";
import AdvancedExport from "./AdvancedExport";

interface SettingsTabProps {
  ledgerName?: string;
  transactions?: any[];
  categories?: any[];
  onExport?: () => void;
}

const SettingsTab = ({
  ledgerName = "খাতা",
  transactions = [],
  categories = [],
  onExport,
}: SettingsTabProps) => {
  return (
    <div className="pb-8 animate-fade-in-up space-y-4 max-w-2xl mx-auto mt-4">
      <h2 className="text-xl font-bold mb-4">সেটিংস ও ব্যাকআপ</h2>

      {/* ─── DATA BACKUP & EXPORT CARD ─── */}
      <div className="premium-card p-5 space-y-4 border border-border/80">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
          >
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">ডাটা ব্যাকআপ ও এক্সপোর্ট (Local Backup)</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              আপনার খাতার সমস্ত আর্থিক লেনদেন অফলাইনে ডিভাইসে নিরাপদে সংরক্ষণ করতে CSV বা PDF ফাইল হিসেবে ডাউনলোড করে রাখুন।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center shrink-0 font-bold text-xs">
              CSV
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">CSV ব্যাকআপ</p>
              <p className="text-[10px] text-muted-foreground truncate">এক্সেল ও স্প্রেডশীট ফরম্যাট</p>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center shrink-0 font-bold text-xs">
              PDF
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">PDF রিপোর্ট</p>
              <p className="text-[10px] text-muted-foreground truncate">প্রিন্ট ও শেয়ার উপযোগী</p>
            </div>
          </div>
        </div>

        {onExport ? (
          <Button
            onClick={onExport}
            className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 btn-primary shadow-md"
          >
            <Download className="w-4 h-4" /> ব্যাকআপ ও এক্সপোর্ট খুলুন
          </Button>
        ) : (
          <AdvancedExport
            ledgerName={ledgerName}
            transactions={transactions}
            categories={categories}
            trigger={
              <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 btn-primary shadow-md">
                <Download className="w-4 h-4" /> ব্যাকআপ ও এক্সপোর্ট খুলুন
              </Button>
            }
          />
        )}

        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>আপনার লোকাল ব্যাকআপ ডিভাইস মেমরিতে সরাসরি ডাউনলোড হবে।</span>
        </div>
      </div>

      {/* ─── THEME TOGGLE CARD ─── */}
      <div className="premium-card p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">থিম পরিবর্তন</h3>
          <p className="text-xs text-muted-foreground mt-0.5">লাইট বা ডার্ক মোড নির্বাচন করুন</p>
        </div>
        <ThemeToggle />
      </div>

      {/* ─── NOTIFICATIONS CARD ─── */}
      <div className="premium-card p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground mb-0.5">নোটিফিকেশন ও অ্যাকাউন্ট</h3>
          <p className="text-xs text-muted-foreground mb-3">আপনার পছন্দগুলো পরিচালনা করুন</p>
        </div>
        <Button variant="outline" className="w-full justify-start text-xs rounded-xl h-10">
          ডেইলি হিসাব রিমাইন্ডার
        </Button>
      </div>
    </div>
  );
};

export default SettingsTab;
