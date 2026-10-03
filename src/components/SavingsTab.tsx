import { Button } from "@/components/ui/button";
import { Wallet, Plus } from "lucide-react";
import { toast } from "sonner";

const SavingsTab = () => {
  const handleComingSoon = () => {
    toast.info("এই ফিচারটি খুব শীঘ্রই যুক্ত করা হবে!");
  };

  return (
    <div className="pb-8 animate-fade-in-up space-y-4 max-w-2xl mx-auto mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#172033]">লক্ষ্য ও সঞ্চয়</h2>
        <Button onClick={handleComingSoon} className="btn-primary rounded-lg h-9 gap-2" style={{ background: '#6D4AFF', color: 'white' }}>
          <Plus className="w-4 h-4" />
          নতুন লক্ষ্য
        </Button>
      </div>

      <div className="premium-card p-10 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#F0EDFF] flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-[#6D4AFF]" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold text-[#172033] mb-2">কোনো আর্থিক লক্ষ্য নেই</h3>
        <p className="text-[#64748B] text-sm max-w-xs mx-auto mb-6">
          গাড়ি কেনা, বাড়ি তৈরি বা ভ্রমণের জন্য নির্দিষ্ট লক্ষ্য ঠিক করে সঞ্চয় শুরু করুন।
        </p>
        <Button onClick={handleComingSoon} className="rounded-xl h-11 px-6 font-semibold shadow-md hover:shadow-lg transition-all" style={{ background: '#6D4AFF', color: 'white' }}>
          লক্ষ্য সেট করুন
        </Button>
      </div>
    </div>
  );
};

export default SavingsTab;
