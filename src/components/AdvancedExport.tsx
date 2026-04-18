import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
  categories: { name: string } | null;
  accounts: { name: string } | null;
}

interface Props {
  ledgerName: string;
  transactions: Transaction[];
  categories: { id: string; name: string; type: string }[];
}

const AdvancedExport = ({ ledgerName, transactions, categories }: Props) => {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const getFiltered = () => {
    let filtered = [...transactions];
    if (exportType !== "all") filtered = filtered.filter((t) => t.type === exportType);
    if (categoryFilter !== "all") filtered = filtered.filter((t) => (t.categories as { name: string })?.name === categoryFilter);
    if (dateFrom) filtered = filtered.filter((t) => t.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((t) => t.date <= dateTo);
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  };

  const catNames = [...new Set(transactions.map((t) => (t.categories as { name: string })?.name).filter(Boolean))];

  const downloadPdf = () => {
    const filtered = getFiltered();
    if (!filtered.length) { toast.error("কোনো লেনদেন পাওয়া যায়নি"); return; }

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.text(ledgerName, pw / 2, 18, { align: "center" });

    doc.setFontSize(9);
    const label = exportType === "all" ? "All" : exportType === "income" ? "Income" : "Expense";
    const catLabel = categoryFilter === "all" ? "All Categories" : categoryFilter;
    doc.text(`${label} | ${catLabel}`, pw / 2, 25, { align: "center" });

    if (dateFrom || dateTo) {
      doc.text(`${dateFrom || "Start"} → ${dateTo || "End"}`, pw / 2, 30, { align: "center" });
    }

    const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const y = 38;
    doc.setFontSize(10);
    doc.text(`Income: ${totalIncome.toLocaleString()} BDT | Expense: ${totalExpense.toLocaleString()} BDT | Balance: ${(totalIncome - totalExpense).toLocaleString()} BDT`, 14, y);

    const rows = filtered.map((t) => [
      t.date,
      t.type === "income" ? "Income" : "Expense",
      (t.categories as { name: string })?.name || "-",
      (t.accounts as { name: string })?.name || "-",
      `${t.amount.toLocaleString()} BDT`,
      t.note || "",
    ]);

    autoTable(doc, {
      startY: y + 8,
      head: [["Date", "Type", "Category", "Account", "Amount", "Note"]],
      body: rows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`${ledgerName}-report.pdf`);
    setOpen(false);
    toast.success("PDF ডাউনলোড হয়েছে!");
  };

  const downloadExcel = () => {
    const filtered = getFiltered();
    if (!filtered.length) { toast.error("কোনো লেনদেন পাওয়া যায়নি"); return; }

    const data = filtered.map((t) => ({
      "তারিখ": t.date,
      "ধরন": t.type === "income" ? "জমা" : "খরচ",
      "ক্যাটাগরি": (t.categories as { name: string })?.name || "-",
      "অ্যাকাউন্ট": (t.accounts as { name: string })?.name || "-",
      "পরিমাণ (৳)": t.amount,
      "নোট": t.note || "",
    }));

    const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    data.push(
      { "তারিখ": "", "ধরন": "", "ক্যাটাগরি": "", "অ্যাকাউন্ট": "মোট জমা", "পরিমাণ (৳)": totalIncome, "নোট": "" },
      { "তারিখ": "", "ধরন": "", "ক্যাটাগরি": "", "অ্যাকাউন্ট": "মোট খরচ", "পরিমাণ (৳)": totalExpense, "নোট": "" },
      { "তারিখ": "", "ধরন": "", "ক্যাটাগরি": "", "অ্যাকাউন্ট": "ব্যালেন্স", "পরিমাণ (৳)": totalIncome - totalExpense, "নোট": "" },
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "লেনদেন");
    XLSX.writeFile(wb, `${ledgerName}-report.xlsx`);
    setOpen(false);
    toast.success("Excel ডাউনলোড হয়েছে!");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-9 rounded-full px-4 gap-1.5 text-xs font-semibold btn-primary">
        <Download className="w-3.5 h-3.5" /> রিপোর্ট
      </Button>

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 6px 16px -4px hsl(var(--primary) / 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <BottomSheetTitle>রিপোর্ট ডাউনলোড</BottomSheetTitle>
                <BottomSheetDescription>ফিল্টার করে PDF বা Excel ডাউনলোড করুন</BottomSheetDescription>
              </div>
            </div>
          </BottomSheetHeader>
          <div className="form-section-gap">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">ধরন</Label>
                <Select value={exportType} onValueChange={(v: "all" | "income" | "expense") => setExportType(v)}>
                  <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব</SelectItem>
                    <SelectItem value="income">জমা</SelectItem>
                    <SelectItem value="expense">খরচ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">ক্যাটাগরি</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব</SelectItem>
                    {catNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">শুরু তারিখ</Label>
                <div className="relative">
                  {!dateFrom && (
                    <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground truncate">
                      শুরুর তারিখ নির্বাচন করুন
                    </span>
                  )}
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={`form-input ${!dateFrom ? "text-transparent" : ""}`}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">শেষ তারিখ</Label>
                <div className="relative">
                  {!dateTo && (
                    <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground truncate">
                      শেষ তারিখ নির্বাচন করুন
                    </span>
                  )}
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`form-input ${!dateTo ? "text-transparent" : ""}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* PDF Button */}
              <button
                onClick={downloadPdf}
                className="group relative h-20 rounded-2xl overflow-hidden border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.02))',
                  borderColor: 'rgba(239,68,68,0.20)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px -2px rgba(239,68,68,0.15)',
                }}
              >
                <div
                  className="absolute -top-8 -right-6 w-20 h-20 rounded-full opacity-30 blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-50"
                  style={{ background: 'radial-gradient(circle, #EF4444, transparent 70%)' }}
                />
                <div
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    boxShadow: '0 4px 12px -2px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                  }}
                >
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="relative text-xs font-extrabold text-foreground">PDF ডাউনলোড</span>
              </button>

              {/* Excel Button */}
              <button
                onClick={downloadExcel}
                className="group relative h-20 rounded-2xl overflow-hidden border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.02))',
                  borderColor: 'rgba(16,185,129,0.22)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px -2px rgba(16,185,129,0.18)',
                }}
              >
                <div
                  className="absolute -top-8 -right-6 w-20 h-20 rounded-full opacity-30 blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-50"
                  style={{ background: 'radial-gradient(circle, #10B981, transparent 70%)' }}
                />
                <div
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 4px 12px -2px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                </div>
                <span className="relative text-xs font-extrabold text-foreground">Excel ডাউনলোড</span>
              </button>
            </div>
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
};

export default AdvancedExport;
