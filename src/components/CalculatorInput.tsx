import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface CalculatorInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const evaluateExpression = (expr: string): number | null => {
  try {
    let sanitized = expr.replace(/[^0-9+\-*/().%]/g, "");
    if (!sanitized) return null;
    // Convert "X%" to "(X/100)" so 1000+10% = 1100, 50% = 0.5 etc.
    sanitized = sanitized.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    const result = new Function(`return (${sanitized})`)();
    if (typeof result === "number" && isFinite(result) && result >= 0) return result;
    return null;
  } catch {
    return null;
  }
};

const CalculatorInput = ({ value, onChange, placeholder = "0", className, required }: CalculatorInputProps) => {
  const [raw, setRaw] = useState(value);
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    setRaw(value);
  }, [value]);

  const handleChange = (input: string) => {
    setRaw(input);
    const hasOperator = /[+\-*/]/.test(input);
    if (hasOperator) {
      setPreview(evaluateExpression(input));
    } else {
      setPreview(null);
      onChange(input);
    }
  };

  const handleBlur = () => {
    if (preview !== null) {
      const result = preview.toString();
      setRaw(result);
      onChange(result);
      setPreview(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && preview !== null) {
      e.preventDefault();
      const result = preview.toString();
      setRaw(result);
      onChange(result);
      setPreview(null);
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
        pattern="[0-9+\-*/().%]*"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
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
