import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";
import { toast } from "sonner";

const BudgetTab = () => {
  const handleComingSoon = () => {
    toast.info("এই ফিচারটি খুব শীঘ্রই যুক্ত করা হবে!");
  };

  return (
    <div className="pb-8 animate-fade-in-up space-y-4 max-w-2xl mx-auto mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#172033]">মাসিক বাজেট</h2>
        <Button onClick={handleComingSoon} className="btn-primary rounded-lg h-9 gap-2">
          <Plus className="w-4 h-4" />
          নতুন বাজেট
        </Button>
      </div>

      <div className="premium-card p-10 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EEF5FF] flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-[#2563EB]" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold text-[#172033] mb-2">কোনো বাজেট সেট করা নেই</h3>
        <p className="text-[#64748B] text-sm max-w-xs mx-auto mb-6">
          মাসিক বাজেট সেট করে আপনার খরচের উপর নিয়ন্ত্রণ রাখুন এবং সঞ্চয় বৃদ্ধি করুন।
        </p>
        <Button onClick={handleComingSoon} className="btn-primary rounded-xl h-11 px-6 font-semibold">
          বাজেট তৈরি করুন
        </Button>
      </div>
    </div>
  );
};

export default BudgetTab;
