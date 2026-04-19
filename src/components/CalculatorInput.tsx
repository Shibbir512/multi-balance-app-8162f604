import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface CalculatorInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

// Convert Bengali digits (০-৯) to English (0-9) for storage & evaluation.
const bnToEnDigits = (s: string): string =>
  s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

// Convert English digits to Bengali for display.
const enToBnDigits = (s: string): string =>
  s.replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d, 10)]);

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
  // Display value in Bengali, but parent stores English numerals.
  const [raw, setRaw] = useState(enToBnDigits(value));
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    setRaw(enToBnDigits(value));
  }, [value]);

  const handleChange = (input: string) => {
    // Convert any English digits the user types to Bengali for display.
    const display = enToBnDigits(input);
    setRaw(display);
    const hasOperator = /[+\-*/%]/.test(display);
    if (hasOperator) {
      setPreview(evaluateExpression(display));
    } else {
      setPreview(null);
      // Store the canonical English numeric string upstream.
      onChange(bnToEnDigits(display));
    }
  };

  const commitPreview = () => {
    if (preview !== null) {
      const enResult = preview.toString();
      setRaw(enToBnDigits(enResult));
      onChange(enResult);
      setPreview(null);
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
