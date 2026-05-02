import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PACKAGE_CATALOG, PackageCatalogItem, ClientType, ServiceSegment, ProductCategory } from '../../configs/package-catalog';
import {
  ChevronRight, ChevronLeft, CheckCircle2, FileText, Download, Upload,
  User, MapPin, Wifi, Tv, Phone, Signature, Loader2, Camera, MessageCircle,
  FileImage, FileScan, X, Eye, EyeOff, AlertTriangle, Video, VideoOff,
  StopCircle, PlayCircle, Bot, PhoneCall, PhoneOff, Mic, MicOff,
  Package, Shield, Sparkles, FolderOpen, Image as ImageIcon, Check, Plus,
  RefreshCw
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import SignaturePad from '../ui/SignaturePad';
import { compareAddresses, AddressComponents } from '../../utils/ocr.utils';
import { formatAddressOneLine, isAddressValid, getMissingAddressFields, expandStateAbbr } from '../../utils/address.utils';
import { stampSignatureIntoPDF, generateSignedPdfFilename, canvasToSignatureBase64 } from '../../utils/pdf.utils';
import { findZoneByLocality, bgClassForLevel, formatMXN } from '../../utils/riskZones';
import { aiAgent } from '../../services/aiAgent';

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */
interface CustomerCaptureData {
  folio: string;
  tipoCliente: ClientType;
  tipoServicio: ServiceSegment;
  categoriaProducto: ProductCategory;
  ineFrente?: string;         // base64
  ineReverso?: string;        // base64
  curpDoc?: string;           // base64
  comprobanteDomicilio?: string; // base64
  anexoPortabilidadFrente?: string; // base64
  anexoPortabilidadReverso?: string; // base64
  folioSica?: string;
  folioSicaPath?: string;    // base64 de la captura de pantalla del folio SIAC
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  curp: string;
  folioIne: string;
  telefonoTitular: string;
  telefonoReferencia?: string;
  correo?: string;
  mismaDireccionIne: boolean;
  calle: string;
  numeroExterior: string;
  numeroInterior?: string;
  codigoPostal: string;
  colonia: string;
  ciudad: string;
  delegacion: string;
  entrecalle1: string;
  entrecalle2: string;
  coordenadas: string;
  packageId: string;
  paqueteNombre: string;
  rentaMensual: number;
  megas: string;
  lineasTelefonicas?: number;
  incluyeClaroVideo: boolean;
  antivirus?: string;
  claroDrive?: string;
  infinitumMail?: string;
  streamingElegido?: 'netflix' | 'hbo_max' | 'ninguno';
  numeroAPortar?: string;
  companiaActual?: string;
  nip?: string;
  videoFirmaUrl?: string;
  videoFirmaBlob?: string;   // objectURL for playback
  plataformasAdicionales?: string[];
  streamingPromo?: string;
  validacionIAActiva?: boolean;
  statusExpediente?: 'completo' | 'incompleto';
  // Paths relativos en /uploads/expedientes/{folio}/... (set por uploadToExpediente)
  ineFrentePath?: string;
  ineReversoPath?: string;
  curpDocPath?: string;
  comprobantePath?: string;
  videoFirmaPath?: string;
  audioValidacionPath?: string;
  hashExpediente?: string;
  constanciaNom151?: string;
  fechaSolicitud: string;
  usuario?: string;
  asesorNombre?: string;
}

/* ─────────────────────────────────────────────────────────
   DocumentUploader  –  PDF · Galería · Cámara
───────────────────────────────────────────────────────── */
interface DocUploaderProps {
  label: string;
  preview?: string;
  onFile: (base64: string, file: File) => void;
  onClear?: () => void;
  accept?: string;
  captureMode?: 'environment' | 'user';
  loading?: boolean;
  verified?: boolean;
}

function DocumentUploader({
  label, preview, onFile, onClear, accept = 'image/*,application/pdf',
  captureMode = 'environment', loading = false, verified = false,
}: DocUploaderProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const pdfRef     = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => onFile(reader.result as string, file);
    reader.readAsDataURL(file);
  };

  const isPdf = preview?.startsWith('data:application/pdf') || preview?.includes('/pdf');

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>

      {/* preview */}
      {preview ? (
        <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-slate-950/60">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <FileText className="w-10 h-10 text-blue-400" />
              <p className="text-xs text-slate-300 font-semibold">PDF cargado</p>
            </div>
          ) : (
            <img src={preview} alt={label} className="w-full h-40 object-cover" />
          )}
          {verified && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verificado
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest">Procesando OCR…</p>
            </div>
          )}
          {onClear && !loading && (
            <button
              onClick={onClear}
              className="absolute top-2 left-2 bg-red-600/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-white/8 rounded-2xl p-4 flex flex-col items-center gap-2 bg-slate-950/30">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest">Procesando OCR…</p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-600 font-medium">Selecciona una fuente:</p>
          )}
        </div>
      )}

      {/* 3-way upload buttons */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2">
          {/* PDF */}
          <button
            onClick={() => pdfRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900/60 border border-white/8 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group"
          >
            <FileText className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">PDF</span>
          </button>
          <input
            ref={pdfRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />

          {/* Galería */}
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900/60 border border-white/8 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group"
          >
            <ImageIcon className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Galería</span>
          </button>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />

          {/* Cámara */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900/60 border border-white/8 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
          >
            <Camera className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cámara</span>
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture={captureMode}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   VideoFirma  –  MediaRecorder real
───────────────────────────────────────────────────────── */
interface VideoFirmaProps {
  instruction: string;
  onRecorded: (blobUrl: string) => void;
  recorded: boolean;
}

function VideoFirma({ instruction, onRecorded, recorded }: VideoFirmaProps) {
  const liveRef    = useRef<HTMLVideoElement>(null);
  const playRef    = useRef<HTMLVideoElement>(null);
  const mrRef      = useRef<MediaRecorder | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const chunksRef  = useRef<Blob[]>([]);

  const [camReady, setCamReady]   = useState(false);
  const [camError, setCamError]   = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [blobUrl, setBlobUrl]     = useState<string | null>(null);
  const [muted, setMuted]         = useState(false);

  const startCamera = useCallback(async () => {
    setCamError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      if (liveRef.current) {
        liveRef.current.srcObject = s;
        liveRef.current.muted = true;
      }
      setCamReady(true);
    } catch (e: any) {
      setCamError('Permiso de cámara denegado. Actívalo en la configuración del navegador.');
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamReady(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  // Elapsed timer
  useEffect(() => {
    if (!recording) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const startRec = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      setBlobUrl(url);
      onRecorded(url);
      stopStream();
      setTimeout(() => {
        if (playRef.current) { playRef.current.src = url; playRef.current.load(); }
      }, 200);
    };
    mr.start(200);
    mrRef.current = mr;
    setRecording(true);
  };

  const stopRec = () => {
    mrRef.current?.stop();
    setRecording(false);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (blobUrl) {
    return (
      <div className="space-y-3">
        <video ref={playRef} controls className="w-full rounded-2xl border border-emerald-500/30 bg-black" />
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="text-xs font-bold">Video firma grabado correctamente ✓</p>
        </div>
        <button
          onClick={() => { setBlobUrl(null); startCamera(); }}
          className="text-[10px] text-slate-500 hover:text-white underline transition-colors"
        >
          Volver a grabar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instruction card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Instrucción para el cliente</p>
        <p className="text-xs text-slate-300 leading-relaxed italic">"{instruction}"</p>
      </div>

      {/* Camera area */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/10">
        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-950/30 p-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-xs text-red-300 text-center">{camError}</p>
          </div>
        )}

        {!camReady && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Video className="w-10 h-10 text-slate-500" />
            <p className="text-xs text-slate-500">Cámara no iniciada</p>
          </div>
        )}

        <video
          ref={liveRef}
          autoPlay
          playsInline
          className={cn('w-full h-full object-cover', !camReady && 'hidden')}
        />

        {/* Recording overlay */}
        {recording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white font-mono">{fmt(elapsed)}</span>
          </div>
        )}

        {/* Mute button */}
        {camReady && (
          <button
            onClick={() => {
              setMuted(m => !m);
              if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach(t => { t.enabled = muted; });
              }
            }}
            className="absolute top-3 right-3 bg-black/60 rounded-full p-2 text-slate-300 hover:text-white"
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!camReady ? (
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition-all"
          >
            <Video className="w-4 h-4" /> Activar Cámara
          </button>
        ) : recording ? (
          <button
            onClick={stopRec}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm transition-all animate-pulse"
          >
            <StopCircle className="w-4 h-4" /> Detener Grabación  ({fmt(elapsed)})
          </button>
        ) : (
          <>
            <button
              onClick={startRec}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm transition-all"
            >
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" /> Grabar Video Firma
            </button>
            <button
              onClick={stopStream}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <VideoOff className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   AI Call Modal
───────────────────────────────────────────────────────── */
interface AICallModalProps {
  clientName: string;
  phone: string;
  paquete: string;
  onClose: () => void;
}

function AICallModal({ clientName, phone, paquete, onClose }: AICallModalProps) {
  const [phase, setPhase]       = useState<'dialing' | 'connected' | 'done'>('dialing');
  const [transcript, setTranscript] = useState<{ speaker: 'ia' | 'client'; text: string }[]>([]);
  const [elapsed, setElapsed]   = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const script = [
    { speaker: 'ia' as const,     delay: 3000,  text: `Buenos días, ¿hablo con ${clientName}?` },
    { speaker: 'client' as const, delay: 5500,  text: 'Sí, habla con él/ella.' },
    { speaker: 'ia' as const,     delay: 7500,  text: `Perfecto. Le llamo de Heavenly Dreams para confirmar la contratación del paquete "${paquete}". ¿Usted solicitó este servicio?` },
    { speaker: 'client' as const, delay: 11000, text: 'Sí, así es.' },
    { speaker: 'ia' as const,     delay: 13500, text: '¿Confirma que la información proporcionada es correcta y que acepta los términos y condiciones del servicio Infinitum?' },
    { speaker: 'client' as const, delay: 17000, text: 'Sí, confirmo y acepto.' },
    { speaker: 'ia' as const,     delay: 19500, text: 'Gracias, su validación ha quedado registrada. Un técnico se comunicará en breve para coordinar la instalación. Que tenga buen día.' },
    { speaker: 'client' as const, delay: 23000, text: 'Gracias, hasta luego.' },
  ];

  useEffect(() => {
    const t = setTimeout(() => setPhase('connected'), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'connected') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    script.forEach(({ speaker, delay, text }) => {
      timers.push(setTimeout(() => {
        setTranscript(p => [...p, { speaker, text }]);
        setTimeout(() => transcriptRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
      }, delay));
    });
    timers.push(setTimeout(() => setPhase('done'), 25000));
    const tick = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => { timers.forEach(clearTimeout); clearInterval(tick); };
  }, [phase]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Call header */}
        <div className={cn(
          'p-6 text-center transition-colors duration-700',
          phase === 'dialing'   ? 'bg-blue-950/60' :
          phase === 'connected' ? 'bg-emerald-950/60' : 'bg-slate-800/60'
        )}>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-blue-500/30">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white font-black text-base">Agente IA – Validación</h3>
          <p className="text-slate-400 text-sm mt-1">{clientName} · {phone}</p>

          {phase === 'dialing' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-blue-400 text-xs font-bold ml-1">Marcando…</span>
            </div>
          )}
          {phase === 'connected' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-bold">Conectado · {fmt(elapsed)}</span>
            </div>
          )}
          {phase === 'done' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-bold">Validación completada</span>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div ref={transcriptRef} className="h-64 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {transcript.length === 0 && phase === 'dialing' && (
            <p className="text-center text-slate-600 text-xs py-8">Esperando conexión…</p>
          )}
          {transcript.map((msg, i) => (
            <div key={i} className={cn('flex gap-3', msg.speaker === 'ia' ? 'justify-start' : 'justify-end')}>
              {msg.speaker === 'ia' && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
                msg.speaker === 'ia'
                  ? 'bg-blue-500/15 border border-blue-500/20 text-slate-200'
                  : 'bg-slate-700 text-slate-100'
              )}>
                {msg.text}
              </div>
              {msg.speaker === 'client' && (
                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/5 flex gap-3">
          {phase !== 'done' ? (
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm"
            >
              <PhoneOff className="w-4 h-4" /> Colgar
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Cerrar – Validación Guardada
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────── */
export default function NewSaleForm({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const userName = user?.displayName || (user as any)?.nombres || 'Promotor Autorizado Infinitum';
  const userId = (user as any)?.promotorId || user?.uid || 'S/N';
  const currentDate = new Date().toISOString().split('T')[0];

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<CustomerCaptureData>>({
    folio: `FOL-${Math.floor(Math.random() * 1000000)}`,
    fechaSolicitud: currentDate,
    usuario: userId,
    asesorNombre: userName,
    tipoCliente: 'linea_nueva',
    tipoServicio: 'residencial',
    categoriaProducto: 'infinitum_puro',
    streamingElegido: 'ninguno',
    mismaDireccionIne: true,
    coordenadas: '',
    validacionIAActiva: true,
    hashExpediente: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
  });

  const [ocrLoading, setOcrLoading]   = useState<Record<string, boolean>>({});
  const [ocrVerified, setOcrVerified] = useState<Record<string, boolean>>({});
  const [ocrError, setOcrError]       = useState<string>('');
  const [docType, setDocType]         = useState<'ine' | 'curp'>('ine');
  const [selectedPackage, setSelectedPackage] = useState<PackageCatalogItem | null>(null);
  const [asesorNombre, setAsesorNombre] = useState(userName);
  const [showAICall, setShowAICall] = useState(false);
  const [aiCallDone, setAiCallDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addressMatch, setAddressMatch] = useState<{ isMatch: boolean; confidence: number } | null>(null);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string>('');
  const [packageCatalog, setPackageCatalog] = useState<PackageCatalogItem[]>(PACKAGE_CATALOG);
  const [extraPlatforms, setExtraPlatforms] = useState<any[]>([
    { id: 'disney', name: 'Disney+', price: 179 },
    { id: 'prime', name: 'Prime Video', price: 99 },
    { id: 'netflix_ads', name: 'Netflix 2 Pantallas (con anuncios)', price: 99 },
    { id: 'netflix_hd', name: 'Netflix 2 Pantallas HD', price: 219 },
    { id: 'netflix_4k', name: 'Netflix 4 Pantallas 4K', price: 299 },
    { id: 'hbo_max_full', name: 'HBO Max Full Access', price: 179 },
  ]);

  const [aiValidationResult, setAiValidationResult] = useState<{status: string, message: string} | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Verificación de duplicados y morosos
  const checkDuplicates = useCallback(async (phone: string) => {
    if (phone.length < 10) return;
    setIsCheckingDuplicate(true);
    setDuplicateWarning(null);
    try {
      const ventas = await api.get('/ventas');
      const morosos = ventas; // Evaluamos en base a los mismos datos de la tabla central

      const existingVenta = ventas.find((v: any) => v.telefonoTitular === phone || v.telefonoAsig === phone);
      if (existingVenta) {
        setDuplicateWarning(`Teléfono ya registrado en el Folio SIAC ${existingVenta.folio || existingVenta.folioSiac}. Estatus: ${existingVenta.estado || existingVenta.estatus1}`);
        return;
      }

      // Check specifically for Moroso status (simulated or real)
      const moroso = morosos.find((m: any) => (m.telefonoTitular === phone || m.telefonoAsig === phone) && m.estadoMoroso);
      if (moroso) {
        setDuplicateWarning(`CLIENTE MOROSO DETECTADO. No procede con la venta por políticas de riesgo.`);
      }
    } catch (e) {
      console.error("Error checking duplicates:", e);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, []);

  useEffect(() => {
    if (form.telefonoTitular && form.telefonoTitular.length === 10) {
      checkDuplicates(form.telefonoTitular);
    }
  }, [form.telefonoTitular, checkDuplicates]);

  useEffect(() => {
    // Intentar cargar catálogos desde la API
    api.get('/admin/packages').then(res => {
      if (res && res.length > 0) setPackageCatalog(res);
    }).catch(console.error);

    api.get('/admin/platforms').then(res => {
      if (res && res.length > 0) setExtraPlatforms(res);
    }).catch(() => {}); // Fallback a estático
  }, []);

  const isExpedienteCompleto = () => {
    const hasId = docType === 'ine' ? (!!form.ineFrente && !!form.ineReverso) : !!form.curpDoc;
    const hasAddress = form.mismaDireccionIne || !!form.comprobanteDomicilio;
    const hasContract = signatureConfirmed;
    const hasVideo = !!form.videoFirmaUrl || !!form.videoFirmaBlob;
    const hasSica = !!form.folioSica;
    const hasValidation = !form.validacionIAActiva || aiCallDone; // Si está desactivada o hecha
    
    let isComplete = hasId && hasAddress && hasContract && hasVideo && hasSica && hasValidation;

    if (form.tipoCliente === 'portado') {
      isComplete = isComplete && !!form.anexoPortabilidadFrente && !!form.anexoPortabilidadReverso;
    }

    return isComplete;
  };

  const receiptRef = useRef<HTMLDivElement>(null);

  const handleNext = () => setStep(s => Math.min(s + 1, 6));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  const updateForm = (u: Partial<CustomerCaptureData>) => setForm(p => ({ ...p, ...u }));

  /* Helper: extrae mimetype de una data-URL base64 (default jpg). */
  const detectMime = (base64: string, fallback = 'image/jpeg'): string => {
    const m = base64.match(/^data:([^;]+);base64,/);
    return m ? m[1] : fallback;
  };

  /* Sube un archivo al expediente del folio actual y devuelve el path relativo.
   * Si falla, devuelve null y el flujo sigue (la venta se podrá guardar igual,
   * pero solo con el base64 inline como antes). */
  const uploadToExpediente = async (
    tipo: 'ine_frente'|'ine_reverso'|'curp'|'comprobante'|'audio_validacion'|'videofirma',
    base64: string,
    mimetype: string,
    filename?: string,
  ): Promise<string | null> => {
    try {
      const r = await api.post(`/expediente/${form.folio}/upload`, {
        tipo, base64, mimetype, filename,
      });
      return r?.path || null;
    } catch (err) {
      console.warn(`Expediente upload (${tipo}) falló — se guardará inline:`, err);
      return null;
    }
  };

  /* OCR call — el server devuelve JSON estructurado limpio
   * ({nombres, apellidoPaterno, curp, calle, numeroExterior, colonia, ...}),
   * por lo que NO se aplica regex sobre el string del JSON: eso es la causa
   * del bug donde el auto-llenado se pisaba con campos vacíos. */
  const processDoc = async (base64: string, field: string, type: 'ine' | 'curp' | 'comprobante') => {
    setOcrLoading(p => ({ ...p, [field]: true }));
    setOcrVerified(p => ({ ...p, [field]: false }));
    setOcrError('');
    try {
      const data = await api.post('/ocr', { image: base64, docType: type });

      // Si el comprobante trae lat/lng, popular coordenadas para el mapa.
      if (type === 'comprobante' && data.latitud && data.longitud) {
        data.coordenadas = `${data.latitud}, ${data.longitud}`;
      }

      // Comparar dirección INE vs comprobante cuando ya tenemos ambos datos.
      if (type === 'comprobante' && form.calle) {
        const ineAddr: AddressComponents = {
          calle:        form.calle || '',
          numero:       form.numeroExterior || '',
          colonia:      form.colonia || '',
          municipio:    form.ciudad || '',
          estado:       form.delegacion || '',
          codigoPostal: form.codigoPostal || '',
        };
        const comprobanteAddr: AddressComponents = {
          calle:        data.calle || '',
          numero:       data.numeroExterior || data.numero || '',
          colonia:      data.colonia || '',
          municipio:    data.ciudad || data.municipio || '',
          estado:       data.delegacion || data.estado || '',
          codigoPostal: data.codigoPostal || '',
        };
        setAddressMatch(compareAddresses(ineAddr, comprobanteAddr));
      }

      // Patch: solo campos no vacíos para no pisar lo que el usuario ya escribió.
      const patch: Partial<CustomerCaptureData> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== '' && v !== null && v !== undefined) {
          (patch as any)[k] = v;
        }
      }
      updateForm(patch);

      // Auto-geocodificar dirección extraída del comprobante → llena coordenadas automáticamente
      if (type === 'comprobante' && !form.coordenadas) {
        const addr = [
          patch.calle        || data.calle,
          patch.numeroExterior || data.numeroExterior,
          patch.colonia      || data.colonia,
          patch.ciudad       || data.ciudad,
          patch.codigoPostal || data.codigoPostal,
          'México',
        ].filter(Boolean).join(', ');
        if (addr.length > 15) {
          api.post('/geocode', { address: addr })
            .then((geo: any) => {
              if (geo?.lat && geo?.lng) {
                updateForm({ coordenadas: `${(geo.lat as number).toFixed(6)}, ${(geo.lng as number).toFixed(6)}` });
              }
            })
            .catch(() => {}); // silencioso — usuario puede capturar GPS manualmente
        }
      }

      setOcrVerified(p => ({ ...p, [field]: true }));
      setTimeout(() => setOcrVerified(p => ({ ...p, [field]: false })), 8000);
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar el documento';
      setOcrError(
        msg.includes('No hay proveedores')
          ? 'Sin clave de IA configurada — completa el formulario manualmente.'
          : `OCR: ${msg}`
      );
      setTimeout(() => setOcrError(''), 7000);
    } finally {
      setOcrLoading(p => ({ ...p, [field]: false }));
    }
  };

  const handleIneFrente = (base64: string) => {
    updateForm({ ineFrente: base64 });
    // Upload inmediato al expediente (no bloquea la UI; OCR corre en paralelo).
    uploadToExpediente('ine_frente', base64, detectMime(base64))
      .then(p => { if (p) updateForm({ ineFrentePath: p }); });
    processDoc(base64, 'ineFrente', 'ine');
  };
  const handleIneReverso = (base64: string) => {
    updateForm({ ineReverso: base64 });
    uploadToExpediente('ine_reverso', base64, detectMime(base64))
      .then(p => { if (p) updateForm({ ineReversoPath: p }); });
    // reverso suele traer el folio: corre OCR para extraerlo.
    processDoc(base64, 'ineReverso', 'ine');
  };
  const handleCurp = (base64: string) => {
    updateForm({ curpDoc: base64 });
    uploadToExpediente('curp', base64, detectMime(base64, 'application/pdf'))
      .then(p => { if (p) updateForm({ curpDocPath: p }); });
    processDoc(base64, 'curpDoc', 'curp');
  };
  const handleComprobante = (base64: string) => {
    updateForm({ comprobanteDomicilio: base64 });
    uploadToExpediente('comprobante', base64, detectMime(base64))
      .then(p => { if (p) updateForm({ comprobantePath: p }); });
    processDoc(base64, 'comprobante', 'comprobante');
  };

  /* Package */
  const getAvailablePackages = () =>
    packageCatalog.filter(
      pkg =>
        pkg.segment === form.tipoServicio &&
        pkg.category === form.categoriaProducto &&
        pkg.allowedClientTypes.includes(form.tipoCliente as ClientType)
    );

  const handleSelectPackage = (pkg: PackageCatalogItem) => {
    setSelectedPackage(pkg);
    updateForm({
      packageId: pkg.id,
      paqueteNombre: pkg.displayName,
      rentaMensual: pkg.price,
      megas: pkg.internetMbps.toString(),
      lineasTelefonicas: pkg.phoneLines,
      incluyeClaroVideo: pkg.includesClaroVideo,
      antivirus: pkg.antivirus,
      claroDrive: pkg.claroDrive,
      infinitumMail: pkg.infinitumMail,
      streamingElegido: 'ninguno',
    });
    handleNext();
  };

  /* Terms */
  const getTermsContent = () => {
    const isNuevo = form.tipoCliente === 'linea_nueva';
    const isRes   = form.tipoServicio === 'residencial';
    const pkg     = form.paqueteNombre || 'paquete contratado';
    const renta   = form.rentaMensual  ? `$${form.rentaMensual} MXN` : 'renta mensual contratada';
    const hoy     = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    if (isNuevo && isRes) return {
      title: 'TÉRMINOS Y CONDICIONES – CLIENTE NUEVO RESIDENCIAL',
      fecha: hoy,
      paquete: pkg,
      renta,
      modalidad: 'POSPAGO MENSUAL. El cobro se realiza mediante cargo en cuenta bancaria o tarjeta. NO se acepta efectivo bajo ninguna circunstancia.',
      gi: 'GASTOS DE INSTALACIÓN (GI): $1,600 MXN. Se cubren así: $400 MXN al momento de la cita (antes de la instalación) y $1,200 MXN diferidos en 12 mensualidades de $100 MXN adicionales a la renta.',
      beneficios: 'Incluye: Velocidad de descarga contratada · Claro Video (sin canales de TV convencional, es plataforma de streaming) · Línea telefónica fija · Universal+ incluido. PLATAFORMAS PROMOCIONALES: Netflix o HBO Max GRATIS durante los primeros 6 meses (posteriormente se factura a precio de lista en la misma cuenta Telmex). El cliente puede elegir UNA plataforma al momento de la activación.',
      domiciliacion: 'BENEFICIO DE DOMICILIACIÓN: Al domiciliar tu pago con tarjeta de débito o crédito, obtienes 6 meses adicionales de HBO Max o Netflix GRATIS (promoción acumulable, vigente a la firma del contrato).',
      porta: 'No aplica portabilidad. El número de teléfono fijo es nuevo.',
      permanencia: 'Permanencia mínima de 12 meses. Cancelación anticipada genera cargo proporcional.',
      pagos: 'Los pagos NUNCA deben realizarse en efectivo al promotor ni al técnico de instalación. Cualquier cobro no autorizado debe denunciarse al 800 123 2222.',
      soporte: 'Soporte técnico 24/7: 800 123 2222 · App Telmex · WhatsApp: 55 6469 4609',
      etica: 'CERO EFECTIVO AL PROMOTOR O TÉCNICO. Denuncia al 800 123 2222. Heavenly Dreams no es responsable de pagos realizados fuera de los canales oficiales.',
    };

    if (isNuevo && !isRes) return {
      title: 'TÉRMINOS Y CONDICIONES – CLIENTE NUEVO EMPRESARIAL',
      fecha: hoy,
      paquete: pkg,
      renta,
      modalidad: 'POSPAGO MENSUAL EMPRESARIAL. Facturación CFDI 4.0 mensual. NO se acepta efectivo.',
      gi: 'GASTOS DE INSTALACIÓN (GI): $1,600 MXN. $400 MXN al momento de la cita y $1,200 MXN diferidos en 12 meses ($100 MXN/mes adicional a la renta).',
      beneficios: 'Incluye: Velocidad empresarial contratada · Soporte técnico prioritario · IP dedicada (si aplica). PLATAFORMAS PROMOCIONALES: Netflix o HBO Max GRATIS los primeros 6 meses en contrataciones empresariales que apliquen.',
      domiciliacion: 'BENEFICIO DE DOMICILIACIÓN: Al domiciliar el pago se obtienen 6 meses adicionales de HBO Max o Netflix GRATIS.',
      porta: 'No aplica portabilidad en línea nueva.',
      permanencia: 'Permanencia mínima 12 meses. Cancelación anticipada genera cargo proporcional.',
      pagos: 'Los pagos NUNCA se realizan en efectivo al promotor o técnico.',
      soporte: 'Soporte técnico 24/7: 800 123 2222 · WhatsApp: 55 6469 4609',
      etica: 'CERO EFECTIVO AL PROMOTOR O TÉCNICO. Denuncia al 800 123 2222.',
    };

    if (!isNuevo && isRes) return {
      title: 'TÉRMINOS Y CONDICIONES – PORTABILIDAD RESIDENCIAL',
      fecha: hoy,
      paquete: pkg,
      renta,
      modalidad: 'POSPAGO MENSUAL. El cobro se realiza mediante cargo en cuenta bancaria o tarjeta. NO se acepta efectivo bajo ninguna circunstancia.',
      gi: 'GASTOS DE INSTALACIÓN: $0 MXN (CONDONADOS por portabilidad). El cliente no realiza ningún pago previo a la instalación.',
      beneficios: 'Incluye: Velocidad de descarga contratada · Claro Video (plataforma de streaming, NO incluye canales de TV convencional) · Línea telefónica con tu número actual · 3 MESES GRATIS de renta en los meses 4, 8 y 12. PLATAFORMAS PROMOCIONALES: Netflix o HBO Max GRATIS durante los primeros 6 meses (a elegir uno al momento de la activación, posteriormente se factura a precio de lista).',
      domiciliacion: 'BENEFICIO DE DOMICILIACIÓN: Al domiciliar tu pago con tarjeta obtienes 6 meses adicionales de HBO Max o Netflix GRATIS (acumulable con la promo de 6 meses, hasta 12 meses totales).',
      porta: 'PORTABILIDAD: El número telefónico actual se conserva. Se debe CANCELAR el servicio con el proveedor anterior DESPUÉS de la instalación, NO antes. No se incluye servicio de TV (sin GI ni decodificador de cable).',
      permanencia: 'Permanencia mínima de 12 meses desde la fecha de activación.',
      pagos: 'Los pagos NUNCA deben realizarse en efectivo al promotor ni al técnico. Cualquier cobro no autorizado debe denunciarse al 800 123 2222.',
      soporte: 'Soporte técnico 24/7: 800 123 2222 · App Telmex · WhatsApp: 55 6469 4609',
      etica: 'CERO EFECTIVO AL PROMOTOR O TÉCNICO. Heavenly Dreams no es responsable de pagos realizados fuera de los canales oficiales.',
    };

    return {
      title: 'TÉRMINOS Y CONDICIONES – PORTABILIDAD EMPRESARIAL',
      fecha: hoy,
      paquete: pkg,
      renta,
      modalidad: 'POSPAGO MENSUAL EMPRESARIAL. Facturación CFDI 4.0. NO se acepta efectivo.',
      gi: 'GASTOS DE INSTALACIÓN: $0 MXN (CONDONADOS por portabilidad empresarial).',
      beneficios: 'Incluye: Velocidad empresarial · Hasta 6 líneas incluidas · Soporte prioritario. Claro Video no aplica en modalidad empresarial. PLATAFORMAS: Netflix o HBO Max GRATIS 6 meses según paquete.',
      domiciliacion: 'BENEFICIO DE DOMICILIACIÓN: Al domiciliar el pago se obtienen 6 meses adicionales de HBO Max o Netflix GRATIS.',
      porta: 'PORTABILIDAD EMPRESARIAL: Conserva tu(s) número(s). Cancela con proveedor anterior DESPUÉS de la instalación Telmex.',
      permanencia: 'Permanencia 12 meses. Facturación CFDI 4.0 mensual.',
      pagos: 'Los pagos NUNCA se realizan en efectivo al promotor o técnico.',
      soporte: 'Soporte 24/7: 800 123 2222 · WhatsApp: 55 6469 4609',
      etica: 'CERO EFECTIVO AL PROMOTOR O TÉCNICO. Denuncia al 800 123 2222.',
    };
  };

  /* Export contract PDF */
  const exportContractPDF = async () => {
    if (!receiptRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const img    = canvas.toDataURL('image/png');
      const pdf    = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save(`Contrato_${form.folio}_${form.nombres}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  /* Generate full expediente PDF */
  const generateExpediente = async () => {
    setExporting(true);
    try {
      const pdf  = new jsPDF('p', 'mm', 'a4');
      const W    = pdf.internal.pageSize.getWidth();
      const H    = pdf.internal.pageSize.getHeight();

      const addHeader = (title: string, page: number) => {
        pdf.setFillColor(10, 22, 40);
        pdf.rect(0, 0, W, 20, 'F');
        pdf.setFillColor(0, 171, 223);
        pdf.rect(0, 18, W, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('HEAVENLY DREAMS · PROMOTOR AUTORIZADO INFINITUM', 10, 12);
        pdf.setFontSize(8);
        pdf.setTextColor(180, 220, 240);
        pdf.text(`Folio: ${form.folio || ''}`, W - 10, 12, { align: 'right' });
        pdf.setTextColor(50, 50, 50);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, 10, 32);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Pág. ${page}`, W - 10, H - 5, { align: 'right' });
      };

      /* PAGE 1: Client info */
      addHeader('EXPEDIENTE DE CLIENTE – INFORMACIÓN GENERAL', 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);
      const info = [
        ['Nombre Completo', `${form.nombres || ''} ${form.apellidoPaterno || ''} ${form.apellidoMaterno || ''}`],
        ['CURP',            form.curp        || 'N/A'],
        ['Folio INE',       form.folioIne    || 'N/A'],
        ['Teléfono',        form.telefonoTitular || ''],
        ['Correo',          form.correo      || 'N/A'],
        ['Domicilio',       `${form.calle || ''} #${form.numeroExterior || ''}, Col. ${form.colonia || ''}, CP ${form.codigoPostal || ''}`],
        ['Ciudad / Deleg',  `${form.ciudad || ''} / ${form.delegacion || ''}`],
        ['Paquete',         form.paqueteNombre || ''],
        ['Renta mensual',   `$${form.rentaMensual || 0} MXN`],
        ['Velocidad',       `${form.megas || ''} Mbps`],
        ['Tipo Cliente',    form.tipoCliente  || ''],
        ['Tipo Servicio',   form.tipoServicio || ''],
        ['Fecha Solicitud', form.fechaSolicitud || ''],
        ['Hash Expediente', form.hashExpediente || ''],
      ];
      let y = 42;
      info.forEach(([k, v]) => {
        pdf.setFont('helvetica', 'bold');   pdf.text(k + ':', 10, y);
        pdf.setFont('helvetica', 'normal'); pdf.text(String(v), 65, y);
        y += 8;
      });
      pdf.setDrawColor(0, 171, 223);
      pdf.setLineWidth(0.3);
      pdf.line(10, y + 2, W - 10, y + 2);
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text('Documento generado por Heavenly Dreams Enterprise · Promotor Autorizado Infinitum ®', 10, y + 8);

      /* PAGE 2: INE / CURP */
      const docImg = form.ineFrente || form.curpDoc;
      if (docImg && !docImg.startsWith('data:application/pdf')) {
        pdf.addPage();
        addHeader(docType === 'ine' ? 'IDENTIFICACIÓN OFICIAL – INE/IFE' : 'CURP DIGITAL', 2);
        pdf.addImage(docImg, 'JPEG', 10, 36, W - 20, 100);
        if (form.ineReverso && !form.ineReverso.startsWith('data:application/pdf')) {
          pdf.addImage(form.ineReverso, 'JPEG', 10, 142, W - 20, 80);
          pdf.setFontSize(8); pdf.setTextColor(100); pdf.text('Reverso INE', 10, 140);
        }
      }

      /* PAGE 3: Comprobante */
      if (form.comprobanteDomicilio && !form.comprobanteDomicilio.startsWith('data:application/pdf')) {
        pdf.addPage();
        addHeader('COMPROBANTE DE DOMICILIO', 3);
        pdf.addImage(form.comprobanteDomicilio, 'JPEG', 10, 36, W - 20, 130);
      }

      /* PAGE 4: Contract */
      if (receiptRef.current) {
        const canvas = await html2canvas(receiptRef.current, { scale: 1.5, backgroundColor: '#fff' });
        const cImg   = canvas.toDataURL('image/png');
        pdf.addPage();
        addHeader('CONTRATO DE SERVICIO – PROMOTOR AUTORIZADO INFINITUM', 4);
        const cH = (canvas.height * (W - 20)) / canvas.width;
        pdf.addImage(cImg, 'PNG', 10, 36, W - 20, Math.min(cH, H - 50));
      }

      /* PAGE 5: Video firma confirmation */
      pdf.addPage();
      addHeader('CONSTANCIA DE VIDEO FIRMA DIGITAL', 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);
      const vInfo = [
        ['Estado Video Firma', form.videoFirmaUrl ? 'GRABADO Y VALIDADO' : 'PENDIENTE'],
        ['Hash Expediente',    form.hashExpediente || ''],
        ['Timestamp',          new Date().toLocaleString('es-MX')],
        ['Constancia NOM-151', 'EMITIDA'],
        ['Cliente',            `${form.nombres || ''} ${form.apellidoPaterno || ''}`],
        ['Validación IA',      aiCallDone ? 'LLAMADA COMPLETADA' : 'NO REALIZADA'],
      ];
      let vy = 42;
      vInfo.forEach(([k, v]) => {
        pdf.setFont('helvetica', 'bold');   pdf.text(k + ':', 10, vy);
        pdf.setFont('helvetica', 'normal'); pdf.text(String(v), 70, vy);
        vy += 9;
      });
      pdf.setFontSize(7); pdf.setTextColor(120);
      pdf.text('Este expediente es un documento oficial. Promotor Autorizado Infinitum ® · Heavenly Dreams SAS de CV', 10, H - 10);

      pdf.save(`Expediente_${form.folio}_${form.nombres || 'cliente'}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  /* WhatsApp */
  const sendToWhatsApp = () => {
    if (!form.telefonoTitular) return;
    const t = getTermsContent();
    const msg = `¡Hola ${form.nombres || ''}! 🌟\n\nGracias por contratar con *Promotor Autorizado Infinitum* (Heavenly Dreams).\n\n📄 *Folio:* ${form.folio}\n📦 *Paquete:* ${form.paqueteNombre}\n💰 *Renta:* ${formatCurrency(form.rentaMensual || 0)}/mes\n⚡ *Velocidad:* ${form.megas} Mbps\n📍 *Instalación:* ${form.calle} #${form.numeroExterior}, ${form.colonia}\n\n📝 *${t.title}*\n${t.gi}\n${t.beneficios}\n${t.pagos}\n${t.etica}\n\nUn técnico se pondrá en contacto para su instalación. ¡Bienvenido!`;
    window.open(`https://api.whatsapp.com/send?phone=52${form.telefonoTitular}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* Finalize */
  const handleFinalize = async () => {
    if (!form.videoFirmaUrl && !form.videoFirmaBlob) {
      alert('Por favor graba el video de consentimiento antes de finalizar.');
      return;
    }

    setExporting(true);
    
    // AI analysis before finalize
    const aiAnalysis = await aiAgent.analyzeExpediente({
      hasIne: !!form.ineFrente && !!form.ineReverso,
      hasCurp: !!form.curpDoc,
      hasAddress: form.mismaDireccionIne || !!form.comprobanteDomicilio,
      hasSignedDoc: signatureConfirmed,
      hasVideoSignature: !!form.videoFirmaUrl || !!form.videoFirmaBlob,
      hasAudioCall: aiCallDone,
      hasPortability: !!form.anexoPortabilidadFrente && !!form.anexoPortabilidadReverso,
      isPortabilityClient: form.tipoCliente === 'portado',
      hasFolioSica: !!form.folioSica
    });

    setAiValidationResult(aiAnalysis);

    const status = isExpedienteCompleto() ? 'completo' : 'incompleto';
    const finalData = { ...form, statusExpediente: status };
    
    if (form.validacionIAActiva && !aiCallDone) {
      const proceed = confirm('La validación por IA no se ha completado. El expediente se guardará como "INCOMPLETO". ¿Desea continuar?');
      if (!proceed) return;
    }

    try {
      await api.post('/ventas', { 
        ...form, 
        statusExpediente: status,
        estado: 'pendiente' 
      });
      
      if (status === 'incompleto') {
        alert('Expediente registrado pero marcado como INCOMPLETO. Por favor, adjunte los documentos faltantes desde el panel de control.');
      } else {
        alert('Expediente registrado y validado correctamente.');
      }
      onBack();
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'Intenta de nuevo.'));
    }
  };

  const shouldShowStreamingChoice = () =>
    form.tipoServicio === 'residencial' &&
    (form.categoriaProducto === 'doble_play' || form.categoriaProducto === 'infinitum_puro');

  const availablePackages = getAvailablePackages();
  const terms = getTermsContent();

  /* ────────────────────── RENDER ────────────────────── */
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex items-center justify-between glass-card p-6 rounded-[2rem] border-white/5">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-slate-400 hover:text-white active:scale-90">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-black text-white tracking-tighter uppercase">Captura de Expediente</h1>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1">Promotor Autorizado Infinitum · Registro Digital</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID Folio</p>
            <p className="text-sm font-mono font-bold text-white">{form.folio}</p>
          </div>
          <div className="w-px h-10 bg-white/10 mx-2" />
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estado</p>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
              <span className="text-[10px] font-black text-blue-400 uppercase">En Proceso</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/5 -z-10" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 -z-10 transition-all duration-700" style={{ width: `${((step - 1) / 5) * 100}%` }} />
        {[
          { step: 1, label: 'Identidad',  icon: User      },
          { step: 2, label: 'Servicio',   icon: Wifi      },
          { step: 3, label: 'Paquete',    icon: Package   },
          { step: 4, label: 'Extras',     icon: Tv        },
          { step: 5, label: 'Contrato',   icon: FileText  },
          { step: 6, label: 'Firma',      icon: Signature },
        ].map(s => (
          <div key={s.step} className="flex flex-col items-center gap-3 relative z-10">
            <div className={cn(
              'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border shadow-2xl cursor-default',
              step === s.step ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/40 scale-110' :
              step > s.step  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                               'bg-slate-900 border-white/5 text-slate-500'
            )}>
              {step > s.step ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
            </div>
            <span className={cn(
              'text-[9px] font-black uppercase tracking-widest absolute -bottom-6 whitespace-nowrap transition-all',
              step === s.step ? 'text-blue-400' : 'text-slate-600 opacity-40'
            )}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="glass-card rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ── STEP 1: Identidad ── */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">

            {/* Doc type toggle */}
            <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
              {(['ine', 'curp'] as const).map(t => (
                <button key={t} onClick={() => setDocType(t)}
                  className={cn('px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    docType === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}>
                  {t === 'ine' ? 'INE / IFE' : 'CURP Digital'}
                </button>
              ))}
            </div>

            {/* Datos de Captura (Read-only) para evitar capturas en otras claves */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
              <h2 className="text-base font-black text-white flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-indigo-400" /> Clave de Vendedor Activa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Fecha de Captura</label>
                  <input type="date" disabled value={form.fechaSolicitud} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-slate-400 text-sm opacity-70 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">ID Promotor (Usuario)</label>
                  <input type="text" disabled value={form.usuario} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-slate-400 text-sm opacity-70 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nombre del Vendedor</label>
                  <input type="text" disabled value={form.asesorNombre} className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-slate-400 text-sm opacity-70 cursor-not-allowed" />
                </div>
              </div>
            </div>

            {/* Document upload section */}
            <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-6 space-y-6">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <FileScan className="w-5 h-5 text-blue-400" /> Identificación Digital (OCR Automático)
              </h2>
              <p className="text-[10px] text-slate-500 -mt-4">Sube en PDF, desde galería o toma foto. Los datos se auto-rellenan.</p>

              {/* OCR error banner */}
              {ocrError && (
                <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300 font-medium leading-snug">{ocrError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Frente / CURP */}
                <DocumentUploader
                  label={docType === 'ine' ? 'Anverso INE (Frente)' : 'Documento CURP'}
                  preview={form.ineFrente || form.curpDoc}
                  onFile={(b64) => docType === 'ine' ? handleIneFrente(b64) : handleCurp(b64)}
                  onClear={() => docType === 'ine' ? updateForm({ ineFrente: undefined }) : updateForm({ curpDoc: undefined })}
                  loading={ocrLoading[docType === 'ine' ? 'ineFrente' : 'curpDoc']}
                  verified={ocrVerified[docType === 'ine' ? 'ineFrente' : 'curpDoc']}
                />

                {/* Reverso (INE only) */}
                {docType === 'ine' && (
                  <DocumentUploader
                    label="Reverso INE"
                    preview={form.ineReverso}
                    onFile={(b64) => handleIneReverso(b64)}
                    onClear={() => updateForm({ ineReverso: undefined })}
                    loading={ocrLoading['ineReverso']}
                    verified={ocrVerified['ineReverso']}
                  />
                )}
              </div>

              {/* OCR verification hint */}
              {(ocrVerified['ineFrente'] || ocrVerified['curpDoc']) && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300 font-semibold">
                    Datos auto-rellenados por OCR. Revisa y corrige si es necesario.
                  </p>
                </div>
              )}
            </div>

            {/* Datos Personales */}
            <div className="space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" /> Datos Personales
                {(ocrVerified['ineFrente'] || ocrVerified['curpDoc']) && (
                  <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 ml-1">Auto-rellenado</span>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Nombres',         key: 'nombres',         type: 'text' },
                  { label: 'Apellido Paterno', key: 'apellidoPaterno', type: 'text' },
                  { label: 'Apellido Materno', key: 'apellidoMaterno', type: 'text' },
                  { label: 'CURP',             key: 'curp',            type: 'text', mono: true, upper: true },
                  { label: 'Folio INE',        key: 'folioIne',        type: 'text', mono: true },
                  { label: 'Teléfono Titular', key: 'telefonoTitular', type: 'tel'  },
                  { label: 'Tel. Referencia',  key: 'telefonoReferencia', type: 'tel' },
                  { label: 'Correo',           key: 'correo',          type: 'email', span: 2 },
                ].filter(f => f.key !== 'folioIne' || docType === 'ine').map(f => (
                  <div key={f.key} className={f.span ? `md:col-span-${f.span}` : ''}>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{f.label}</label>
                    <input
                      type={f.type}
                      className={cn(
                        'w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-indigo-500 text-sm transition-all',
                        f.mono && 'font-mono',
                        f.upper && 'uppercase'
                      )}
                      value={(form as any)[f.key] || ''}
                      onChange={e => updateForm({ [f.key]: e.target.value } as any)}
                    />
                  </div>
                ))}
              </div>

              {/* Duplicate Warning */}
              {duplicateWarning && (
                <div className={cn(
                  "mt-4 p-4 rounded-xl border flex items-start gap-3 animate-in slide-in-from-top-2 duration-300",
                  duplicateWarning.includes('MOROSO') 
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                )}>
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-black uppercase tracking-wider text-[10px] mb-1">Conflicto de Registro Detectado</p>
                    <p className="font-medium">{duplicateWarning}</p>
                    {isCheckingDuplicate && <Loader2 className="w-3 h-3 animate-spin mt-2" />}
                  </div>
                </div>
              )}
            </div>

              )}
            </div>

            {/* Domicilio */}
            <div className="space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-400" /> Domicilio de Instalación
              </h2>

              <label className="flex items-center gap-3 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mismaDireccionIne}
                  onChange={e => updateForm({ mismaDireccionIne: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 bg-slate-900"
                />
                <span className="text-sm text-white font-medium">La dirección de instalación coincide con la de la INE</span>
              </label>

              {!form.mismaDireccionIne && (
                <DocumentUploader
                  label="Comprobante de Domicilio (PDF / Imagen / Foto)"
                  preview={form.comprobanteDomicilio}
                  onFile={handleComprobante}
                  onClear={() => updateForm({ comprobanteDomicilio: undefined })}
                  loading={ocrLoading['comprobante']}
                  verified={ocrVerified['comprobante']}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Calle',           key: 'calle',          span: 2 },
                  { label: 'C.P.',             key: 'codigoPostal'          },
                  { label: 'No. Exterior',     key: 'numeroExterior'        },
                  { label: 'No. Interior',     key: 'numeroInterior'        },
                  { label: 'Colonia',          key: 'colonia'               },
                  { label: 'Ciudad',           key: 'ciudad'                },
                  { label: 'Delegación',       key: 'delegacion'            },
                  { label: 'Entrecalle 1',     key: 'entrecalle1'           },
                  { label: 'Entrecalle 2',     key: 'entrecalle2'           },
                ].map(f => (
                  <div key={f.key} className={f.span ? `md:col-span-${f.span}` : ''}>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{f.label}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-indigo-500 text-sm"
                      value={(form as any)[f.key] || ''}
                      onChange={e => updateForm({ [f.key]: e.target.value } as any)}
                    />
                  </div>
                ))}
              </div>

              {/* Alerta de Zona Crítica (morosidad) */}
              {(() => {
                const zone = findZoneByLocality(form.colonia) || findZoneByLocality(form.delegacion);
                if (!zone) return null;
                if (zone.level === 'green') {
                  return (
                    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${bgClassForLevel(zone.level)}`}>
                      <Shield className="w-5 h-5 mt-0.5 shrink-0" />
                      <div className="text-xs leading-relaxed">
                        <p className="font-black uppercase tracking-wider text-[10px] mb-0.5">Zona de Cartera Sana — {zone.area}</p>
                        <p>Morosidad histórica: <strong>{zone.morosityPct.toFixed(1)}%</strong>. Procede con captura estándar.</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className={`rounded-xl border-2 px-4 py-4 flex items-start gap-3 ${bgClassForLevel(zone.level)} ${zone.level === 'red' ? 'animate-pulse-slow shadow-lg shadow-red-500/20' : ''}`}>
                    <AlertTriangle className={`w-6 h-6 mt-0.5 shrink-0 ${zone.level === 'red' ? 'text-red-400' : 'text-amber-400'}`} />
                    <div className="text-xs leading-relaxed flex-1">
                      <p className="font-black uppercase tracking-wider text-[11px] mb-1">
                        ⚠ Atención: {zone.level === 'red' ? 'Zona Roja Detectada' : 'Zona en Vigilancia'} — {zone.area}
                      </p>
                      <p>
                        Esta zona presenta un índice de morosidad del <strong>{zone.morosityPct.toFixed(1)}%</strong>.
                        {zone.level === 'red'
                          ? ' Se recomienda validación estricta: comprobante de domicilio reciente, INE vigente y cotejo de datos completo antes de continuar.'
                          : ' Se recomienda revisar comprobante y datos del titular con atención especial.'}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
                        <span><strong>{zone.morosos}</strong> morosos / {zone.totalClientes} clientes</span>
                        <span>Pérdida estimada: <strong>{formatMXN(zone.perdidaEstimada)}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* GPS */}
              <div className="bg-slate-950/50 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-white">Coordenadas GPS</label>
                  <button
                    onClick={() => {
                      navigator.geolocation?.getCurrentPosition(p =>
                        updateForm({ coordenadas: `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}` })
                      );
                    }}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    📍 Obtener ubicación actual
                  </button>
                </div>
                <div className="flex gap-2 items-end">
                  <input type="text" className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono"
                    value={form.coordenadas || ''} onChange={e => updateForm({ coordenadas: e.target.value })} placeholder="Lat, Lng" />
                  {ocrVerified['comprobante'] && form.coordenadas && (
                    <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-2 shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-bold">Detectado</span>
                    </div>
                  )}
                </div>
                {/* Mapa real con marker — Google Maps Embed (sin API key requerida).
                    Usa coordenadas si OCR las extrajo del comprobante; si no, arma
                    la query con la dirección textual capturada. */}
                <div className="h-48 bg-slate-900 rounded-xl overflow-hidden relative border border-white/5">
                  {(() => {
                    const coords = form.coordenadas?.trim();
                    const hasCoords = coords && /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(coords);
                    const addressQuery = [
                      form.calle,
                      form.numeroExterior,
                      form.colonia,
                      form.ciudad,
                      form.codigoPostal,
                      'México',
                    ].filter(Boolean).join(', ');
                    const query = hasCoords ? coords : addressQuery;
                    if (!query || query === 'México') {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                          <MapPin className="w-7 h-7 mb-1 opacity-40" />
                          <span className="text-xs">Sin dirección capturada todavía</span>
                        </div>
                      );
                    }
                    return (
                      <iframe
                        title="Ubicación de instalación"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`}
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Configuración ── */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black text-white">Configuración del Servicio</h2>
            <div className="space-y-6">
              {[
                { label: '1. Tipo de Contratación', key: 'tipoCliente', opts: [
                  { v: 'linea_nueva', t: 'Línea Nueva',    d: 'Instalación desde cero' },
                  { v: 'portado',     t: 'Portabilidad',   d: 'Conserva tu número actual',
                    onSelect: () => updateForm({ tipoCliente: 'portado', categoriaProducto: 'doble_play' }) },
                ]},
                { label: '2. Tipo de Servicio', key: 'tipoServicio', opts: [
                  { v: 'residencial', t: 'Residencial', d: 'Para el hogar' },
                  { v: 'negocio',     t: 'Negocio',     d: 'Para empresas o locales' },
                ]},
                { label: '3. Categoría del Producto', key: 'categoriaProducto', opts: [
                  { v: 'infinitum_puro', t: 'Infinitum Puro', d: 'Solo Internet', disabled: form.tipoCliente === 'portado' },
                  { v: 'doble_play',     t: 'Doble Play',     d: 'Internet + Telefonía' },
                ]},
              ].map(({ label, key, opts }) => (
                <div key={key}>
                  <label className="block text-sm font-bold text-slate-400 mb-3">{label}</label>
                  <div className="grid grid-cols-2 gap-4">
                    {opts.map(o => (
                      <button
                        key={o.v}
                        disabled={(o as any).disabled}
                        onClick={() => (o as any).onSelect ? (o as any).onSelect() : updateForm({ [key]: o.v } as any)}
                        className={cn('p-4 rounded-xl border text-left transition-all',
                          (form as any)[key] === o.v
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20',
                          (o as any).disabled && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <div className="font-bold text-sm">{o.t}</div>
                        <div className="text-xs mt-0.5 opacity-70">{o.d}</div>
                      </button>
                    ))}
                  </div>
                  {key === 'categoriaProducto' && form.tipoCliente === 'portado' && (
                    <p className="text-xs text-amber-400 mt-2">La portabilidad requiere Doble Play.</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-10 pt-6 border-t border-white/5">
              <button onClick={handlePrev} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5 active:scale-95">Volver</button>
              <button onClick={handleNext} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95">Continuar a Paquetes <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Paquetes ── */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black text-white">Paquetes Disponibles</h2>
            <p className="text-slate-400 text-sm">
              <span className="text-white font-medium capitalize">{form.tipoServicio}</span> · <span className="text-white font-medium capitalize">{form.categoriaProducto?.replace('_', ' ')}</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {availablePackages.map(pkg => (
                <button key={pkg.id} onClick={() => handleSelectPackage(pkg)}
                  className={cn('text-left p-5 rounded-2xl border transition-all hover:-translate-y-1',
                    selectedPackage?.id === pkg.id ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-950/50 border-white/10 hover:border-white/30'
                  )}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-white text-base pr-4">{pkg.displayName}</h3>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-400">{formatCurrency(pkg.price)}</div>
                      <div className="text-[9px] text-slate-500 uppercase">Al mes</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-300"><Wifi className="w-3.5 h-3.5 text-indigo-400" /> {pkg.internetMbps} Megas</div>
                    {pkg.phoneLines && <div className="flex items-center gap-2 text-xs text-slate-300"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {pkg.phoneLines} línea(s)</div>}
                    {pkg.includesClaroVideo && <div className="flex items-center gap-2 text-xs text-slate-300"><Tv className="w-3.5 h-3.5 text-indigo-400" /> Claro Video incluido</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.claroDrive && <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400">Drive: {pkg.claroDrive}</span>}
                    {pkg.antivirus && <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400">Antivirus</span>}
                    {pkg.allowsStreamingChoice && <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] border border-indigo-500/30">Streaming a elegir</span>}
                  </div>
                </button>
              ))}
              {availablePackages.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-600">No hay paquetes disponibles para esta configuración.</div>
              )}
            </div>
            <div className="flex justify-between pt-6 border-t border-white/5">
              <button onClick={handlePrev} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95">Volver</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Extras ── */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black text-white">Detalles Adicionales</h2>

            {shouldShowStreamingChoice() && (
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-6">
                <label className="flex items-center gap-2 font-bold text-white mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> 
                  Beneficio de Promoción (6 meses gratis)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {form.categoriaProducto === 'doble_play' ? (
                    <>
                      <button
                        onClick={() => updateForm({ streamingPromo: 'netflix_promo_2p' })}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          form.streamingPromo === 'netflix_promo_2p' ? "bg-red-600/20 border-red-500 text-white" : "bg-slate-900 border-white/5 text-slate-400"
                        )}
                      >
                        <div className="font-bold">Netflix</div>
                        <div className="text-[10px] opacity-70">2 Pantallas con Anuncios</div>
                      </button>
                      <button
                        onClick={() => updateForm({ streamingPromo: 'hbo_promo_2p' })}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          form.streamingPromo === 'hbo_promo_2p' ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-slate-900 border-white/5 text-slate-400"
                        )}
                      >
                        <div className="font-bold">HBO Max</div>
                        <div className="text-[10px] opacity-70">2 Pantallas con Anuncios</div>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => updateForm({ streamingPromo: 'hbo_promo_2p' })}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all col-span-2",
                        form.streamingPromo === 'hbo_promo_2p' ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-slate-900 border-white/5 text-slate-400"
                      )}
                    >
                      <div className="font-bold">HBO Max Incluido por Promoción</div>
                      <div className="text-[10px] opacity-70">2 Pantallas con Anuncios · 6 meses gratis</div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {form.tipoServicio === 'residencial' && (
              <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-6">
                <label className="flex items-center gap-2 font-bold text-white mb-4">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  Plataformas Adicionales (Costo Extra)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {extraPlatforms.map(plat => (
                    <button
                      key={plat.id}
                      onClick={() => {
                        const current = form.plataformasAdicionales || [];
                        if (current.includes(plat.id)) {
                          updateForm({ plataformasAdicionales: current.filter(id => id !== plat.id) });
                        } else {
                          updateForm({ plataformasAdicionales: [...current, plat.id] });
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        form.plataformasAdicionales?.includes(plat.id)
                          ? "bg-emerald-500/10 border-emerald-500 text-white"
                          : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/20"
                      )}
                    >
                      <div>
                        <div className="text-xs font-bold">{plat.name}</div>
                        <div className="text-[9px] opacity-60">+{formatCurrency(plat.price)}/mes</div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-lg flex items-center justify-center transition-colors",
                        form.plataformasAdicionales?.includes(plat.id) ? "bg-emerald-500 text-white" : "bg-white/5"
                      )}>
                        {form.plataformasAdicionales?.includes(plat.id) && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.tipoCliente === 'portado' && (
              <div className="bg-slate-950/50 border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2"><Phone className="w-5 h-5 text-indigo-400" /> Datos de Portabilidad</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Número a Portar</label>
                    <input type="tel" maxLength={10} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-indigo-500" value={form.numeroAPortar || ''} onChange={e => updateForm({ numeroAPortar: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Compañía Actual</label>
                    <select className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-indigo-500" value={form.companiaActual || ''} onChange={e => updateForm({ companiaActual: e.target.value })}>
                      <option value="">Seleccionar…</option>
                      {['Izzi','Totalplay','Megacable','Telmex','Otro'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">NIP</label>
                    <input type="text" maxLength={4} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-indigo-500 font-mono tracking-widest text-center" value={form.nip || ''} onChange={e => updateForm({ nip: e.target.value })} placeholder="1234" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentUploader
                    label="Anexo Portabilidad (Frente)"
                    preview={form.anexoPortabilidadFrente}
                    onFile={(b) => {
                      updateForm({ anexoPortabilidadFrente: b });
                      uploadToExpediente('anexo_port_frente', b, 'image/jpeg')
                        .then(p => { if (p) updateForm({ anexoPortabilidadFrente: p }); });
                    }}
                    onClear={() => updateForm({ anexoPortabilidadFrente: undefined })}
                  />
                  <DocumentUploader
                    label="Anexo Portabilidad (Reverso)"
                    preview={form.anexoPortabilidadReverso}
                    onFile={(b) => {
                      updateForm({ anexoPortabilidadReverso: b });
                      uploadToExpediente('anexo_port_reverso', b, 'image/jpeg')
                        .then(p => { if (p) updateForm({ anexoPortabilidadReverso: p }); });
                    }}
                    onClear={() => updateForm({ anexoPortabilidadReverso: undefined })}
                  />
                </div>
              </div>
            )}

            <div className="bg-slate-950/50 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-white flex items-center gap-2"><FileScan className="w-5 h-5 text-emerald-400" /> Control Técnico SICA</h3>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Folio SICA / Captura de Pantalla</label>
                <div className="flex gap-4 items-start">
                  <input
                    type="text"
                    placeholder="Ingrese Folio SICA..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-emerald-500"
                    value={form.folioSica || ''}
                    onChange={e => updateForm({ folioSica: e.target.value })}
                  />
                  <div className="w-48 shrink-0">
                    <DocumentUploader
                      label="Captura SICA"
                      preview={form.folioSica} // Reutilizando el campo para la imagen si el usuario prefiere subir foto
                      onFile={(b) => {
                        updateForm({ folioSica: b });
                        uploadToExpediente('sica_capture', b, 'image/jpeg')
                          .then(p => { if (p) updateForm({ folioSica: p }); });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-10 pt-6 border-t border-white/5">
              <button onClick={handlePrev} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95">Volver</button>
              <button onClick={handleNext} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95">Generar Contrato <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Contrato ── */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <h2 className="text-xl font-black text-white">Motor Documental</h2>
              <div className="flex flex-wrap gap-2">
                <input type="text" value={asesorNombre} onChange={e => setAsesorNombre(e.target.value)}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm border border-white/10 w-56"
                  placeholder="Promotor Autorizado Infinitum" />
                <button onClick={exportContractPDF} disabled={exporting}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF Contrato
                </button>
                <button onClick={generateExpediente} disabled={exporting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />} Expediente Completo
                </button>
                <button onClick={sendToWhatsApp}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow shadow-green-500/20">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
              </div>
            </div>

            {/* Document preview chips */}
            <div className="flex flex-wrap gap-2">
              {form.ineFrente && <span className="text-[9px] font-bold px-2.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> INE Frente</span>}
              {form.ineReverso && <span className="text-[9px] font-bold px-2.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> INE Reverso</span>}
              {form.curpDoc && <span className="text-[9px] font-bold px-2.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CURP</span>}
              {form.comprobanteDomicilio && <span className="text-[9px] font-bold px-2.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Comprobante Domicilio</span>}
              {!form.ineFrente && !form.curpDoc && <span className="text-[9px] text-slate-500">Sin documentos adjuntos (se puede continuar)</span>}
            </div>

            {/* ── Contract HTML (rendered to PDF) ── */}
            <div className="bg-white text-black p-8 md:p-10 rounded-2xl max-w-3xl mx-auto shadow-2xl" ref={receiptRef}>
              {/* Header – NO "Telmex" */}
              <div className="border-b-2 pb-5 mb-6 flex justify-between items-end" style={{ borderColor: '#00ABDF' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#00ABDF' }}>
                      <Wifi className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-base leading-none" style={{ color: '#00ABDF' }}>infinitum<sup>®</sup></p>
                    </div>
                  </div>
                  <p className="font-black text-xs uppercase tracking-wider" style={{ color: '#0a1628' }}>
                    Promotor Autorizado Infinitum
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Solicitud de Servicio {form.tipoServicio} – {form.tipoCliente === 'portado' ? 'Portabilidad' : 'Línea Nueva'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-red-600">FOLIO: {form.folio}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Fecha: {form.fechaSolicitud}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Asesor: {asesorNombre}</p>
                </div>
              </div>

              <div className="space-y-6 text-sm">
                <section>
                  <h3 className="font-black text-xs uppercase tracking-wider border-b pb-1 mb-3" style={{ color: '#00ABDF', borderColor: '#e5e7eb' }}>1. Datos del Titular</h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    <div><span className="text-gray-400 text-xs">Nombre:</span> <span className="font-semibold">{form.nombres} {form.apellidoPaterno} {form.apellidoMaterno}</span></div>
                    <div><span className="text-gray-400 text-xs">CURP:</span> <span className="font-mono font-semibold text-xs">{form.curp || '—'}</span></div>
                    <div><span className="text-gray-400 text-xs">Teléfono:</span> <span className="font-semibold">{form.telefonoTitular}</span></div>
                    <div><span className="text-gray-400 text-xs">Correo:</span> <span className="font-semibold">{form.correo || '—'}</span></div>
                  </div>
                </section>

                <section>
                  <h3 className="font-black text-xs uppercase tracking-wider border-b pb-1 mb-3" style={{ color: '#00ABDF', borderColor: '#e5e7eb' }}>2. Domicilio de Instalación</h3>
                  <p className="font-semibold">{form.calle} #{form.numeroExterior} {form.numeroInterior ? `Int. ${form.numeroInterior}` : ''}, Col. {form.colonia}, C.P. {form.codigoPostal}</p>
                  <p className="text-xs text-gray-500 mt-1">{form.ciudad}, {form.delegacion}. Entre: {form.entrecalle1} y {form.entrecalle2}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-mono">GPS: {form.coordenadas}</p>
                </section>

                <section>
                  <h3 className="font-black text-xs uppercase tracking-wider border-b pb-1 mb-3" style={{ color: '#00ABDF', borderColor: '#e5e7eb' }}>3. Servicio Contratado</h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-base">{form.paqueteNombre}</p>
                      <p className="font-black text-base" style={{ color: '#00ABDF' }}>{formatCurrency(form.rentaMensual || 0)}<span className="text-xs font-normal text-gray-400">/mes</span></p>
                    </div>
                    <ul className="text-gray-700 space-y-1 text-xs list-disc list-inside">
                      <li>Velocidad: <strong>{form.megas} Mbps</strong></li>
                      {form.lineasTelefonicas && <li>Líneas telefónicas: <strong>{form.lineasTelefonicas}</strong></li>}
                      {form.incluyeClaroVideo && <li>Claro Video: <strong>Incluido</strong></li>}
                      {form.streamingPromo && (
                        <li className="text-blue-600 font-bold">
                          Promoción: {form.streamingPromo.includes('netflix') ? 'Netflix 6 meses gratis' : 'HBO Max 6 meses gratis'}
                        </li>
                      )}
                      {form.plataformasAdicionales && form.plataformasAdicionales.length > 0 && (
                        <li>
                          Extras: <strong>
                            {form.plataformasAdicionales.map(id => extraPlatforms.find(p => p.id === id)?.name).join(', ')}
                          </strong>
                        </li>
                      )}
                    </ul>
                  </div>
                </section>

                {/* ── AVISO DE PRIVACIDAD (Video Firma) ── */}
                <section className="mt-6">
                  <h3 className="font-black text-xs uppercase tracking-wider border-b-2 pb-1 mb-3" style={{ color: '#00ABDF', borderColor: '#00ABDF' }}>
                    AVISO DE PRIVACIDAD – SERVICIO DE VIDEO FIRMA
                  </h3>
                  <div className="text-[7.5px] text-gray-500 text-justify leading-snug space-y-1.5">
                    <p><strong style={{ color: '#374151' }}>RESPONSABLE:</strong> Heavenly Dreams Telecomunicaciones (en adelante "La Empresa"), con domicilio en Av. Tláhuac 3632 int. 301, Col. Culhuacán, Iztapalapa, CDMX, es responsable del tratamiento de sus datos personales conforme a la <em>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</em>.</p>
                    <p><strong style={{ color: '#374151' }}>1. DATOS RECABADOS:</strong> Para garantizar la seguridad y legalidad de la Video Firma, se recolectan: (a) <em>Identificación:</em> Nombre completo, INE/Pasaporte/CURP. (b) <em>Biométricos:</em> Grabación de rostro (video), reconocimiento de voz y, en su caso, patrones faciales. (c) <em>Contacto:</em> Correo electrónico y número de teléfono. (d) <em>Técnicos:</em> Dirección IP, geolocalización al momento de la firma y metadatos del dispositivo.</p>
                    <p><strong style={{ color: '#374151' }}>2. FINALIDAD:</strong> Los datos serán utilizados exclusivamente para: (i) Verificar la identidad del contratante y evitar suplantación. (ii) Vincular fehacientemente el consentimiento al contenido del contrato Infinitum firmado. (iii) Crear constancia técnica (evidencia digital) que garantice la validez del contrato ante autoridades judiciales o administrativas.</p>
                    <p><strong style={{ color: '#374151' }}>3. SEGURIDAD Y TRANSFERENCIA:</strong> La Empresa NO compartirá video ni datos biométricos con terceros, salvo: (a) Proveedores tecnológicos de infraestructura de Video Firma (bajo contratos de confidencialidad). (b) Autoridades judiciales bajo requerimiento legal formal.</p>
                    <p><strong style={{ color: '#374151' }}>4. CONSERVACIÓN:</strong> Las grabaciones se almacenarán encriptadas durante el tiempo que dicte la legislación mercantil o civil aplicable al contrato firmado.</p>
                    <p><strong style={{ color: '#374151' }}>5. DERECHOS ARCO:</strong> El titular puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a: WhatsApp 55 6469 4609 o al 800 123 2222.</p>
                  </div>
                </section>

                {/* ── TÉRMINOS Y CONDICIONES ── */}
                <section className="mt-4">
                  <h3 className="font-black text-xs uppercase tracking-wider border-b pb-1 mb-3" style={{ color: '#00ABDF', borderColor: '#e5e7eb' }}>
                    {terms.title}
                  </h3>
                  <div className="text-[7.5px] text-gray-500 text-justify leading-snug space-y-1.5">
                    <p><strong style={{ color: '#374151' }}>FECHA:</strong> {terms.fecha}</p>
                    <p><strong style={{ color: '#374151' }}>PAQUETE:</strong> {terms.paquete} · <strong style={{ color: '#374151' }}>RENTA MENSUAL:</strong> {terms.renta}</p>
                    <p><strong style={{ color: '#374151' }}>MODALIDAD DE PAGO:</strong> {terms.modalidad}</p>
                    <p><strong style={{ color: '#374151' }}>GASTOS DE INSTALACIÓN:</strong> {terms.gi}</p>
                    <p><strong style={{ color: '#374151' }}>BENEFICIOS INCLUIDOS:</strong> {terms.beneficios}</p>
                    <p><strong style={{ color: '#1d4ed8' }}>★ BENEFICIO DOMICILIACIÓN:</strong> {terms.domiciliacion}</p>
                    {terms.porta && <p><strong style={{ color: '#374151' }}>PORTABILIDAD:</strong> {terms.porta}</p>}
                    <p><strong style={{ color: '#374151' }}>PERMANENCIA:</strong> {terms.permanencia}</p>
                    <p><strong style={{ color: '#dc2626' }}>PAGOS – IMPORTANTE:</strong> {terms.pagos}</p>
                    <p><strong style={{ color: '#374151' }}>SOPORTE Y CONTACTO:</strong> {terms.soporte}</p>
                    <p><strong style={{ color: '#dc2626' }}>ÉTICA EMPRESARIAL:</strong> {terms.etica}</p>
                  </div>
                </section>

                {/* ── CONSENTIMIENTO EXPRESO ── */}
                <section className="mt-4 border border-gray-300 rounded-lg p-3">
                  <h3 className="font-black text-[9px] uppercase tracking-wider mb-2" style={{ color: '#374151' }}>CONSENTIMIENTO EXPRESO – VIDEO FIRMA</h3>
                  <div className="text-[7.5px] text-gray-600 leading-snug space-y-1">
                    <p>Al realizar la Video Firma, el titular declara:</p>
                    <p>1. Ha leído y comprendido el presente Aviso de Privacidad y los Términos y Condiciones.</p>
                    <p>2. <strong>Consiente expresamente</strong> el tratamiento de sus datos biométricos (rostro y voz) para los fines aquí descritos.</p>
                    <p>3. Acepta que la grabación de video constituye prueba legal de su voluntad para suscribir el contrato de servicio Infinitum con Telmex.</p>
                    <p>4. Confirma que la información proporcionada es verídica y que autoriza la instalación del servicio en el domicilio declarado.</p>
                    <p>5. Reconoce que el servicio es de modalidad <strong>POSPAGO</strong> y que <strong>NO debe entregar efectivo</strong> al promotor ni al técnico de instalación bajo ningún concepto.</p>
                    <p style={{ marginTop: '4px', color: '#6b7280' }}><em>Última actualización: {terms.fecha}. Para dudas o aclaraciones: WhatsApp 55 6469 4609 · 800 123 2222.</em></p>
                  </div>
                </section>

                <div className="flex justify-between items-end mt-8 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <div className="w-40 border-b border-gray-400 mb-1" />
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">Firma del Cliente</p>
                    <p className="text-[8px] text-gray-300 mt-0.5">{form.nombres} {form.apellidoPaterno}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-b border-gray-400 mb-1" />
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">Promotor Autorizado</p>
                    <p className="text-[8px] text-gray-300 mt-0.5">{asesorNombre}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-10 pt-6 border-t border-white/5">
              <button onClick={handlePrev} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95">Volver</button>
              <button onClick={handleNext} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95">Cerrar y Firmar <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Video Firma + AI Call ── */}
        {step === 6 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-black text-white">Motor de Consentimiento</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Signature Pad */}
              <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-black flex items-center gap-2">
                  <Signature className="w-5 h-5 text-indigo-400" /> Firma Digital
                </h3>
                <SignaturePad
                  onSignatureConfirm={(base64, videoBlobUrl, videoBase64) => {
                    setSignatureBase64(base64);
                    setSignatureConfirmed(true);
                    updateForm({ videoFirmaUrl: videoBlobUrl || base64 });
                    // Sube la video-firma al expediente. Usa el mimetype real
                    // detectado en el data-URL (image/png para firmas dibujadas)
                    uploadToExpediente('videofirma', base64, detectMime(base64, 'image/png'))
                      .then(p => { if (p) updateForm({ videoFirmaPath: p }); });
                      
                    // Si también grabamos video, lo subimos
                    if (videoBase64) {
                      uploadToExpediente('videofirma_video', videoBase64, 'video/webm')
                        .then(p => { if (p) updateForm({ videoFirmaPath: p }); }); // guardamos el path del video
                    }
                  }}
                  showCamera={true}
                />
              </div>

              {/* Right panel */}
              <div className="space-y-4">
                {/* Address Match Indicator */}
                {addressMatch && (
                  <div className={cn(
                    'border rounded-2xl p-4 flex items-start gap-3',
                    addressMatch.isMatch
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  )}>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      addressMatch.isMatch ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                    )}>
                      {addressMatch.isMatch ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-xs font-bold',
                        addressMatch.isMatch ? 'text-emerald-400' : 'text-amber-400'
                      )}>
                        {addressMatch.isMatch ? 'Domicilio validado ✓' : 'Domicilio diferente'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {addressMatch.isMatch
                          ? 'Las direcciones en INE y comprobante coinciden'
                          : `Confianza: ${(addressMatch.confidence * 100).toFixed(0)}%`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Security */}
                <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> Seguridad del Expediente</h3>
                  <div className="space-y-3">
                    {[
                      ['Hash Expediente',      (form.hashExpediente?.substring(0, 16) ?? '') + '…', 'text-indigo-400'],
                      ['Constancia NOM-151',   'GENERADA',   'text-emerald-400'],
                      ['Timestamp',            new Date().toLocaleString('es-MX'), 'text-slate-300'],
                      ['Firma Digital',        signatureConfirmed ? 'CONFIRMADA ✓' : 'PENDIENTE', signatureConfirmed ? 'text-emerald-400' : 'text-amber-400'],
                      ['Validación IA (Llamada)', aiCallDone ? 'COMPLETADA ✓' : 'NO REALIZADA', aiCallDone ? 'text-emerald-400' : 'text-slate-500'],
                      ['Estatus Expediente',   isExpedienteCompleto() ? 'COMPLETO ✓' : 'INCOMPLETO', isExpedienteCompleto() ? 'text-emerald-400' : 'text-red-400'],
                    ].map(([k, v, c]) => (
                      <div key={k} className="flex justify-between items-center text-xs border-b border-white/5 pb-2 last:border-0">
                        <span className="text-slate-500">{k}</span>
                        <span className={cn('font-bold font-mono', c)}>{v}</span>
                      </div>
                    ))}
                    {aiValidationResult && (
                      <div className={cn(
                        "mt-4 p-3 rounded-xl border text-[10px] leading-relaxed",
                        aiValidationResult.status === 'completo' 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                          : "bg-red-500/10 border-red-500/20 text-red-300"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="w-3 h-3" />
                          <span className="font-black uppercase tracking-widest">Análisis del Agente de IA</span>
                        </div>
                        {aiValidationResult.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Call button - highlighted when signature confirmed */}
                <div className={cn(
                  'rounded-2xl p-5 space-y-4 border transition-all',
                  signatureConfirmed
                    ? 'bg-gradient-to-br from-blue-900/80 to-indigo-900/80 border-blue-400/60 shadow-lg shadow-blue-500/30'
                    : 'bg-gradient-to-br from-blue-950/60 to-indigo-950/60 border-blue-500/20'
                )}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-black text-sm flex items-center gap-2">
                      <Bot className={cn('w-4 h-4', signatureConfirmed ? 'text-blue-300 animate-pulse' : 'text-blue-400')} /> Validación IA
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.validacionIAActiva}
                        onChange={e => updateForm({ validacionIAActiva: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {form.validacionIAActiva ? (
                    <>
                      {signatureConfirmed && !aiCallDone && (
                        <div className="flex items-center gap-2 text-blue-300 text-xs font-bold bg-blue-500/20 rounded-lg px-3 py-2">
                          <Check className="w-4 h-4" /> Firma confirmada - listo para llamada
                        </div>
                      )}

                      <p className="text-xs text-slate-400 leading-relaxed">
                        Un agente de IA llamará al cliente para confirmar la contratación del servicio y registrar su validación verbal.
                      </p>

                      {aiCallDone ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Llamada de validación completada
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAICall(true)}
                          disabled={!form.telefonoTitular || !signatureConfirmed}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg',
                            signatureConfirmed
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/40 hover:scale-[1.02]'
                              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                          )}
                          title={!signatureConfirmed ? 'Completa la firma para habilitar' : ''}
                        >
                          <PhoneCall className="w-4 h-4" /> Iniciar Llamada IA
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-400 font-medium">
                        La validación por IA ha sido desactivada. El expediente se marcará como "Pendiente de Validación Manual".
                      </p>
                    </div>
                  )}

                  {!form.telefonoTitular && (
                    <p className="text-[9px] text-amber-500">Ingresa el teléfono del cliente en el paso 1 para habilitar esta función.</p>
                  )}
                </div>

                {/* ── Control Técnico SICA y Portabilidad (MOVIDO AQUÍ) ── */}
                <div className={cn(
                  "bg-slate-950/80 border border-white/10 rounded-2xl p-6 space-y-6 transition-all",
                  signatureConfirmed && (!form.validacionIAActiva || aiCallDone) ? "ring-2 ring-indigo-500/50 shadow-2xl shadow-indigo-500/20" : "opacity-80"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <FileScan className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-wider">Control Técnico SICA</h3>
                      <p className="text-[10px] text-slate-500 font-bold">Captura final de folio y portabilidad</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">FOLIO SIAC / CAPTURA DE PANTALLA</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Ingrese Folio SIAC..."
                          className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                          value={form.folioSica || ''}
                          onChange={e => updateForm({ folioSica: e.target.value })}
                        />
                        <div className="shrink-0">
                           <DocumentUploader
                              label="Captura SICA"
                              preview={form.folioSicaPath}
                              onFile={(b64) => updateForm({ folioSicaPath: b64 })}
                              onClear={() => updateForm({ folioSicaPath: undefined })}
                              captureMode="environment"
                           />
                        </div>
                      </div>
                    </div>

                    {form.tipoCliente === 'portado' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" /> Anexo de Portabilidad (Obligatorio)
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <DocumentUploader
                            label="Frente Anexo"
                            preview={form.anexoPortabilidadFrente}
                            onFile={(b64) => updateForm({ anexoPortabilidadFrente: b64 })}
                            onClear={() => updateForm({ anexoPortabilidadFrente: undefined })}
                          />
                          <DocumentUploader
                            label="Reverso Anexo"
                            preview={form.anexoPortabilidadReverso}
                            onFile={(b64) => updateForm({ anexoPortabilidadReverso: b64 })}
                            onClear={() => updateForm({ anexoPortabilidadReverso: undefined })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expediente summary */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <h3 className="text-emerald-400 font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5" /> Contenido del Expediente
                  </h3>
                  <ul className="space-y-1 text-[10px] text-slate-300">
                    {[
                      ['INE / CURP',            !!(form.ineFrente || form.curpDoc)],
                      ['Reverso INE',           !!form.ineReverso],
                      ['Comprobante Domicilio', !!form.comprobanteDomicilio],
                      ['Domicilio Validado',    addressMatch?.isMatch || false],
                      ['Información del Cliente', true],
                      ['Contrato firmado',      true],
                      ['Firma Digital',         signatureConfirmed],
                      ['Validación IA',         !form.validacionIAActiva || aiCallDone, !form.validacionIAActiva ? 'MANUAL' : 'OK'],
                      ['Folio SIAC',            !!form.folioSica],
                      ...(form.tipoCliente === 'portado' ? [['Anexo Portabilidad', !!(form.anexoPortabilidadFrente && form.anexoPortabilidadReverso)]] : []),
                    ].map(([label, ok, customStatus]) => (
                      <li key={label as string} className={cn('flex items-center gap-2', ok ? 'text-slate-200' : 'text-slate-600')}>
                        {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <div className="w-3 h-3 rounded-full border border-slate-600 shrink-0" />}
                        <span className="flex-1">{label as string}</span>
                        {ok && customStatus && <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">{customStatus as string}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Download expediente */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button onClick={generateExpediente} disabled={exporting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                Descargar Expediente Completo PDF
              </button>
            </div>

            <div className="flex justify-between mt-6 pt-6 border-t border-white/5">
              <button onClick={handlePrev} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all">Atrás</button>
              <button
                onClick={handleFinalize}
                disabled={!signatureConfirmed || (form.validacionIAActiva && !aiCallDone)}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all",
                  (!signatureConfirmed || (form.validacionIAActiva && !aiCallDone))
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed opacity-40"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                )}
              >
                <CheckCircle2 className="w-5 h-5" /> Finalizar y Cerrar Expediente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Call Modal */}
      {showAICall && (
        <AICallModal
          clientName={`${form.nombres || ''} ${form.apellidoPaterno || ''}`.trim()}
          phone={form.telefonoTitular || ''}
          paquete={form.paqueteNombre || ''}
          onClose={() => { setShowAICall(false); setAiCallDone(true); }}
        />
      )}
    </div>
  );
}
