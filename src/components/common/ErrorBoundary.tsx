import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-white rounded-2xl border border-rose-200 shadow-md text-slate-800 space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="p-2.5 bg-rose-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {this.props.fallbackTitle || 'Terjadi Kendala Tampilan Sementara'}
              </h3>
              <p className="text-xs text-slate-500">
                Sistem telah mengamankan data dan mencegah layar putih (blank screen).
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto">
            {this.state.error?.message || 'Unknown error occurred'}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Coba Pulihkan Tampilan</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
