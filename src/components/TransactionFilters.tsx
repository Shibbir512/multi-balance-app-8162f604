import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
    <div className="flex items-center gap-2">
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="h-8 text-xs w-[110px]">
          <SelectValue placeholder="মাস" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">সব মাস</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={i} value={(i + 1).toString().padStart(2, "0")}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger className="h-8 text-xs w-[90px]">
          <SelectValue placeholder="সাল" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">সব সাল</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilter && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};

export default TransactionFilters;
