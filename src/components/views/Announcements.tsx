import React, { useState, useEffect } from 'react';
import { Megaphone, Bell, Calendar, User, Plus, Trash2, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  priority: 'low' | 'medium' | 'high';
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<{
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
  }>({
    title: '',
    content: '',
    priority: 'medium'
  });

  useEffect(() => {
    // Simulated fetch for announcements
    setAnnouncements([
      {
        id: "1",
        title: "¡Bienvenido a HDreamsApp!",
        content: "Sistema actualizado. Recuerden revisar sus nuevas comisiones.",
        date: new Date().toISOString().split('T')[0],
        author: "Administración",
        priority: "high"
      }
    ]);
    setLoading(false);
  }, []);

  const handleAdd = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    
    try {
      const newAnn = {
        id: String(Date.now()),
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        date: new Date().toISOString().split('T')[0],
        author: 'Administración',
        priority: newAnnouncement.priority
      };
      
      setAnnouncements([newAnn, ...announcements]);
      setNewAnnouncement({ title: '', content: '', priority: 'medium' as const });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding announcement:", error);
      alert("Error al publicar el anuncio.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este anuncio?")) return;
    try {
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-400" />
            Anuncios y Comunicados
          </h1>
          <p className="text-slate-400 text-sm">Mantén a todo el equipo informado sobre las últimas novedades.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Nuevo Anuncio
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Crear Nuevo Anuncio</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Título</label>
              <input 
                type="text" 
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                placeholder="Ej. Cambio de horario"
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contenido</label>
              <textarea 
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                placeholder="Escribe el mensaje aquí..."
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prioridad</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewAnnouncement({...newAnnouncement, priority: p})}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all border",
                      newAnnouncement.priority === p 
                        ? "bg-blue-600 border-blue-500 text-white" 
                        : "bg-slate-800 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleAdd}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                Publicar Anuncio
              </button>
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div 
            key={announcement.id} 
            className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner",
                  announcement.priority === 'high' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                  announcement.priority === 'medium' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                  "bg-blue-500/10 border-blue-500/20 text-blue-400"
                )}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {announcement.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {announcement.date}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> {announcement.author}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(announcement.id)}
                className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {announcement.content}
            </p>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 bg-slate-900/20 border border-dashed border-white/10 rounded-2xl">
            <Info className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No hay anuncios publicados en este momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
