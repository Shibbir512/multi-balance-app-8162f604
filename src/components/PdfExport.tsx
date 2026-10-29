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

    toast.info("PDF তৈরি হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন...");

    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    const totalIncome = sorted.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = sorted.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const label = exportType === "all" ? "সব লেনদেন" : exportType === "income" ? "শুধু জমা" : "শুধু খরচ";
    const dates = sorted.map((t) => t.date);
    const periodText = dates.length > 0 ? `${dates[0]} → ${dates[dates.length - 1]}` : "সব লেনদেন";

    const fmt = (n: number) => n.toLocaleString("bn-BD");

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = "794px";
    container.style.zIndex = "-1000";
    document.body.appendChild(container);

    const createPage = (isFirstPage: boolean) => {
      const pageEl = document.createElement("div");
      pageEl.style.width = "794px";
      pageEl.style.padding = "24px 28px";
      pageEl.style.boxSizing = "border-box";
      pageEl.style.background = "#ffffff";
      pageEl.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif";
      pageEl.style.color = "#0f172a";

      const topContent = document.createElement("div");

      if (isFirstPage) {
        topContent.innerHTML = `
          <div style="text-align:center;border-bottom:3px solid #6366f1;padding-bottom:10px;margin-bottom:10px;">
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#1e293b;">${ledgerName || "হিসাব খাতা"}</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;font-weight:600;">${label}</p>
          </div>

          <div style="background:#f1f5f9;padding:6px 12px;border-radius:8px;margin-bottom:10px;font-size:11px;color:#475569;text-align:center;">
            <b>সময়কাল:</b> ${periodText} · <b>মোট লেনদেন:</b> ${fmt(sorted.length)}টি
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
            <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);padding:10px 12px;border-radius:10px;border:1px solid #86efac;">
              <div style="font-size:10.5px;color:#166534;font-weight:600;">মোট জমা</div>
              <div style="font-size:16px;color:#15803d;font-weight:800;margin-top:2px;">৳${fmt(totalIncome)}</div>
            </div>
            <div style="background:linear-gradient(135deg,#fee2e2,#fecaca);padding:10px 12px;border-radius:10px;border:1px solid #fca5a5;">
              <div style="font-size:10.5px;color:#991b1b;font-weight:600;">মোট খরচ</div>
              <div style="font-size:16px;color:#b91c1c;font-weight:800;margin-top:2px;">৳${fmt(totalExpense)}</div>
            </div>
            <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);padding:10px 12px;border-radius:10px;border:1px solid #93c5fd;">
              <div style="font-size:10.5px;color:#1e40af;font-weight:600;">ব্যালেন্স</div>
              <div style="font-size:16px;color:#1d4ed8;font-weight:800;margin-top:2px;">৳${fmt(balance)}</div>
            </div>
          </div>
        `;
      } else {
        topContent.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #6366f1;padding-bottom:6px;margin-bottom:10px;">
            <div>
              <span style="font-size:14px;font-weight:800;color:#1e293b;">${ledgerName || "হিসাব খাতা"}</span>
              <span style="font-size:11px;color:#64748b;margin-left:8px;">${label}</span>
            </div>
            <div style="font-size:10.5px;color:#64748b;">${periodText}</div>
          </div>
        `;
      }

      const tableWrapper = document.createElement("div");
      tableWrapper.style.width = "100%";
      tableWrapper.innerHTML = `
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
          <thead>
            <tr style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;">
              <th style="padding:7px 8px;font-size:11px;font-weight:700;text-align:left;width:12%;">তারিখ</th>
              <th style="padding:7px 8px;font-size:11px;font-weight:700;text-align:left;width:9%;">ধরন</th>
              <th style="padding:7px 8px;font-size:11px;font-weight:700;text-align:left;width:18%;">ক্যাটাগরি</th>
              <th style="padding:7px 8px;font-size:11px;font-weight:700;text-align:left;width:17%;">অ্যাকাউন্ট</th>
              <th style="padding:7px 8px;font-size:11px;font-weight:700;text-align:right;width:16%;">পরিমাণ</th>
              <th style="padding:7px 8px;font-size:11px;font-weight:700;text-align:left;width:28%;">নোট</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `;

      topContent.appendChild(tableWrapper);
      pageEl.appendChild(topContent);

      return {
        pageEl,
        tbody: tableWrapper.querySelector("tbody") as HTMLTableSectionElement,
      };
    };

    try {
      const pageRecords: Array<{ pageEl: HTMLElement; tbody: HTMLTableSectionElement }> = [];
      let currentPage = createPage(true);
      pageRecords.push(currentPage);
      container.appendChild(currentPage.pageEl);

      const MAX_PAGE_HEIGHT = 1050;

      sorted.forEach((t, i) => {
        const tr = document.createElement("tr");
        tr.style.background = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        tr.innerHTML = `
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;white-space:nowrap;">${t.date}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;color:${t.type === "income" ? "#059669" : "#dc2626"};font-weight:700;">${t.type === "income" ? "জমা" : "খরচ"}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;">${(t.categories as { name: string })?.name || "-"}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;">${(t.accounts as { name: string })?.name || "-"}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;text-align:right;font-weight:700;">৳${fmt(t.amount)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;word-break:break-word;">${(t.note || "").replace(/</g, "&lt;")}</td>
        `;

        currentPage.tbody.appendChild(tr);

        if (currentPage.pageEl.offsetHeight > MAX_PAGE_HEIGHT && currentPage.tbody.children.length > 1) {
          currentPage.tbody.removeChild(tr);

          currentPage = createPage(false);
          pageRecords.push(currentPage);
          container.appendChild(currentPage.pageEl);

          currentPage.tbody.appendChild(tr);
        }
      });

      const totalPages = pageRecords.length;

      pageRecords.forEach((p, idx) => {
        const footerDiv = document.createElement("div");
        footerDiv.style.borderTop = "1px solid #e2e8f0";
        footerDiv.style.paddingTop = "6px";
        footerDiv.style.display = "flex";
        footerDiv.style.justifyContent = "space-between";
        footerDiv.style.alignItems = "center";
        footerDiv.style.fontSize = "10px";
        footerDiv.style.color = "#94a3b8";
        footerDiv.innerHTML = `
          <div>${new Date().toLocaleString("bn-BD")} এ তৈরি · জমা খরচ (Joma Khoroch)</div>
          <div style="font-weight:600;color:#64748b;">পৃষ্ঠা ${fmt(idx + 1)} এর ${fmt(totalPages)}</div>
        `;
        p.pageEl.appendChild(footerDiv);

        p.pageEl.style.height = "1123px";
        p.pageEl.style.minHeight = "1123px";
        p.pageEl.style.maxHeight = "1123px";
        p.pageEl.style.display = "flex";
        p.pageEl.style.flexDirection = "column";
        p.pageEl.style.justifyContent = "space-between";
        p.pageEl.style.overflow = "hidden";
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageRecords.length; i++) {
        const canvas = await html2canvas(pageRecords[i].pageEl, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }

      pdf.save(`${ledgerName || "ledger"}-report.pdf`);
      setOpen(false);
      toast.success("PDF ডাউনলোড হয়েছে!");
    } catch (e: any) {
      console.error(e);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে: " + (e?.message || ""));
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
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
