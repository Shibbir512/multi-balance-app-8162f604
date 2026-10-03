import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const SettingsTab = () => {
  return (
    <div className="pb-8 animate-fade-in-up space-y-4 max-w-2xl mx-auto mt-4">
      <h2 className="text-xl font-bold mb-4">সেটিংস</h2>
      
      <div className="premium-card p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">থিম পরিবর্তন</h3>
          <p className="text-sm text-muted-foreground">লাইট বা ডার্ক মোড নির্বাচন করুন</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="premium-card p-4 space-y-3">
        <div>
          <h3 className="font-semibold mb-1">নোটিফিকেশন</h3>
          <p className="text-sm text-muted-foreground mb-4">আপনার নোটিফিকেশন পছন্দগুলো সেট করুন</p>
        </div>
        <Button variant="outline" className="w-full justify-start">
          ডেইলি রিমাইন্ডার
        </Button>
        <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
          অ্যাকাউন্ট মুছুন
        </Button>
      </div>
    </div>
  );
};

export default SettingsTab;
