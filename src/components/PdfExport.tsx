import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomSheet, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription } from "@/components/ui/bottom-sheet";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const generatePdf = () => {
    const filtered = exportType === "all"
      ? transactions
      : transactions.filter((t) => t.type === exportType);

    if (!filtered.length) {
      toast.error("কোনো লেনদেন পাওয়া যায়নি");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text(ledgerName, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    const typeLabel = exportType === "all" ? "All Transactions" : exportType === "income" ? "Income" : "Expense";
    doc.text(`Report: ${typeLabel}`, pageWidth / 2, 28, { align: "center" });

    const dates = filtered.map((t) => t.date).sort();
    doc.text(`Period: ${dates[0]} to ${dates[dates.length - 1]}`, pageWidth / 2, 34, { align: "center" });

    const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    doc.setFontSize(11);
    let y = 44;
    doc.text(`Total Income: ${totalIncome.toLocaleString()} BDT`, 14, y);
    doc.text(`Total Expense: ${totalExpense.toLocaleString()} BDT`, 14, y + 7);
    doc.text(`Balance: ${(totalIncome - totalExpense).toLocaleString()} BDT`, 14, y + 14);

    const tableData = filtered.map((t) => [
      t.date,
      t.type === "income" ? "Income" : "Expense",
      (t.categories as any)?.name || "-",
      (t.accounts as any)?.name || "-",
      `${t.amount.toLocaleString()} BDT`,
      t.note || "",
    ]);

    autoTable(doc, {
      startY: y + 22,
      head: [["Date", "Type", "Category", "Account", "Amount", "Note"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`${ledgerName}-report.pdf`);
    setOpen(false);
    toast.success("PDF ডাউনলোড হয়েছে!");
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
            <Select value={exportType} onValueChange={(v: any) => setExportType(v)}>
              <SelectTrigger className="form-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব লেনদেন</SelectItem>
                <SelectItem value="income">শুধু আয়</SelectItem>
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
