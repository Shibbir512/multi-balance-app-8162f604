import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { Download, FileSpreadsheet, FileText, Database, FileDown, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
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
  time?: string | null;
}

interface Props {
  ledgerName: string;
  transactions: Transaction[];
  categories: { id: string; name: string; type: string }[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AdvancedExport = ({
  ledgerName,
  transactions,
  categories,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [exportType, setExportType] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const getFiltered = () => {
    let filtered = [...transactions];
    if (exportType !== "all") filtered = filtered.filter((t) => t.type === exportType);
    if (categoryFilter !== "all") filtered = filtered.filter((t) => (t.categories as { name: string })?.name === categoryFilter);
    if (dateFrom) filtered = filtered.filter((t) => t.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((t) => t.date <= dateTo);
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  };

  const filtered = getFiltered();
  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const catNames = [...new Set(transactions.map((t) => (t.categories as { name: string })?.name).filter(Boolean))];

  // Quick date presets
  const handlePreset = (type: "all" | "this-month" | "last-month" | "this-year") => {
    const now = new Date();
    if (type === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (type === "this-month") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      setDateFrom(`${y}-${m}-01`);
      setDateTo(now.toISOString().split("T")[0]);
    } else if (type === "last-month") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = String(prev.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      setDateFrom(`${y}-${m}-01`);
      setDateTo(`${y}-${m}-${lastDay}`);
    } else if (type === "this-year") {
      const y = now.getFullYear();
      setDateFrom(`${y}-01-01`);
      setDateTo(now.toISOString().split("T")[0]);
    }
  };

  // CSV Export with UTF-8 BOM for perfect Bengali unicode in Excel/Sheets
  const downloadCsv = () => {
    if (!filtered.length) {
      toast.error("কোনো লেনদেন পাওয়া যায়নি");
      return;
    }

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      "ক্রমিক",
      "তারিখ",
      "লেনদেনের ধরন",
      "ক্যাটাগরি",
      "অ্যাকাউন্ট",
      "পরিমাণ (টাকা)",
      "বিবরণ / নোট",
    ];

    const rows = filtered.map((t, idx) => [
      escapeCsv(idx + 1),
      escapeCsv(t.date || ""),
      escapeCsv(t.type === "income" ? "জমা" : "খরচ"),
      escapeCsv((t.categories as { name: string })?.name || "-"),
      escapeCsv((t.accounts as { name: string })?.name || "-"),
      t.amount,
      escapeCsv(t.note || ""),
    ]);

    // Empty separator row and totals
    rows.push([]);
    rows.push([escapeCsv(""), escapeCsv(""), escapeCsv("মোট জমা"), escapeCsv(""), escapeCsv(""), totalIncome, escapeCsv("")]);
    rows.push([escapeCsv(""), escapeCsv(""), escapeCsv("মোট খরচ"), escapeCsv(""), escapeCsv(""), totalExpense, escapeCsv("")]);
    rows.push([escapeCsv(""), escapeCsv(""), escapeCsv("অবশিষ্ট ব্যালেন্স"), escapeCsv(""), escapeCsv(""), balance, escapeCsv("")]);

    const csvContent = [
      headers.map((h) => escapeCsv(h)).join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\r\n");

    // \uFEFF Byte Order Mark ensures Microsoft Excel & spreadsheet readers open Bengali characters cleanly
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeLedgerName = (ledgerName || "ledger").trim().replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `${safeLedgerName}-backup-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setOpen(false);
    toast.success("CSV ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!");
  };

  // PDF Export
  const downloadPdf = async () => {
    if (!filtered.length) {
      toast.error("কোনো লেনদেন পাওয়া যায়নি");
      return;
    }

    setIsGeneratingPdf(true);
    toast.info("PDF রিপোর্ট তৈরি হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন...");

    const label = exportType === "all" ? "সব লেনদেন" : exportType === "income" ? "শুধু জমা" : "শুধু খরচ";
    const periodText = dateFrom || dateTo ? `${dateFrom || "শুরু"} → ${dateTo || "শেষ"}` : "সম্পূর্ণ সময়কাল";
    const fmt = (n: number) => n.toLocaleString("bn-BD");

    // Category breakdown
    const catMap = new Map<string, number>();
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = (t.categories as { name: string })?.name || "অন্যান্য";
        catMap.set(name, (catMap.get(name) || 0) + t.amount);
      });
    const catData = Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const catTotal = catData.reduce((s, d) => s + d.amount, 0);

    // SVG Pie Chart
    const pieColors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#a855f7"];
    const cx = 110,
      cy = 110,
      r = 95;
    let cumulativeAngle = -Math.PI / 2;
    const pieSlices =
      catData.length > 0
        ? catData
            .map((d, i) => {
              const angle = (d.amount / catTotal) * Math.PI * 2;
              const x1 = cx + r * Math.cos(cumulativeAngle);
              const y1 = cy + r * Math.sin(cumulativeAngle);
              cumulativeAngle += angle;
              const x2 = cx + r * Math.cos(cumulativeAngle);
              const y2 = cy + r * Math.sin(cumulativeAngle);
              const largeArc = angle > Math.PI ? 1 : 0;
              const path =
                catData.length === 1
                  ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
                  : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
              return `<path d="${path}" fill="${pieColors[i % pieColors.length]}" stroke="#ffffff" stroke-width="2"/>`;
            })
            .join("")
        : "";

    const pieLegend = catData
      .slice(0, 5)
      .map(
        (d, i) => `
      <div style="display:flex;align-items:center;gap:6px;font-size:10px;margin-bottom:4px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${pieColors[i % pieColors.length]};"></span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.name}</span>
        <span style="font-weight:700;">৳${fmt(d.amount)}</span>
      </div>
    `,
      )
      .join("");

    const rowsHtml = filtered
      .map(
        (t, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;">${t.date}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;color:${t.type === "income" ? "#059669" : "#dc2626"};font-weight:700;">${t.type === "income" ? "জমা" : "খরচ"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;">${(t.categories as { name: string })?.name || "-"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;">${(t.accounts as { name: string })?.name || "-"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:right;font-weight:700;">৳${fmt(t.amount)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;">${(t.note || "").replace(/</g, "&lt;")}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <div style="width:794px;padding:32px;background:#ffffff;font-family:'Noto Sans Bengali','Hind Siliguri',system-ui,sans-serif;color:#0f172a;">
        <div style="text-align:center;border-bottom:3px solid #6366f1;padding-bottom:14px;margin-bottom:16px;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#1e293b;">${ledgerName}</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;font-weight:600;">${label} · লোকাল ব্যাকআপ রিপোর্ট</p>
        </div>

        <div style="background:#f1f5f9;padding:9px 14px;border-radius:8px;margin-bottom:14px;font-size:11px;color:#475569;text-align:center;">
          <b>সময়কাল:</b> ${periodText} · <b>মোট লেনদেন:</b> ${fmt(filtered.length)}টি
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">
          <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);padding:14px;border-radius:12px;border:1px solid #86efac;">
            <div style="font-size:11px;color:#166534;font-weight:600;">মোট জমা</div>
            <div style="font-size:18px;color:#15803d;font-weight:800;margin-top:4px;">৳${fmt(totalIncome)}</div>
          </div>
          <div style="background:linear-gradient(135deg,#fee2e2,#fecaca);padding:14px;border-radius:12px;border:1px solid #fca5a5;">
            <div style="font-size:11px;color:#991b1b;font-weight:600;">মোট খরচ</div>
            <div style="font-size:18px;color:#b91c1c;font-weight:800;margin-top:4px;">৳${fmt(totalExpense)}</div>
          </div>
          <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);padding:14px;border-radius:12px;border:1px solid #93c5fd;">
            <div style="font-size:11px;color:#1e40af;font-weight:600;">অবশিষ্ট ব্যালেন্স</div>
            <div style="font-size:18px;color:#1d4ed8;font-weight:800;margin-top:4px;">৳${fmt(balance)}</div>
          </div>
        </div>

        ${
          catData.length > 0
            ? `
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:14px;margin-bottom:18px;display:flex;align-items:center;gap:20px;">
            <svg width="140" height="140" viewBox="0 0 220 220" style="flex-shrink:0;">${pieSlices}</svg>
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:700;color:#6b21a8;margin-bottom:6px;">প্রধান প্রধান খরচ ক্যাটাগরি</div>
              ${pieLegend}
            </div>
          </div>
        `
            : ""
        }

        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <thead>
            <tr style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;">
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">তারিখ</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">ধরন</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">ক্যাটাগরি</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">অ্যাকাউন্ট</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:right;">পরিমাণ</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">বিবরণ/নোট</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div style="margin-top:20px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
          ${new Date().toLocaleString("bn-BD")} এ তৈরি · জমা খরচ (Joma Khoroch) লোকাল ব্যাকআপ
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;

      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      const safeLedgerName = (ledgerName || "ledger").trim().replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`${safeLedgerName}-report-${dateStr}.pdf`);
      setOpen(false);
      toast.success("PDF রিপোর্ট ডাউনলোড হয়েছে!");
    } catch (e) {
      console.error(e);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে");
    } finally {
      document.body.removeChild(container);
      setIsGeneratingPdf(false);
    }
  };

  // Excel (.xlsx) Export
  const downloadExcel = () => {
    if (!filtered.length) {
      toast.error("কোনো লেনদেন পাওয়া যায়নি");
      return;
    }

    const data = filtered.map((t, idx) => ({
      "ক্রমিক": idx + 1,
      "তারিখ": t.date,
      "ধরন": t.type === "income" ? "জমা" : "খরচ",
      "ক্যাটাগরি": (t.categories as { name: string })?.name || "-",
      "অ্যাকাউন্ট": (t.accounts as { name: string })?.name || "-",
      "পরিমাণ (৳)": t.amount,
      "নোট/বিবরণ": t.note || "",
    }));

    data.push(
      { "ক্রমিক": "" as any, "তারিখ": "", "ধরন": "", "ক্যাটাগরি": "", "অ্যাকাউন্ট": "মোট জমা", "পরিমাণ (৳)": totalIncome, "নোট/বিবরণ": "" },
      { "ক্রমিক": "" as any, "তারিখ": "", "ধরন": "", "ক্যাটাগরি": "", "অ্যাকাউন্ট": "মোট খরচ", "পরিমাণ (৳)": totalExpense, "নোট/বিবরণ": "" },
      { "ক্রমিক": "" as any, "তারিখ": "", "ধরন": "", "ক্যাটাগরি": "", "অ্যাকাউন্ট": "অবশিষ্ট ব্যালেন্স", "পরিমাণ (৳)": balance, "নোট/বিবরণ": "" },
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "লেনদেনের হিসেব");
    const safeLedgerName = (ledgerName || "ledger").trim().replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${safeLedgerName}-report-${dateStr}.xlsx`);
    setOpen(false);
    toast.success("Excel ফাইল ডাউনলোড হয়েছে!");
  };

  return (
    <>
      {trigger !== undefined ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="h-9 rounded-full px-4 gap-1.5 text-xs font-semibold btn-primary"
        >
          <Download className="w-3.5 h-3.5" /> ব্যাকআপ ও এক্সপোর্ট
        </Button>
      )}

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent className="max-w-[560px] p-5">
          <BottomSheetHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "0 6px 16px -4px hsl(var(--primary) / 0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <Database className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <BottomSheetTitle className="text-lg font-bold">ডাটা ব্যাকআপ ও এক্সপোর্ট</BottomSheetTitle>
                <BottomSheetDescription className="text-xs">
                  আপনার খাতার আর্থিক তথ্য লোকালি সংরক্ষণ ও ব্যাকআপ করতে CSV বা PDF ফাইল ডাউনলোড করুন
                </BottomSheetDescription>
              </div>
            </div>
          </BottomSheetHeader>

          <div className="space-y-4 pt-1">
            {/* Quick Filter Presets */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-medium text-muted-foreground shrink-0 mr-1">ফিল্টার প্রিসেট:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePreset("all")}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    !dateFrom && !dateTo
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  সব
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("this-month")}
                  className="px-2.5 py-1 text-xs rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground transition-colors"
                >
                  চলতি মাস
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("last-month")}
                  className="px-2.5 py-1 text-xs rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground transition-colors"
                >
                  গত মাস
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("this-year")}
                  className="px-2.5 py-1 text-xs rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground transition-colors"
                >
                  এই বছর
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">লেনদেনের ধরন</Label>
                <Select value={exportType} onValueChange={(v: "all" | "income" | "expense") => setExportType(v)}>
                  <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব লেনদেন</SelectItem>
                    <SelectItem value="income">শুধু জমা</SelectItem>
                    <SelectItem value="expense">শুধু খরচ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">ক্যাটাগরি</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                    {catNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">শুরুর তারিখ</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">শেষ তারিখ</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Live Data Summary Card */}
            <div className="rounded-2xl p-3 bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">ব্যাকআপের জন্য তৈরি:</span>
                <span className="font-bold text-foreground">{filtered.length}টি লেনদেন</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">+৳{totalIncome.toLocaleString("bn-BD")}</span>
                <span className="text-rose-600 dark:text-rose-400">-৳{totalExpense.toLocaleString("bn-BD")}</span>
              </div>
            </div>

