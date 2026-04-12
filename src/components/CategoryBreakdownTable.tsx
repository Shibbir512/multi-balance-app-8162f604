import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableProperties } from "lucide-react";

interface Transaction {
  type: string;
  amount: number;
  categories?: { name: string } | null;
}

interface Props {
  transactions: Transaction[];
}

const CategoryBreakdownTable = ({ transactions }: Props) => {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = (t.categories as any)?.name || "অন্যান্য";
        map.set(cat, (map.get(cat) || 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const total = data.reduce((s, d) => s + d.amount, 0);

  if (data.length === 0) return null;

  return (
    <div className="premium-card p-4 mb-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--action-btn-bg)' }}>
          <TableProperties className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <p className="text-xs font-bold text-foreground">ক্যাটাগরি ভিত্তিক খরচ</p>
      </div>
      <div className="rounded-xl overflow-hidden border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-[11px] font-bold h-8 px-3">ক্যাটাগরি</TableHead>
              <TableHead className="text-[11px] font-bold h-8 px-3 text-right">পরিমাণ</TableHead>
              <TableHead className="text-[11px] font-bold h-8 px-3 text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.name}>
                <TableCell className="text-xs px-3 py-2 font-medium">{d.name}</TableCell>
                <TableCell className="text-xs px-3 py-2 text-right font-semibold">৳{d.amount.toLocaleString("bn-BD")}</TableCell>
                <TableCell className="text-xs px-3 py-2 text-right text-muted-foreground">
                  {total > 0 ? Math.round((d.amount / total) * 100) : 0}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/20 font-bold">
              <TableCell className="text-xs px-3 py-2 font-bold">মোট</TableCell>
              <TableCell className="text-xs px-3 py-2 text-right font-bold">৳{total.toLocaleString("bn-BD")}</TableCell>
              <TableCell className="text-xs px-3 py-2 text-right font-bold">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CategoryBreakdownTable;
