import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AssistedPasswordConfirmationProps {
  password: string;
  onMatch?: (matches: boolean) => void;
}

export function AssistedPasswordConfirmation({
  password,
  onMatch,
}: AssistedPasswordConfirmationProps) {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shake, setShake] = useState(false);

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      confirmPassword.length >= password.length &&
      e.target.value.length > confirmPassword.length
    ) {
      setShake(true);
    } else {
      const next = e.target.value;
      setConfirmPassword(next);
      onMatch?.(next === password && password.length > 0);
    }
  };

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const getLetterStatus = (letter: string, index: number) => {
    if (!confirmPassword[index]) return '';
    return confirmPassword[index] === letter ? 'bg-green-500/20' : 'bg-red-500/20';
  };

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const bounceAnimation = {
    x: shake ? [-10, 10, -10, 10, 0] : 0,
    transition: { duration: 0.5 },
  };

  const matchAnimation = {
    scale: passwordsMatch ? [1, 1.03, 1] : 1,
    transition: { duration: 0.3 },
  };

  const borderAnimation = {
    borderColor: passwordsMatch ? '#10B981' : 'rgba(255,255,255,0.08)',
    transition: { duration: 0.3 },
  };

  return (
    <div className="relative w-full flex flex-col items-start">
      {/* Visual preview of password slots */}
      <motion.div
        className="mb-2 h-[46px] w-full rounded-xl border-2 bg-slate-950/50 px-2 py-2"
        animate={{
          ...bounceAnimation,
          ...matchAnimation,
          ...borderAnimation,
        }}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="relative h-full w-fit overflow-hidden rounded-lg">
          {/* Dots row */}
          <div className="z-10 flex h-full items-center justify-center bg-transparent px-0 py-1 tracking-[0.15em]">
            {password.split('').map((_, index) => (
              <div
                key={index}
                className="flex h-full w-4 shrink-0 items-center justify-center"
              >
                <span className="size-[5px] rounded-full bg-slate-400" />
              </div>
            ))}
          </div>
          {/* Color overlay per char */}
          <div className="absolute bottom-0 left-0 top-0 z-0 flex h-full w-full items-center justify-start">
            {password.split('').map((letter, index) => (
              <motion.div
                key={index}
                className={`ease absolute h-full w-4 transition-all duration-300 ${getLetterStatus(letter, index)}`}
                style={{
                  left: `${index * 16}px`,
                  scaleX: confirmPassword[index] ? 1 : 0,
                  transformOrigin: 'left',
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Confirm input */}
      <motion.div
        className="h-[46px] w-full overflow-hidden rounded-xl"
        animate={matchAnimation}
      >
        <motion.input
          className="h-full w-full rounded-xl border-2 bg-slate-950/40 px-3.5 py-3 tracking-[0.4em] outline-none placeholder:tracking-normal text-white text-sm transition-all"
          type="password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          animate={borderAnimation as any}
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        />
      </motion.div>

      {/* Match status hint */}
      {confirmPassword.length > 0 && (
        <p className={`mt-1 text-[10px] font-bold transition-colors ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
          {passwordsMatch ? '✓ Las contraseñas coinciden' : '✗ No coinciden aún…'}
        </p>
      )}
    </div>
  );
}
