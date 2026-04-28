import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; label?: string }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback)  return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-300 mb-1">
            {this.props.label || 'Este módulo tuvo un problema al cargar'}
          </p>
          <p className="text-xs text-zinc-600 max-w-xs">
            {this.state.error?.message || 'Error desconocido'}
          </p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />Reintentar
        </button>
      </div>
    );
  }
}
