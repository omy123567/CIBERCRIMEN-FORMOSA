import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, KeyRound, AlertCircle, Building2, Sparkles } from 'lucide-react';
import { SisPolUser, SisPolDelegacion } from '../../types/sgp';
import { sgpManager } from '../../db/dexieDb';

interface LoginViewProps {
  onLoginSuccess: (user: SisPolUser) => void;
  delegaciones: SisPolDelegacion[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, delegaciones }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Por favor complete su usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await sgpManager.authenticate(username, password);
      if (!user) {
        setError('Credenciales incorrectas. Verifique usuario y contraseña.');
        setIsSubmitting(false);
        return;
      }

      // Store in localStorage for persistent session
      localStorage.setItem('sispol_current_user', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err) {
      console.error('Error during authentication:', err);
      setError('Ocurrió un error al procesar el ingreso al sistema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (userDemo: string, passDemo: string) => {
    setUsername(userDemo);
    setPassword(passDemo);
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await sgpManager.authenticate(userDemo, passDemo);
      if (user) {
        localStorage.setItem('sispol_current_user', JSON.stringify(user));
        onLoginSuccess(user);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] p-4 text-slate-100">
      <div className="w-full max-w-md">
        {/* Card Box */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-blue-950/40 space-y-6">
          
          {/* Official Emblem & Branding */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 opacity-60 blur-xs group-hover:opacity-100 transition duration-300" />
              <img
                src="/assets/aistudio/DIc-nuevo_90a7fd82.png"
                alt="Escudo Oficial D.G.P.C. Ciberdelito"
                className="relative w-28 h-28 object-contain rounded-full bg-slate-950 p-1 shadow-lg border border-slate-700"
              />
            </div>

            <div>
              <span className="text-[11px] font-black tracking-widest text-blue-400 uppercase">
                POLICÍA DE LA PROVINCIA DE FORMOSA
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                SGP / SISPOL
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Dirección General Policía Científica • Ciberdelito
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Usuario del Sistema
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. superadmin o operador.lb"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema Seguro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Demo Badges for smooth testing */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block text-center">
              Acceso Rápido por Perfil (Demostración de Roles):
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin', 'admin123')}
                className="p-2 bg-slate-800/70 hover:bg-slate-800 text-left rounded-xl border border-slate-700/60 hover:border-blue-500/50 transition-colors"
              >
                <div className="font-bold text-amber-400">Superusuario</div>
                <div className="text-[10px] text-slate-400">superadmin / admin123</div>
                <div className="text-[9px] text-slate-500">Todas las delegaciones</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin.lb', 'policia2026')}
                className="p-2 bg-slate-800/70 hover:bg-slate-800 text-left rounded-xl border border-slate-700/60 hover:border-blue-500/50 transition-colors"
              >
                <div className="font-bold text-blue-400">Admin Laguna Bca.</div>
                <div className="text-[10px] text-slate-400">admin.lb / policia2026</div>
                <div className="text-[9px] text-slate-500">Del. Laguna Blanca</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('operador.lb', 'operador123')}
                className="p-2 bg-slate-800/70 hover:bg-slate-800 text-left rounded-xl border border-slate-700/60 hover:border-blue-500/50 transition-colors"
              >
                <div className="font-bold text-emerald-400">Operador LB</div>
                <div className="text-[10px] text-slate-400">operador.lb / operador123</div>
                <div className="text-[9px] text-slate-500">Sin permiso de borrado</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin.clorinda', 'policia2026')}
                className="p-2 bg-slate-800/70 hover:bg-slate-800 text-left rounded-xl border border-slate-700/60 hover:border-blue-500/50 transition-colors"
              >
                <div className="font-bold text-indigo-400">Admin Clorinda</div>
                <div className="text-[10px] text-slate-400">admin.clorinda / policia2026</div>
                <div className="text-[9px] text-slate-500">Del. Clorinda</div>
              </button>
            </div>
          </div>

          {/* Security footnote */}
          <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sistema Seguro con Base de Datos Cifrada Local (Offline-First)</span>
          </div>

        </div>
      </div>
    </div>
  );
};
