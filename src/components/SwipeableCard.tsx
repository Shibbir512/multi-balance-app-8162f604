import { useRef, useState, useCallback, type CSSProperties, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

interface SwipeableCardProps {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
  style?: CSSProperties;
}

const THRESHOLD = 80;

const SwipeableCard = ({ children, onEdit, onDelete, className = "", style }: SwipeableCardProps) => {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
    isHorizontal.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontal.current) return;

    const clampedDx = Math.min(0, Math.max(-THRESHOLD * 1.5, dx));
    setOffset(clampedDx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    isHorizontal.current = null;
    setOffset(prev => (prev < -THRESHOLD / 2 ? -THRESHOLD : 0));
  }, []);

  const reset = useCallback(() => setOffset(0), []);

  const actionsVisible = offset < -10;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`} style={style}>
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0" style={{ width: THRESHOLD }}>
        <button
          onClick={(e) => { e.stopPropagation(); reset(); onEdit(); }}
          className="flex-1 flex items-center justify-center bg-primary/90 text-primary-foreground transition-opacity"
          style={{ opacity: actionsVisible ? 1 : 0 }}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); reset(); onDelete(); }}
          className="flex-1 flex items-center justify-center bg-destructive text-destructive-foreground transition-opacity"
          style={{ opacity: actionsVisible ? 1 : 0 }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Swipeable content */}
      <div
        ref={cardRef}
        className="premium-card p-3.5 cursor-pointer relative z-10"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? "none" : "transform 0.25s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (Math.abs(offset) > 5) { reset(); return; }
          onEdit();
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;
