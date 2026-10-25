import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { toast } from "sonner";

export const AndroidBackButtonHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPressTime = useRef<number>(0);

  useEffect(() => {
    let listenerHandle: any = null;

    const setupListener = async () => {
      try {
        listenerHandle = await CapApp.addListener("backButton", () => {
          // 1. Check if any open modal, dialog, sheet, or overlay is currently open
          const openDialog = document.querySelector(
            '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
          );

          if (openDialog) {
            // Find any close or back button inside the dialog
            const closeBtn = openDialog.querySelector<HTMLElement>(
              'button[aria-label="Close"], button[title="ফিরে যান"], button[title="বাতিল"], button:has(svg.lucide-arrow-left), button:has(svg.lucide-x)'
            );
            if (closeBtn) {
              closeBtn.click();
              return;
            }

            // Fallback: dispatch Escape key to close Radix dialog
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true })
            );
            return;
          }

          // 2. Check if we are on the root / home page
          const isRoot = location.pathname === "/" || location.pathname === "/auth";

          if (!isRoot) {
            // If on a sub-page (e.g. /ledger/:ledgerId), navigate back to the previous page
            if (window.history.state && typeof window.history.state.idx === "number" && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate("/");
            }
            return;
          }

          // 3. On root / home page: require double-tap within 2 seconds to exit app
          const now = Date.now();
          if (now - lastBackPressTime.current < 2000) {
            CapApp.exitApp();
          } else {
            lastBackPressTime.current = now;
            toast.info("অ্যাপ থেকে বের হতে আবার ব্যাক সোয়াইপ করুন", {
              duration: 2000,
              id: "app-exit-toast",
            });
          }
        });
      } catch (e) {
        // Not running in Capacitor or listener failed
        console.warn("Capacitor App backButton listener not initialized:", e);
      }
    };

    setupListener();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === "function") {
        listenerHandle.remove();
      }
    };
  }, [location.pathname, navigate]);

  return null;
};
