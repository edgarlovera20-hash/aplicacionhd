import React, { useState } from 'react';
import { Trash2, Plus, CheckCircle, Circle } from 'lucide-react';

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  tasks: Task[];
  onAdd: (text: string) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}

export default function TodoList({ tasks, onAdd, onDelete, onToggle }: TodoListProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-6">Mis Tareas</h2>
      
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Nueva tarea..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
        <button
          onClick={handleAdd}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <ul className="space-y-3">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <button onClick={() => onToggle(task.id)} className="text-slate-400 hover:text-blue-400">
                {task.completed ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5" />}
              </button>
              <span className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {task.text}
              </span>
            </div>
            <button onClick={() => onDelete(task.id)} className="text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
