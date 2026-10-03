import { Button } from "@/components/ui/button";

const HelpTab = () => {
  return (
    <div className="pb-8 animate-fade-in-up space-y-4 max-w-2xl mx-auto mt-4">
      <h2 className="text-xl font-bold mb-4">সাহায্য ও সাপোর্ট</h2>
      
      <div className="premium-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">কীভাবে কাজ করে?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            খাতা অ্যাপটি আপনার প্রতিদিনের আয় এবং ব্যয়ের হিসাব রাখতে সাহায্য করে। আপনি এখানে আপনার ক্যাটাগরি অনুযায়ী লেনদেনগুলো সাজাতে পারবেন এবং মাসিক রিপোর্ট দেখতে পারবেন।
          </p>
        </div>
        
        <div className="pt-4 border-t">
          <h3 className="font-semibold text-lg mb-2">যোগাযোগ</h3>
          <p className="text-sm text-muted-foreground mb-4">
            কোনো সমস্যা বা পরামর্শ থাকলে আমাদের সাথে যোগাযোগ করতে পারেন।
          </p>
          <Button className="w-full btn-primary h-12 rounded-xl text-md font-semibold">
            সাপোর্ট টিমের সাথে কথা বলুন
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HelpTab;
