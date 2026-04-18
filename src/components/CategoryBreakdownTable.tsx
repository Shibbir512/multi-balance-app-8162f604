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
    <div className="premium-card p-0 mb-3 overflow-hidden relative animate-fade-in-up">
      {/* Decorative gradient halo */}
      <div
        className="absolute -top-12 -right-10 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
      />
      {/* Header band */}
      <div
        className="relative flex items-center gap-2.5 px-4 py-3 border-b"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'var(--gradient-primary)',
            boxShadow: '0 4px 12px -2px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <TableProperties className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-extrabold text-foreground leading-tight">
            ক্যাটাগরি ভিত্তিক খরচ
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium">
            {data.length}টি ক্যাটাগরি · মোট ৳{total.toLocaleString("bn-BD")}
          </p>
        </div>
      </div>

      <div className="relative p-4">
        <div className="rounded-xl overflow-hidden border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
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
              <TableRow className="bg-muted/20 font-bold hover:bg-muted/20">
                <TableCell className="text-xs px-3 py-2 font-bold">মোট</TableCell>
                <TableCell className="text-xs px-3 py-2 text-right font-bold">৳{total.toLocaleString("bn-BD")}</TableCell>
                <TableCell className="text-xs px-3 py-2 text-right font-bold">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CategoryBreakdownTable;
