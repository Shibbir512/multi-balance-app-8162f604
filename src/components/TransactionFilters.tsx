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

  const pillTrigger =
    "h-9 text-xs rounded-full px-3.5 gap-1.5 w-auto border font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]";
  const pillStyle = {
    background: 'var(--action-btn-bg)',
    borderColor: 'var(--action-btn-border)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.03)',
  } as React.CSSProperties;

  return (
    <div className="space-y-2.5 w-full">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Month pill */}
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className={pillTrigger} style={pillStyle}>
            <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
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
          <SelectTrigger className={pillTrigger} style={pillStyle}>
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
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
            <SelectTrigger className={pillTrigger} style={pillStyle}>
              <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
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
            className="h-9 w-9 rounded-full border bg-destructive/5 hover:bg-destructive/15 text-destructive transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ borderColor: 'rgba(239,68,68,0.18)' }}
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
              <span className="pointer-events-none absolute inset-0 flex items-center px-3.5 text-[11px] text-muted-foreground truncate font-medium">
                শুরুর তারিখ
              </span>
            )}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={`h-9 text-xs rounded-full border px-3.5 font-semibold transition-colors ${!dateFrom ? "text-transparent" : ""}`}
              style={pillStyle}
            />
          </div>
          <span className="text-xs text-primary font-bold">→</span>
          <div className="flex-1 relative">
            {!dateTo && (
              <span className="pointer-events-none absolute inset-0 flex items-center px-3.5 text-[11px] text-muted-foreground truncate font-medium">
                শেষ তারিখ
              </span>
            )}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className={`h-9 text-xs rounded-full border px-3.5 font-semibold transition-colors ${!dateTo ? "text-transparent" : ""}`}
              style={pillStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;
