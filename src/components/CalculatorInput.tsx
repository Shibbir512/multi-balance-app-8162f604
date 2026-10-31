import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CalculatorInputRef {
  insert: (char: string) => void;
  backspace: () => void;
  clear: () => void;
  commit: () => void;
  focus: () => void;
}

interface CalculatorInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  onPreviewChange?: (preview: number | null, commit: () => void) => void;
  inputMode?: "none" | "text" | "decimal" | "numeric";
  onClick?: () => void;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

const bnToEnDigits = (s: string): string =>
  s
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");

const enToBnDigits = (s: string): string =>
  s
    .replace(/[0-9]/g, (d) => BN_DIGITS[parseInt(d, 10)])
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");

const evaluateExpression = (expr: string): number | null => {
  try {
    let sanitized = bnToEnDigits(expr).replace(/[^0-9+\-*/().%]/g, "");
    if (!sanitized) return null;
    // Strip trailing incomplete operators so expressions like '500+' evaluate cleanly while typing
    sanitized = sanitized.replace(/[+\-*/.]+$/, "");
    if (!sanitized) return null;
    sanitized = sanitized.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    const result = new Function(`return (${sanitized})`)();
    if (typeof result === "number" && isFinite(result) && result >= 0) return result;
    return null;
  } catch {
    return null;
  }
};

const CalculatorInput = forwardRef<CalculatorInputRef, CalculatorInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "০",
      className,
      required,
      onPreviewChange,
      inputMode,
      onClick,
    },
    ref
  ) => {
    const rawRef = useRef(enToBnDigits(value));
    const [raw, setRaw] = useState(() => enToBnDigits(value));
    const [preview, setPreview] = useState<number | null>(null);
    const isEditingRef = useRef(false);
    const previewTimerRef = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const onPreviewChangeRef = useRef(onPreviewChange);
    onPreviewChangeRef.current = onPreviewChange;

    const valueRef = useRef(value);
    valueRef.current = value;

    // Sync from parent only when not actively editing (prevents cursor/IME hang).
    useEffect(() => {
      if (!value) {
        isEditingRef.current = false;
        rawRef.current = "";
        setRaw("");
        setPreview(null);
        return;
      }
      if (isEditingRef.current) return;
      const next = enToBnDigits(value);
      if (rawRef.current !== next) {
        rawRef.current = next;
        setRaw(next);
      }
    }, [value]);

    useEffect(() => {
      return () => {
        if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
      };
    }, []);

    const commitPreview = () => {
      isEditingRef.current = false;
      const evalResult = preview !== null ? preview : evaluateExpression(rawRef.current);
      if (evalResult !== null) {
        const enResult = evalResult.toString();
        const bnResult = enToBnDigits(enResult);
        rawRef.current = bnResult;
        setRaw(bnResult);
        onChangeRef.current(enResult);
        setPreview(null);
        if (onPreviewChangeRef.current) onPreviewChangeRef.current(null, () => {});
      } else {
        const en = bnToEnDigits(rawRef.current);
        if (en !== valueRef.current && /^[0-9.]*$/.test(en)) {
          onChangeRef.current(en);
        }
      }
    };

    const handleEvalAndSync = (display: string) => {
      const hasOperator = /[+\-*/%×÷−]/.test(display);
      if (hasOperator) {
        if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = window.setTimeout(() => {
          const evalResult = evaluateExpression(display);
          setPreview(evalResult);
          if (evalResult !== null) {
            onChangeRef.current(evalResult.toString());
          }
          if (onPreviewChangeRef.current) {
            onPreviewChangeRef.current(evalResult, commitPreview);
          }
        }, 50);
      } else {
        if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
        setPreview(null);
        if (onPreviewChangeRef.current) {
          onPreviewChangeRef.current(null, () => {});
        }
        const en = bnToEnDigits(display);
        if (en !== valueRef.current) {
          onChangeRef.current(en);
        }
      }
    };

    const handleChange = (input: string) => {
      isEditingRef.current = true;
      const display = enToBnDigits(input);
      rawRef.current = display;
      setRaw(display);
      handleEvalAndSync(display);
    };

    useImperativeHandle(ref, () => ({
      insert: (char: string) => {
        isEditingRef.current = true;
        const displayChar = enToBnDigits(char);
        const next = rawRef.current + displayChar;
        rawRef.current = next;
        setRaw(next);
        handleEvalAndSync(next);
      },
      backspace: () => {
        isEditingRef.current = true;
        const next = rawRef.current.slice(0, -1);
        rawRef.current = next;
        setRaw(next);
        handleEvalAndSync(next);
      },
      clear: () => {
        isEditingRef.current = true;
        rawRef.current = "";
        setRaw("");
        handleEvalAndSync("");
      },
      commit: () => {
        commitPreview();
      },
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && preview !== null) {
        e.preventDefault();
        commitPreview();
      }
    };

    // Dynamically scale font size when long formulas are entered so text doesn't cramp
    const dynamicFontSize =
      raw.length > 18
        ? "text-[15px]"
        : raw.length > 12
        ? "text-[17px]"
        : raw.length > 8
        ? "text-lg"
        : "text-xl";

    return (
      <div className="relative flex-1 min-w-0" onClick={onClick}>
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode || "decimal"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={commitPreview}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 p-0 shadow-none font-bold tracking-tight text-foreground transition-all cursor-text",
            dynamicFontSize,
            className
          )}
          required={required}
        />
        {/* Fallback inline badge ONLY if external onPreviewChange handler is not attached */}
        {!onPreviewChange && preview !== null && (
          <button
            type="button"
            onClick={commitPreview}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs hover:bg-emerald-100 cursor-pointer"
          >
            = {preview.toLocaleString("bn-BD")}
          </button>
        )}
      </div>
    );
  }
);

CalculatorInput.displayName = "CalculatorInput";

export default CalculatorInput;
