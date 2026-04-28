import React from 'react';
import { X, Shield, Wifi } from 'lucide-react';

interface EmployeeBadgeProps {
  onClose: () => void;
  name: string;
  matricula: string;
  puesto: string;
  area?: string;
  avatar: string | null;
  uid: string;
  curp?: string;
  email?: string;
}

/** Purely decorative barcode generated from the matricula string */
function Barcode({ value }: { value: string }) {
  const widths = Array.from(value).map((c) => {
    const code = c.charCodeAt(0);
    return [2, 3, 1, 4, 2, 1, 3, 2, 4, 1][code % 10];
  });
  return (
    <div className="flex items-end gap-[1.5px] h-7">
      {widths.flatMap((w, i) => [
        <div key={`b-${i}`} className="bg-slate-700" style={{ width: w, height: '100%' }} />,
        <div key={`s-${i}`} className="bg-white/5" style={{ width: 1.5, height: '100%' }} />,
      ])}
    </div>
  );
}

export default function EmployeeBadge({
  onClose,
  name,
  matricula,
  puesto,
  area = 'Heavenly Dreams',
  avatar,
  uid,
  curp = '',
  email = '',
}: EmployeeBadgeProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-7 h-7" />
        </button>

        {/* ── CARD ── */}
        <div
          className="relative w-[340px] rounded-[24px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.7)]"
          style={{
            background: 'linear-gradient(145deg, #0a1628 0%, #0d2140 40%, #0a1628 100%)',
            border: '1px solid rgba(0,171,223,0.25)',
          }}
        >
          {/* Ambient glows */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#00ABDF]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          {/* ── HEADER ── */}
          <div
            className="relative flex items-center justify-between px-5 pt-5 pb-4"
            style={{ borderBottom: '1px solid rgba(0,171,223,0.15)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00ABDF] flex items-center justify-center shadow-lg shadow-[#00ABDF]/30">
                <Wifi className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm tracking-tight leading-none">Heavenly Dreams</p>
                <p className="text-[#00ABDF] text-[8px] font-bold tracking-[0.25em] uppercase leading-none mt-0.5">Enterprise · Infinitum</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">ID Empleado</p>
              <p className="text-[10px] font-black text-[#00ABDF] font-mono tracking-wide">{matricula}</p>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="flex items-center gap-5 px-5 py-5">
            {/* Photo */}
            <div className="shrink-0">
              <div
                className="w-[88px] h-[108px] rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  background: 'rgba(0,171,223,0.08)',
                  border: '2px solid rgba(0,171,223,0.3)',
                  boxShadow: '0 0 20px rgba(0,171,223,0.12)',
                }}
              >
                {avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-[#00ABDF]/50 select-none">{initials}</span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Nombre Completo</p>
                <h2 className="text-white font-black text-sm leading-tight tracking-tight">{name}</h2>
              </div>

              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Matrícula</p>
                <p className="text-[#00ABDF] font-black text-xs font-mono tracking-wider">{matricula}</p>
              </div>

              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Puesto</p>
                <p className="text-slate-200 font-bold text-[10px] leading-tight">{puesto}</p>
              </div>

              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Área</p>
                <p className="text-slate-400 font-semibold text-[10px]">{area}</p>
              </div>
            </div>
          </div>

          {/* ── CURP + EMAIL ── */}
          {(curp || email) && (
            <div
              className="mx-5 mt-1 mb-3 rounded-xl px-3 py-2.5 space-y-2"
              style={{ background: 'rgba(0,171,223,0.05)', border: '1px solid rgba(0,171,223,0.12)' }}
            >
              {curp && (
                <div>
                  <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">CURP</p>
                  <p className="text-slate-200 font-mono font-bold text-[10px] tracking-wider">{curp.toUpperCase()}</p>
                </div>
              )}
              {email && (
                <div>
                  <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Correo Electrónico</p>
                  <p className="text-[#00ABDF] font-semibold text-[10px] truncate">{email}</p>
                </div>
              )}
            </div>
          )}

          {/* ── DIVIDER ── */}
          <div className="mx-5" style={{ borderTop: '1px solid rgba(0,171,223,0.10)' }} />

          {/* ── FOOTER ── */}
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <Barcode value={matricula} />
              <p className="text-[7px] font-mono text-slate-600 mt-1 tracking-widest">
                {matricula} · {uid.slice(0, 14)}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-[#00ABDF]/10 border border-[#00ABDF]/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#00ABDF]" />
              </div>
              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Autorizado</p>
            </div>
          </div>

          {/* Bottom accent */}
          <div
            className="h-1.5 w-full"
            style={{ background: 'linear-gradient(90deg, #0284c7, #00ABDF, #38bdf8, #00ABDF, #0284c7)' }}
          />
        </div>

        <p className="text-center text-[9px] text-slate-600 mt-3 tracking-widest">
          DOCUMENTO OFICIAL · NO TRANSFERIBLE · HD {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
