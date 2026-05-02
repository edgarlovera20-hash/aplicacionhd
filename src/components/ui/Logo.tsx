import React from 'react';

interface LogoProps {
  className?: string;
}

/**
 * Logo - Premium SVG Implementation
 * Replicates the "HD Bot" design with glassmorphism and modern aesthetics.
 */
export default function Logo({ className = "text-[40px]" }: LogoProps) {
  return (
    <div className={`relative shrink-0 flex items-center justify-center ${className}`} style={{ width: '1em', height: '1.2em' }}>
      <svg
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]"
      >
        {/* Robot Head */}
        <rect x="25" y="10" width="50" height="35" rx="8" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
        <rect x="28" y="13" width="44" height="29" rx="6" fill="#0F172A" />
        
        {/* Eyes (Glowing Blue) */}
        <circle cx="40" cy="28" r="4" fill="#38BDF8">
          <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="28" r="4" fill="#38BDF8">
          <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* Antenna */}
        <line x1="50" y1="10" x2="50" y2="4" stroke="#94A3B8" strokeWidth="1.5" />
        <circle cx="50" cy="3" r="2" fill="#38BDF8" />
        
        {/* Ears */}
        <rect x="21" y="20" width="4" height="15" rx="2" fill="#94A3B8" />
        <rect x="75" y="20" width="4" height="15" rx="2" fill="#94A3B8" />

        {/* Speech Bubble (Glassmorphism Effect) */}
        <path
          d="M10 50C10 44.4772 14.4772 40 20 40H80C85.5228 40 90 44.4772 90 50V90C90 95.5228 85.5228 100 80 100H30L15 115V100C12.2386 100 10 97.7614 10 95V50Z"
          fill="url(#bubbleGradient)"
          fillOpacity="0.8"
          stroke="white"
          strokeOpacity="0.2"
        />
        
        {/* Text "HD" */}
        <text
          x="50"
          y="78"
          textAnchor="middle"
          fill="white"
          style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'Arial Black, sans-serif' }}
        >
          HD
        </text>
        
        {/* Subtext */}
        <text
          x="50"
          y="88"
          textAnchor="middle"
          fill="white"
          style={{ fontSize: '6px', fontWeight: 700, letterSpacing: '0.05em' }}
        >
          HEAVENLY DREAMS
        </text>
        <text
          x="50"
          y="95"
          textAnchor="middle"
          fill="white"
          style={{ fontSize: '5px', fontWeight: 400, letterSpacing: '0.1em' }}
        >
          SAS DE CV
        </text>

        <defs>
          <linearGradient id="bubbleGradient" x1="10" y1="40" x2="90" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
          
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
