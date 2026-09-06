import React from "react";

interface LedgerDetailWatermarkProps {
  ledgerIndex?: number;
}

export default function LedgerDetailWatermark({ ledgerIndex = 0 }: LedgerDetailWatermarkProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      
      {/* Top Right Abstract Circles */}
      <div className="absolute top-[10%] right-[-5%] lg:right-[5%] w-64 h-64 lg:w-96 lg:h-96 rounded-full bg-primary/[0.03] blur-3xl"></div>
      <div className="absolute top-[15%] right-[-2%] lg:right-[8%] w-48 h-48 lg:w-72 lg:h-72 rounded-full bg-primary/[0.04]"></div>

      {/* Bottom Right Bar Chart with Arrow */}
      <div className="absolute bottom-[5%] right-[-10%] lg:right-[0%] opacity-[0.03] text-primary w-[350px] lg:w-[500px]">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect x="20" y="140" width="25" height="60" rx="4" fill="currentColor"/>
          <rect x="60" y="100" width="25" height="100" rx="4" fill="currentColor"/>
          <rect x="100" y="60" width="25" height="140" rx="4" fill="currentColor"/>
          <rect x="140" y="20" width="25" height="180" rx="4" fill="currentColor"/>
          <path d="M40 120 L80 80 L120 40 L160 0" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none"/>
          <polygon points="160,0 150,15 170,15" fill="currentColor" transform="rotate(45 160 0)" />
        </svg>
      </div>

      {/* Left Faint Leaves */}
      <div className="absolute bottom-[10%] left-[-10%] lg:left-[-2%] opacity-[0.04] text-primary w-[200px] lg:w-[300px]">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path fill="currentColor" d="M100 200 Q100 100 20 20 Q100 20 100 100 Q100 20 180 20 Q100 100 100 200" opacity="0.5"/>
            <ellipse cx="60" cy="60" rx="30" ry="60" fill="currentColor" transform="rotate(-45 60 60)"/>
            <ellipse cx="140" cy="60" rx="30" ry="60" fill="currentColor" transform="rotate(45 140 60)"/>
            <ellipse cx="40" cy="120" rx="20" ry="50" fill="currentColor" transform="rotate(-60 40 120)"/>
        </svg>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 w-full opacity-[0.05] text-primary h-[200px] lg:h-[350px]">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
          <path fill="currentColor" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

    </div>
  );
}
