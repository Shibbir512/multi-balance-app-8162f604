import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("লগইন সফল!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("অ্যাকাউন্ট তৈরি হয়েছে! ইমেইল চেক করুন।");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6 animate-fade-in">
        {/* Premium Glass Badge */}
        <div className="flex flex-col items-center mb-0">
          <div className="relative flex flex-col items-center gap-1.5 w-fit max-w-[220px] py-4 px-6">
            {/* Subtle glow behind text */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(circle at center, rgba(99,102,241,0.12) 0%, transparent 70%)",
                filter: "blur(25px)",
              }}
            />
            <h1
              className="relative text-2xl font-bold text-center"
              style={{
                background: "linear-gradient(135deg, hsl(252,56%,57%), hsl(245,40%,70%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 8px rgba(99,102,241,0.3))",
              }}
            >
              জমা খরচ
            </h1>
            <span className="relative text-xs text-center" style={{ color: "rgba(255,255,255,0.65)" }}>
              আয় বুঝে ব্যয়
            </span>
          </div>

          {/* Tagline */}
          <p className="text-xs text-center mt-2.5" style={{ color: "#9CA3AF" }}>
            {isLogin ? "আপনার অ্যাকাউন্টে লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
          </p>

          {/* Gradient Divider */}
          <div
            className="w-full my-5"
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, #E5E7EB, transparent)",
            }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">ইমেইল</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="rounded-xl"
            />
          </div>
          <Button type="submit" className="w-full h-11 rounded-2xl btn-primary" disabled={loading}>
            {loading ? "অপেক্ষা করুন..." : isLogin ? "লগইন" : "সাইন আপ"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "অ্যাকাউন্ট নেই? সাইন আপ করুন" : "অ্যাকাউন্ট আছে? লগইন করুন"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
