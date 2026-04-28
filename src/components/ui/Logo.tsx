import React, { useState } from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "text-[300px]" }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <div
        className={`relative shrink-0 ${className}`}
        style={{ width: '1em', height: '1em' }}
      >
        <img
          src="/logo.png"
          alt="Heavenly Dreams SAS de CV"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
          style={{ filter: 'drop-shadow(0 0 12px rgba(100,140,255,0.45))' }}
        />
      </div>
    );
  }

  // CSS fallback if image not found
  return (
    <div
      className={`relative flex flex-col justify-center items-center bg-black rounded-full overflow-hidden shrink-0 ${className}`}
      style={{
        width: '1em',
        height: '1em',
        border: '0.05em solid #d1d9e6',
        boxShadow: '0 0 0.066em #8eb9ff, inset 0 0 0.05em rgba(255,255,255,0.5)',
      }}
    >
      <div
        className="absolute w-[200%] h-[200%] pointer-events-none"
        style={{
          background: 'linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%)',
          transform: 'rotate(-20deg)',
        }}
      />
      <div
        className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-[#aeb4be] z-10 leading-none"
        style={{ fontSize: '0.4em', letterSpacing: '-0.04em', filter: 'drop-shadow(0.016em 0.016em 0.04em rgba(0,0,0,0.5))' }}
      >
        HD
      </div>
      <div
        className="text-white uppercase z-10 text-center leading-tight"
        style={{ fontSize: '0.046em', letterSpacing: '0.14em', marginTop: '-0.033em' }}
      >
        Heavenly Dreams
      </div>
      <div className="text-white font-light z-10 leading-tight mt-[0.01em]" style={{ fontSize: '0.04em' }}>
        SAS DE CV
      </div>
    </div>
  );
}
