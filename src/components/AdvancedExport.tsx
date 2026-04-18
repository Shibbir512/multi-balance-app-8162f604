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

  const downloadPdf = async () => {
    const filtered = getFiltered();
    if (!filtered.length) { toast.error("কোনো লেনদেন পাওয়া যায়নি"); return; }

    const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const label = exportType === "all" ? "সব লেনদেন" : exportType === "income" ? "শুধু জমা" : "শুধু খরচ";
    const catLabel = categoryFilter === "all" ? "সব ক্যাটাগরি" : categoryFilter;
    const periodText = (dateFrom || dateTo) ? `${dateFrom || "শুরু"} → ${dateTo || "শেষ"}` : "সম্পূর্ণ সময়কাল";

    const fmt = (n: number) => n.toLocaleString("bn-BD");

    // ক্যাটাগরি ভিত্তিক খরচ (Pie Chart data)
    const catMap = new Map<string, number>();
    filtered.filter((t) => t.type === "expense").forEach((t) => {
      const name = (t.categories as { name: string })?.name || "অন্যান্য";
      catMap.set(name, (catMap.get(name) || 0) + t.amount);
    });
    const catData = Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const catTotal = catData.reduce((s, d) => s + d.amount, 0);

    // মাসিক জমা/খরচ (Bar Chart data)
    const monthMap = new Map<string, { income: number; expense: number }>();
    filtered.forEach((t) => {
      const ym = t.date.slice(0, 7); // YYYY-MM
      const cur = monthMap.get(ym) || { income: 0, expense: 0 };
      if (t.type === "income") cur.income += t.amount; else cur.expense += t.amount;
      monthMap.set(ym, cur);
    });
    const monthData = Array.from(monthMap.entries())
      .map(([ym, v]) => ({ ym, ...v }))
      .sort((a, b) => a.ym.localeCompare(b.ym));

    // SVG Pie Chart
    const pieColors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#a855f7"];
    const cx = 110, cy = 110, r = 95;
    let cumulativeAngle = -Math.PI / 2;
    const pieSlices = catData.length > 0 ? catData.map((d, i) => {
      const angle = (d.amount / catTotal) * Math.PI * 2;
      const x1 = cx + r * Math.cos(cumulativeAngle);
      const y1 = cy + r * Math.sin(cumulativeAngle);
      cumulativeAngle += angle;
      const x2 = cx + r * Math.cos(cumulativeAngle);
      const y2 = cy + r * Math.sin(cumulativeAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = catData.length === 1
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return `<path d="${path}" fill="${pieColors[i % pieColors.length]}" stroke="#ffffff" stroke-width="2"/>`;
    }).join("") : "";

    const pieLegend = catData.map((d, i) => `
      <div style="display:flex;align-items:center;gap:6px;font-size:10px;margin-bottom:4px;">
        <span style="width:10px;height:10px;border-radius:3px;background:${pieColors[i % pieColors.length]};display:inline-block;flex-shrink:0;"></span>
        <span style="flex:1;color:#334155;">${d.name}</span>
        <span style="color:#64748b;font-weight:600;">৳${fmt(d.amount)} (${Math.round((d.amount / catTotal) * 100)}%)</span>
      </div>
    `).join("");

    // SVG Bar Chart (মাসিক)
    const barW = 700, barH = 220, barPad = 40;
    const maxVal = Math.max(1, ...monthData.flatMap((m) => [m.income, m.expense]));
    const groupW = monthData.length > 0 ? (barW - barPad * 2) / monthData.length : 0;
    const bw = Math.min(28, groupW * 0.35);
    const monthBars = monthData.map((m, i) => {
      const gx = barPad + groupW * i + groupW / 2;
      const incH = (m.income / maxVal) * (barH - 60);
      const expH = (m.expense / maxVal) * (barH - 60);
      const baseY = barH - 30;
      const monthLabel = m.ym.slice(5) + "/" + m.ym.slice(2, 4);
      return `
        <rect x="${gx - bw - 1}" y="${baseY - incH}" width="${bw}" height="${incH}" fill="#10b981" rx="3"/>
        <rect x="${gx + 1}" y="${baseY - expH}" width="${bw}" height="${expH}" fill="#ef4444" rx="3"/>
        <text x="${gx}" y="${baseY + 14}" text-anchor="middle" font-size="9" fill="#64748b">${monthLabel}</text>
      `;
    }).join("");

    const showCharts = catData.length > 0 || monthData.length > 1;

    const chartsHtml = showCharts ? `
      <div style="background:linear-gradient(135deg,#fafbff,#f1f5f9);border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:18px;">
        <h2 style="margin:0 0 14px;font-size:14px;font-weight:800;color:#1e293b;text-align:center;">📊 ভিজ্যুয়াল বিশ্লেষণ</h2>

        ${catData.length > 0 ? `
          <div style="margin-bottom:18px;">
            <h3 style="margin:0 0 10px;font-size:12px;font-weight:700;color:#475569;">ক্যাটাগরি ভিত্তিক খরচ</h3>
            <div style="display:flex;gap:16px;align-items:center;">
              <svg width="220" height="220" style="flex-shrink:0;">${pieSlices}</svg>
              <div style="flex:1;">${pieLegend}</div>
            </div>
          </div>
        ` : ''}

        ${monthData.length > 1 ? `
          <div>
            <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#475569;">মাসিক জমা vs খরচ</h3>
            <div style="display:flex;gap:14px;font-size:10px;margin-bottom:6px;color:#475569;">
              <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#10b981;border-radius:2px;"></span>জমা</span>
              <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#ef4444;border-radius:2px;"></span>খরচ</span>
            </div>
            <svg width="${barW}" height="${barH}" style="background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
              <line x1="${barPad}" y1="${barH - 30}" x2="${barW - barPad}" y2="${barH - 30}" stroke="#cbd5e1" stroke-width="1"/>
              ${monthBars}
            </svg>
          </div>
        ` : ''}
      </div>
    ` : '';

    const rowsHtml = filtered.map((t, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;">${t.date}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;color:${t.type === 'income' ? '#059669' : '#dc2626'};font-weight:600;">${t.type === 'income' ? 'জমা' : 'খরচ'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;">${(t.categories as { name: string })?.name || '-'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;">${(t.accounts as { name: string })?.name || '-'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:right;font-weight:600;">৳${fmt(t.amount)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;">${(t.note || '').replace(/</g, '&lt;')}</td>
      </tr>
    `).join("");

    const html = `
      <div style="width:794px;padding:32px;background:#ffffff;font-family:'Hind Siliguri','Noto Sans Bengali','Kalpurush','SolaimanLipi',system-ui,sans-serif;color:#0f172a;">
        <div style="text-align:center;border-bottom:3px solid #6366f1;padding-bottom:14px;margin-bottom:18px;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#1e293b;">${ledgerName}</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;font-weight:500;">আর্থিক রিপোর্ট</p>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:14px;font-size:11px;color:#475569;">
          <div style="flex:1;background:#f1f5f9;padding:8px 12px;border-radius:8px;"><b>ধরন:</b> ${label}</div>
          <div style="flex:1;background:#f1f5f9;padding:8px 12px;border-radius:8px;"><b>ক্যাটাগরি:</b> ${catLabel}</div>
          <div style="flex:1;background:#f1f5f9;padding:8px 12px;border-radius:8px;"><b>সময়কাল:</b> ${periodText}</div>
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
            <div style="font-size:11px;color:#1e40af;font-weight:600;">ব্যালেন্স</div>
            <div style="font-size:18px;color:#1d4ed8;font-weight:800;margin-top:4px;">৳${fmt(balance)}</div>
          </div>
        </div>

        ${chartsHtml}

        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <thead>
            <tr style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;">
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">তারিখ</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">ধরন</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">ক্যাটাগরি</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">অ্যাকাউন্ট</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:right;">পরিমাণ</th>
              <th style="padding:10px;font-size:12px;font-weight:700;text-align:left;">নোট</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div style="margin-top:20px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
          ${new Date().toLocaleString("bn-BD")} এ তৈরি · মোট ${fmt(filtered.length)}টি লেনদেন
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

      pdf.save(`${ledgerName}-report.pdf`);
      setOpen(false);
      toast.success("PDF ডাউনলোড হয়েছে!");
    } catch (e) {
      console.error(e);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে");
    } finally {
      document.body.removeChild(container);
    }
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