            {/* Export Format Action Buttons */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-muted-foreground">ডাউনলোড ফরম্যাট বেছে নিন:</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. CSV Button (Primary Backup) */}
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="group relative p-3 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between"
                  style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))",
                    borderColor: "rgba(99,102,241,0.25)",
                    boxShadow: "0 2px 8px -2px rgba(99,102,241,0.15)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                      style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)" }}
                    >
                      <Database className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      ব্যাকআপ
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      CSV ফাইল
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      লোকাল ব্যাকআপ ও যেকোনো স্প্রেডশীট
                    </p>
                  </div>
                </button>

                {/* 2. PDF Button */}
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={isGeneratingPdf}
                  className="group relative p-3 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))",
                    borderColor: "rgba(239,68,68,0.25)",
                    boxShadow: "0 2px 8px -2px rgba(239,68,68,0.15)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                      style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
                    >
                      {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      রিপোর্ট
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      PDF ফাইল
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      গ্রাফ ও সারসংক্ষেপসহ প্রিন্টযোগ্য
                    </p>
                  </div>
                </button>

                {/* 3. Excel (.xlsx) Button */}
                <button
                  type="button"
                  onClick={downloadExcel}
                  className="group relative p-3 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))",
                    borderColor: "rgba(16,185,129,0.25)",
                    boxShadow: "0 2px 8px -2px rgba(16,185,129,0.15)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                      style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      এক্সেল
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Excel (.xlsx)
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      টেবিল ও ফর্মুলা উপযোগী শিট
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Offline Safety Assurance Footer */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                ডাউনলোড করা ফাইল সরাসরি আপনার ডিভাইসে সেভ হবে এবং সম্পূর্ণ অফলাইনে সুরক্ষিত থাকবে।
              </span>
            </div>
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
};

export default AdvancedExport;
