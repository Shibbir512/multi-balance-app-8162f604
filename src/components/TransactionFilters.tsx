import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, CalendarDays, Calendar, Tag, Filter } from "lucide-react";

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
  categoryFilter?: string;
  onCategoryChange?: (v: string) => void;
  categories?: { id: string; name: string; type: string }[];
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (v: string) => void;
  onDateToChange?: (v: string) => void;
}

const TransactionFilters = ({
  month, year, onMonthChange, onYearChange, onClear,
  categoryFilter = "all", onCategoryChange, categories = [],
  dateFrom = "", dateTo = "", onDateFromChange, onDateToChange,
}: TransactionFiltersProps) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const hasFilter = month !== "all" || year !== "all" || categoryFilter !== "all" || dateFrom || dateTo;

  const catNames = [...new Set(categories.map((c) => c.name))];

  return (
    <div className="space-y-2 w-full">
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

        {/* Category pill */}
        {onCategoryChange && catNames.length > 0 && (
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 text-xs rounded-full px-3 gap-1.5 w-auto border-0 bg-muted hover:bg-accent transition-colors">
              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="ক্যাটাগরি" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
              {catNames.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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

      {/* Date range row */}
      {onDateFromChange && onDateToChange && (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            {!dateFrom && (
              <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground truncate">
                শুরুর তারিখ নির্বাচন করুন
              </span>
            )}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={`h-9 text-xs rounded-full border-0 bg-muted px-3 ${!dateFrom ? "text-transparent" : ""}`}
            />
          </div>
          <span className="text-xs text-muted-foreground">→</span>
          <div className="flex-1 relative">
            {!dateTo && (
              <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground truncate">
                শেষ তারিখ নির্বাচন করুন
              </span>
            )}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className={`h-9 text-xs rounded-full border-0 bg-muted px-3 ${!dateTo ? "text-transparent" : ""}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;
