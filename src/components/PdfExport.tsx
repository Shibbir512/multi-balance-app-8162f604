import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
  categories: { name: string } | null;
  accounts: { name: string } | null;
}

interface PdfExportProps {
  ledgerName: string;
  transactions: Transaction[];
}

const PdfExport = ({ ledgerName, transactions }: PdfExportProps) => {
  const [exportType, setExportType] = useState<"all" | "income" | "expense">("all");
  const [open, setOpen] = useState(false);

  const generatePdf = async () => {
    const filtered = exportType === "all"
      ? transactions
      : transactions.filter((t) => t.type === exportType);

    if (!filtered.length) {
      toast.error("কোনো লেনদেন পাওয়া যায়নি");
      return;
    }

    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    const totalIncome = sorted.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = sorted.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const label = exportType === "all" ? "সব লেনদেন" : exportType === "income" ? "শুধু জমা" : "শুধু খরচ";
    const dates = sorted.map((t) => t.date);
    const periodText = `${dates[0]} → ${dates[dates.length - 1]}`;

    const fmt = (n: number) => n.toLocaleString("bn-BD");

    const rowsHtml = sorted.map((t, i) => `
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
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;font-weight:500;">${label}</p>
        </div>

        <div style="background:#f1f5f9;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:11px;color:#475569;text-align:center;">
          <b>সময়কাল:</b> ${periodText}
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
          ${new Date().toLocaleString("bn-BD")} এ তৈরি · মোট ${fmt(sorted.length)}টি লেনদেন
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

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-9 rounded-full px-4 gap-1.5 text-xs font-semibold btn-primary"
      >
        <FileDown className="w-3.5 h-3.5" /> PDF
      </Button>

      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>রিপোর্ট এক্সপোর্ট</BottomSheetTitle>
            <BottomSheetDescription>লেনদেনের ধরন বাছাই করুন</BottomSheetDescription>
          </BottomSheetHeader>
          <div className="form-section-gap">
            <Select value={exportType} onValueChange={(v: "all" | "income" | "expense") => setExportType(v)}>
              <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব লেনদেন</SelectItem>
                <SelectItem value="income">শুধু জমা</SelectItem>
                <SelectItem value="expense">শুধু খরচ</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generatePdf} className="w-full h-12 rounded-2xl text-base btn-primary">
              ডাউনলোড করুন
            </Button>
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
};

export default PdfExport;
