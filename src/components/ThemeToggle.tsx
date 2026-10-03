import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsDark(!isDark)}
      className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center transition-all duration-150 bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.13)] hover:border-[rgba(255,255,255,0.18)] text-[rgba(255,255,255,0.78)] hover:text-white"
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.8} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.8} />}
    </Button>
  );
};

export default ThemeToggle;
