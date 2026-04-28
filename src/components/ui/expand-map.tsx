"use client"

import type React from "react"
import { useState, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion"

interface LocationMapProps {
  location?: string
  coordinates?: string
  className?: string
  statusColor?: string
  statusLabel?: string
}

export function LocationMap({
  location = "San Francisco, CA",
  coordinates = "37.7749° N, 122.4194° W",
  className,
  statusColor = "#34D399",
  statusLabel = "Live",
}: LocationMapProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useTransform(mouseY, [-50, 50], [8, -8])
  const rotateY = useTransform(mouseX, [-50, 50], [-8, 8])

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 })
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={containerRef}
      className={`relative cursor-pointer select-none ${className ?? ""}`}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
          background: "rgba(2, 6, 23, 0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        animate={{
          width: isExpanded ? 320 : 220,
          height: isExpanded ? 260 : 130,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 via-transparent to-slate-900/40" />

        {/* Expanded map content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {/* Map background */}
              <div className="absolute inset-0" style={{ background: "rgba(10, 20, 50, 0.9)" }} />

              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {/* Main horizontal roads */}
                <motion.line x1="0%" y1="35%" x2="100%" y2="35%"
                  stroke="rgba(148,163,184,0.35)" strokeWidth="4"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }} />
                <motion.line x1="0%" y1="65%" x2="100%" y2="65%"
                  stroke="rgba(148,163,184,0.35)" strokeWidth="4"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }} />

                {/* Main vertical roads */}
                <motion.line x1="30%" y1="0%" x2="30%" y2="100%"
                  stroke="rgba(148,163,184,0.28)" strokeWidth="3"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }} />
                <motion.line x1="70%" y1="0%" x2="70%" y2="100%"
                  stroke="rgba(148,163,184,0.28)" strokeWidth="3"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }} />

                {/* Secondary streets */}
                {[20, 50, 80].map((y, i) => (
                  <motion.line key={`h-${i}`} x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`}
                    stroke="rgba(148,163,184,0.12)" strokeWidth="1.5"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }} />
                ))}
                {[15, 45, 55, 85].map((x, i) => (
                  <motion.line key={`v-${i}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%"
                    stroke="rgba(148,163,184,0.12)" strokeWidth="1.5"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }} />
                ))}

                {/* Highlighted route */}
                <motion.path
                  d="M 30% 65% L 30% 35% L 50% 35%"
                  stroke="rgba(59,130,246,0.5)" strokeWidth="3" fill="none" strokeDasharray="6 4"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.9 }} />
              </svg>

              {/* City blocks */}
              {[
                { top: "40%", left: "10%", w: "15%", h: "20%" },
                { top: "15%", left: "35%", w: "12%", h: "15%" },
                { top: "70%", left: "75%", w: "16%", h: "18%" },
                { top: "20%", right: "10%", w: "10%", h: "25%" },
                { top: "55%", left: "5%",  w: "8%",  h: "12%" },
                { top: "8%",  left: "75%", w: "14%", h: "10%" },
              ].map((b, i) => (
                <motion.div key={i}
                  className="absolute rounded-sm"
                  style={{ ...b, background: "rgba(148,163,184,0.18)", border: "1px solid rgba(148,163,184,0.1)" } as React.CSSProperties}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                />
              ))}

              {/* Pin */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
              >
                {/* Pulse rings */}
                <motion.div className="absolute inset-0 rounded-full"
                  style={{ background: `${statusColor}30`, width: 48, height: 48, top: -8, left: -8 }}
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2 }} />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  style={{ filter: `drop-shadow(0 0 10px ${statusColor}80)` }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={statusColor} />
                  <circle cx="12" cy="9" r="2.5" fill="rgba(2,6,23,0.9)" />
                </svg>
              </motion.div>

              {/* Bottom fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid pattern (collapsed only) */}
        <motion.div
          className="absolute inset-0 opacity-[0.04]"
          animate={{ opacity: isExpanded ? 0 : 0.04 }}
          transition={{ duration: 0.3 }}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="hdgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,1)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hdgrid)" />
          </svg>
        </motion.div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-4">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} transition={{ duration: 0.3 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 6px ${statusColor}80)` }}>
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" x2="9" y1="3" y2="18" />
                <line x1="15" x2="15" y1="6" y2="21" />
              </svg>
            </motion.div>

            <motion.div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.06)" }}
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div className="w-1.5 h-1.5 rounded-full"
                style={{ background: statusColor }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }} />
              <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">{statusLabel}</span>
            </motion.div>
          </div>

          {/* Bottom row */}
          <div className="space-y-1.5">
            <motion.h3
              className="text-white font-semibold text-sm tracking-tight leading-tight"
              animate={{ x: isHovered ? 3 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {location}
            </motion.h3>

            <AnimatePresence>
              {isExpanded && (
                <motion.p className="text-slate-400 text-[10px] font-mono"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.25 }}>
                  {coordinates}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div
              className="h-px"
              style={{ background: `linear-gradient(to right, ${statusColor}80, ${statusColor}30, transparent)` }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.3 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Click hint */}
      <motion.p
        className="absolute -bottom-5 left-1/2 text-[9px] text-slate-500 whitespace-nowrap font-bold uppercase tracking-widest"
        style={{ x: "-50%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered && !isExpanded ? 1 : 0, y: isHovered ? 0 : 4 }}
        transition={{ duration: 0.2 }}
      >
        Click para expandir
      </motion.p>
    </motion.div>
  )
}
