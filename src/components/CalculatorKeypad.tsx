import React, { useRef, useEffect } from "react";
import { Delete } from "lucide-react";

interface CalculatorKeypadProps {
  onInsert: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEquals: () => void;
  className?: string;
  onClose?: () => void;
}

export const CalculatorKeypad: React.FC<CalculatorKeypadProps> = ({
  onInsert,
  onBackspace,
  onClear,
  onEquals,
  className = "",
}) => {
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);
  const touchHandledRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const triggerHaptic = (duration = 8) => {
    try {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate(duration);
      }
    } catch (_) {}
  };

  const handlePress = (action: () => void) => {
    triggerHaptic();
    action();
  };

  // Press-and-hold (Long press) logic for Delete button
  // Short tap = delete 1 character (backspace)
  // Hold for > 420ms = clear everything (all digits deleted)
  const startDeletePress = () => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      triggerHaptic(40);
      onClear();
    }, 420);
  };

  const endDeletePress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      triggerHaptic(10);
      onBackspace();
    }
    isLongPressRef.current = false;
  };

  const cancelDeletePress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  };

  const handleTouchStart = () => {
    touchHandledRef.current = true;
    startDeletePress();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevents emulated mouse events on touchscreens
    endDeletePress();
    setTimeout(() => {
      touchHandledRef.current = false;
    }, 250);
  };

  const handleMouseDown = () => {
    if (touchHandledRef.current) return;
    startDeletePress();
  };

  const handleMouseUp = () => {
    if (touchHandledRef.current) return;
    endDeletePress();
  };

  return (
    <div
      className={`select-none bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 transition-all ${className}`}
    >
      {/* 5-Column Grid Layout: Constrained max-width to reduce number width, with increased button height */}
      <div className="grid grid-cols-[38px_1fr_1fr_1fr_38px] sm:grid-cols-[44px_1fr_1fr_1fr_44px] gap-1.5 sm:gap-2 max-w-[340px] sm:max-w-[370px] mx-auto">
        {/* ROW 1 */}
        {/* Col 1 (Left Operator): % */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("%"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 font-bold text-[13.5px] sm:text-[14.5px] flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title="শতকরা (%)"
        >
          %
        </button>

        {/* Col 2-4 (Numbers): 7, 8, 9 - Taller height and compact width */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("7"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">৭</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">7</span>
        </button>
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("8"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">৮</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">8</span>
        </button>
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("9"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">৯</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">9</span>
        </button>

        {/* Col 5 (Right Operator): − (বিয়োগ) */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("-"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 font-bold text-[17px] sm:text-[18px] flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title="বিয়োগ (-)"
        >
          −
        </button>

        {/* ROW 2 */}
        {/* Col 1 (Left Operator): ÷ (ভাগ) */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("÷"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 font-bold text-[16px] sm:text-[17px] flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title="ভাগ (÷)"
        >
          ÷
        </button>

        {/* Col 2-4 (Numbers): 4, 5, 6 */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("4"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">৪</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">4</span>
        </button>
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("5"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">৫</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">5</span>
        </button>
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("6"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">৬</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">6</span>
        </button>

        {/* Col 5 (Right Operator): + (যোগ) */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("+"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 font-bold text-[17px] sm:text-[18px] flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title="যোগ (+)"
        >
          +
        </button>

        {/* ROW 3 */}
        {/* Col 1 (Left Operator): × (গুণ) */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("×"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 font-bold text-[14px] sm:text-[15px] flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title="গুণ (×)"
        >
          ×
        </button>

        {/* Col 2-4 (Numbers): 1, 2, 3 */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("1"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">১</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">1</span>
        </button>
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("2"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">২</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">2</span>
        </button>
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("3"))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex flex-col items-center justify-center transition-all active:scale-[0.96] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">৩</span>
          <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">3</span>
        </button>

        {/* Col 5 (Right Operator): ⌫ (Delete) with Press & Hold to clear all */}
        <button
          type="button"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={cancelDeletePress}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={cancelDeletePress}
          onContextMenu={(e) => e.preventDefault()}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-rose-50/80 hover:bg-rose-100 active:bg-rose-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer border border-rose-200/60 dark:border-slate-700/60 select-none touch-manipulation"
          title="মুছুন (চেপে ধরলে সব ডিলিট হবে)"
        >
          <Delete className="w-4 h-4" />
        </button>

        {/* ROW 4 */}
        {/* Col 1 (Left Operator): . (দশমিক বাটন) */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("."))}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 font-black text-2xl flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title="দশমিক (.)"
        >
          .
        </button>

        {/* Col 2-4 (Center Number): ০ (Zero) - Spanning across center 3 columns */}
        <button
          type="button"
          onClick={() => handlePress(() => onInsert("0"))}
          className="col-span-3 h-[52px] sm:h-[56px] rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-foreground flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer shadow-2xs border border-slate-200/70 dark:border-slate-700/70"
          title="০ (0)"
        >
          <span className="text-[25px] sm:text-[27px] font-black text-slate-800 dark:text-slate-100 leading-none">০</span>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">0</span>
        </button>

        {/* Col 5 (Right Operator): = (সমান / ফলাফল) */}
        <button
          type="button"
          onClick={() => handlePress(onEquals)}
          className="h-[52px] sm:h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[17px] sm:text-[18px] flex items-center justify-center transition-all active:scale-[0.94] cursor-pointer shadow-sm shadow-emerald-600/20"
          title="সমান বা হিসাব নিশ্চিত করুন (=)"
        >
          =
        </button>
      </div>
    </div>
  );
};

export default CalculatorKeypad;
