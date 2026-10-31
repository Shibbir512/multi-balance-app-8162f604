import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

const BottomSheet = DialogPrimitive.Root;
const BottomSheetTrigger = DialogPrimitive.Trigger;

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[#080d1c]/45 backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
BottomSheetOverlay.displayName = "BottomSheetOverlay";

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const [viewportState, setViewportState] = React.useState<{
    bottomOffset: number;
    maxHeight: number | null;
  }>({ bottomOffset: 0, maxHeight: null });

  React.useEffect(() => {
    let rafId: number | null = null;

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (typeof window === "undefined" || window.innerWidth >= 768) {
          setViewportState({ bottomOffset: 0, maxHeight: null });
          return;
        }

        if (window.visualViewport) {
          const vv = window.visualViewport;
          // In browsers where the keyboard doesn't resize layout viewport (e.g. iOS Safari),
          // window.innerHeight remains large while visualViewport.height shrinks.
          // Note: DO NOT use vv.offsetTop as scrolling causes offsetTop to fluctuate wildly.
          const diff = Math.max(0, Math.round(window.innerHeight - vv.height));
          const bottomOffset = diff > 60 ? diff : 0;
          const visibleMaxHeight = Math.max(240, Math.floor(vv.height - 8));

          setViewportState((prev) => {
            const bottomDiff = Math.abs(prev.bottomOffset - bottomOffset);
            const heightDiff = prev.maxHeight ? Math.abs(prev.maxHeight - visibleMaxHeight) : 100;
            if (bottomDiff < 4 && heightDiff < 4) {
              return prev;
            }
            return { bottomOffset, maxHeight: visibleMaxHeight };
          });
        } else {
          const visibleMaxHeight = Math.max(240, Math.floor(window.innerHeight - 8));
          setViewportState({ bottomOffset: 0, maxHeight: visibleMaxHeight });
        }
      });
    };

    handleResize();

    window.visualViewport?.addEventListener("resize", handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(isMobile && viewportState.bottomOffset > 0
      ? { bottom: `${viewportState.bottomOffset}px` }
      : {}),
    ...(isMobile && viewportState.maxHeight
      ? { maxHeight: `${viewportState.maxHeight}px` }
      : {}),
  };

  return (
    <DialogPrimitive.Portal>
      <BottomSheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        style={dynamicStyle}
        className={cn(
          "fixed z-50 bg-popover shadow-xl",
          // Animations (duration ONLY during open/close transitions, not persistent layout property transitions)
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=open]:duration-300 data-[state=closed]:duration-200",
          // Mobile (< 768px)
          "inset-x-0 bottom-0 w-full rounded-t-[28px] border-t p-5 flex flex-col max-h-[calc(100dvh-12px)] overflow-hidden",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          // Desktop (>= 768px)
          "md:bottom-auto md:top-[50%] md:left-[50%] md:right-auto md:-translate-x-1/2 md:-translate-y-1/2",
          "md:w-[800px] md:!max-w-[800px] md:min-w-0 md:h-[720px] md:max-h-[calc(100vh-48px)]",
          "md:rounded-[24px] md:border",
          "md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]",
          "md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
BottomSheetContent.displayName = "BottomSheetContent";

const BottomSheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-5", className)} {...props} />
);

const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-bold text-foreground", className)}
    {...props}
  />
));
BottomSheetTitle.displayName = "BottomSheetTitle";

const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground mt-0.5", className)}
    {...props}
  />
));
BottomSheetDescription.displayName = "BottomSheetDescription";

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
};
