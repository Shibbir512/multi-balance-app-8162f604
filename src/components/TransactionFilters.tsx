import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, CalendarDays, Calendar } from "lucide-react";

const MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

interface TransactionFiltersProps {
  month: string;
  year: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onClear: () => void;
}

const TransactionFilters = ({ month, year, onMonthChange, onYearChange, onClear }: TransactionFiltersProps) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const hasFilter = month !== "all" || year !== "all";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Month pill */}
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="h-9 text-xs rounded-full px-3 gap-1.5 w-auto border-0 bg-muted hover:bg-accent transition-colors">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="মাস" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">সব মাস</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={i} value={(i + 1).toString().padStart(2, "0")}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year pill */}
      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger className="h-9 text-xs rounded-full px-3 gap-1.5 w-auto border-0 bg-muted hover:bg-accent transition-colors">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="সাল" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">সব সাল</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filter */}
      {hasFilter && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={onClear}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

export default TransactionFilters;
