import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
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
    if (categoryFilter !== "all") filtered = filtered.filter((t) => (t.categories as any)?.name === categoryFilter);
    if (dateFrom) filtered = filtered.filter((t) => t.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((t) => t.date <= dateTo);
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  };

  const catNames = [...new Set(transactions.map((t) => (t.categories as any)?.name).filter(Boolean))];

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

    let y = 38;
    doc.setFontSize(10);
    doc.text(`Income: ${totalIncome.toLocaleString()} BDT | Expense: ${totalExpense.toLocaleString()} BDT | Balance: ${(totalIncome - totalExpense).toLocaleString()} BDT`, 14, y);

    const rows = filtered.map((t) => [
      t.date,
      t.type === "income" ? "Income" : "Expense",
      (t.categories as any)?.name || "-",
      (t.accounts as any)?.name || "-",
      `${t.amount.toLocaleString()} BDT`,
      t.note || "",
    ]);

    (doc as any).autoTable({
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
      "ধরন": t.type === "income" ? "আয়" : "খরচ",
      "ক্যাটাগরি": (t.categories as any)?.name || "-",
      "অ্যাকাউন্ট": (t.accounts as any)?.name || "-",
      "পরিমাণ (৳)": t.amount,
      "নোট": t.note || "",
    }));

    const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    data.push(
      { "তারিখ": "", "ধরন": "", "ক্যাটাগরি": "", "অ্যাকাউন্ট": "মোট আয়", "পরিমাণ (৳)": totalIncome, "নোট": "" },
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
            <BottomSheetTitle>রিপোর্ট ডাউনলোড</BottomSheetTitle>
            <BottomSheetDescription>ফিল্টার করে PDF বা Excel ডাউনলোড করুন</BottomSheetDescription>
          </BottomSheetHeader>
          <div className="form-section-gap">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">ধরন</Label>
                <Select value={exportType} onValueChange={(v: any) => setExportType(v)}>
                  <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব</SelectItem>
                    <SelectItem value="income">আয়</SelectItem>
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
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">শেষ তারিখ</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="form-input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={downloadPdf} className="h-12 rounded-2xl text-sm btn-primary gap-2">
                <FileText className="w-4 h-4" /> PDF
              </Button>
              <Button onClick={downloadExcel} className="h-12 rounded-2xl text-sm gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
            </div>
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
};

export default AdvancedExport;
