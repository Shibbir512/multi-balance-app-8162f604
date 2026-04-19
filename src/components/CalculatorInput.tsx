import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface CalculatorInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

const bnToEnDigits = (s: string): string =>
  s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

const enToBnDigits = (s: string): string =>
  s.replace(/[0-9]/g, (d) => BN_DIGITS[parseInt(d, 10)]);

const evaluateExpression = (expr: string): number | null => {
  try {
    let sanitized = bnToEnDigits(expr).replace(/[^0-9+\-*/().%]/g, "");
    if (!sanitized) return null;
    sanitized = sanitized.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    const result = new Function(`return (${sanitized})`)();
    if (typeof result === "number" && isFinite(result) && result >= 0) return result;
    return null;
  } catch {
    return null;
  }
};

const CalculatorInput = ({ value, onChange, placeholder = "০", className, required }: CalculatorInputProps) => {
  const [raw, setRaw] = useState(() => enToBnDigits(value));
  const [preview, setPreview] = useState<number | null>(null);
  const isEditingRef = useRef(false);
  const previewTimerRef = useRef<number | null>(null);

  // Sync from parent only when not actively editing (prevents cursor/IME hang).
  useEffect(() => {
    if (isEditingRef.current) return;
    const next = enToBnDigits(value);
    setRaw((prev) => (prev === next ? prev : next));
  }, [value]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    };
  }, []);

  const handleChange = (input: string) => {
    isEditingRef.current = true;
    const display = enToBnDigits(input);
    setRaw(display);

    const hasOperator = /[+\-*/%]/.test(display);
    if (hasOperator) {
      // Debounce eval so typing isn't blocked.
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = window.setTimeout(() => {
        setPreview(evaluateExpression(display));
      }, 120);
    } else {
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
      setPreview(null);
      const en = bnToEnDigits(display);
      if (en !== value) onChange(en);
    }
  };

  const commitPreview = () => {
    isEditingRef.current = false;
    if (preview !== null) {
      const enResult = preview.toString();
      setRaw(enToBnDigits(enResult));
      onChange(enResult);
      setPreview(null);
    } else {
      // Ensure parent has the latest value on blur (covers operator-typed but uncommitted state).
      const en = bnToEnDigits(raw);
      if (en !== value && /^[0-9.]*$/.test(en)) onChange(en);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && preview !== null) {
      e.preventDefault();
      commitPreview();
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        pattern="[0-9০-৯+\-*/().%]*"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commitPreview}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        required={required}
      />
      {preview !== null && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          = {preview.toLocaleString("bn-BD")}
        </div>
      )}
    </div>
  );
};

export default CalculatorInput;
