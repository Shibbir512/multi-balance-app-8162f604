import { BookOpen, Receipt, Wallet, Book, BarChart3 } from "lucide-react";

export default function LedgerWatermarkBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* LEFT SIDE: A very large open-book/ledger outline */}
      <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] text-primary opacity-[0.035] transform -rotate-12">
        <BookOpen className="w-full h-full" strokeWidth={0.8} />
      </div>

      {/* TOP RIGHT: A large receipt outline */}
      <div className="absolute top-[5%] -right-[5%] w-[350px] h-[350px] text-primary opacity-[0.035] transform rotate-12">
        <Receipt className="w-full h-full" strokeWidth={0.8} />
      </div>

      {/* RIGHT/MIDDLE: A large wallet or upward financial arrow */}
      <div className="absolute top-[45%] -right-[8%] w-[400px] h-[400px] text-primary opacity-[0.035] transform -rotate-6">
        <Wallet className="w-full h-full" strokeWidth={0.8} />
      </div>

      {/* BOTTOM LEFT: A large ledger/book shape */}
      <div className="absolute bottom-[10%] -left-[15%] w-[600px] h-[600px] text-primary opacity-[0.035] transform rotate-6">
        <Book className="w-full h-full" strokeWidth={0.8} />
      </div>

      {/* BOTTOM RIGHT: A large financial chart/bar-chart outline */}
      <div className="absolute -bottom-[5%] -right-[5%] w-[450px] h-[450px] text-primary opacity-[0.035] transform -rotate-12">
        <BarChart3 className="w-full h-full" strokeWidth={0.8} />
      </div>
    </div>
  );
}
