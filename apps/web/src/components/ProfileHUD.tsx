'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useGraphTheme } from '../context/GraphThemeContext';
import { Shield, Award, MapPin, Settings, Trophy, CheckSquare, Users, Menu, X, LogOut, Star, Scale, Zap } from 'lucide-react';
import { api } from '../services/api';

export default function ProfileHUD() {
  const { user: authUser, logout } = useAuth();
  const { highPerformanceMode, setHighPerformanceMode } = useGraphTheme();
  const router = useRouter();
  const [userProfile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authUser) {
        api.get<any>(`users/profile/${authUser.id}`)
            .then((data) => {
              setProfile(data);
              setError(null);
            })
            .catch((err) => {
              console.error(err);
              setError("Impossible de charger le profil");
            });
    }
  }, [authUser]);

  if (error) {
    return (
        <div className="absolute top-4 left-4 z-50 pointer-events-auto">
            <div className="bg-red-900/80 backdrop-blur-md border border-red-700/50 p-4 rounded-xl shadow-2xl flex items-center gap-4">
                <div className="text-red-200 text-sm">{error}</div>
                <button 
                    onClick={() => logout()} 
                    className="p-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>
    );
  }

  if (!userProfile) return null;

  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-none select-none animate-in fade-in duration-500">
      {/* Carte Identité Holographique */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl flex items-center gap-4 w-80 relative group">
        
        {/* Perf Mode Toggle (Visible on hover or if active) */}
        <button
            onClick={() => setHighPerformanceMode(!highPerformanceMode)}
            className={`absolute top-2 right-2 pointer-events-auto p-1.5 rounded-full border transition-all ${
                highPerformanceMode 
                ? 'bg-green-900/50 border-green-500 text-green-400 opacity-100' 
                : 'bg-slate-800/50 border-slate-600 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-700 hover:text-slate-300'
            }`}
            title="Mode Performance (Réduit les effets graphiques)"
        >
            <Zap size={12} fill={highPerformanceMode ? "currentColor" : "none"} />
        </button>

        {/* Avatar avec cercle de niveau */}
        <div className="relative shrink-0 pointer-events-auto cursor-pointer" onClick={() => setShowMenu(!showMenu)}>
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-purple-500 hover:scale-105 transition-transform">
                <img 
                    src={userProfile.avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full bg-slate-800 object-cover"
                />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                <span className="text-yellow-400">★</span> Lvl {Math.floor(userProfile.xp / 1000) + 1}
            </div>
        </div>

        {/* Info Text */}
        <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-sm truncate">{userProfile.firstName} {userProfile.lastName}</h2>
            <p className="text-slate-400 text-xs truncate">@{userProfile.username}</p>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                    <Shield size={10} /> {userProfile.coalition || 'Sans Coalition'}
                </span>
                <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                    <Award size={10} /> {userProfile.xp} XP
                </span>
                <span className="text-[10px] bg-yellow-900/40 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1" title="Points d'évaluation">
                    <Scale size={10} /> {userProfile.evaluationPoints ?? 3} Pts
                </span>
            </div>
        </div>
        
        <button 
            onClick={() => setShowMenu(!showMenu)}
            className="pointer-events-auto p-2 hover:bg-slate-800 rounded-lg text-slate-400"
        >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Barre de Progression XP */}
      <div className="mt-2 w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-2 rounded-lg shadow-xl">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Progression Niveau</span>
            <span>{userProfile.xp % 1000} / 1000 XP</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                style={{ width: `${(userProfile.xp % 1000) / 10}%` }}
            />
        </div>
      </div>

      {/* Menu Navigation */}
      {showMenu && (
        <div className="mt-2 w-80 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-2 rounded-xl shadow-xl pointer-events-auto grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
            <button onClick={() => router.push('/leaderboard')} className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-yellow-500/50 transition-all group">
                <Trophy size={20} className="text-yellow-500 mb-1 group-hover:scale-110 transition-transform"/>
                <span className="text-xs text-slate-300">Classement</span>
            </button>
            <button onClick={() => router.push('/corrections')} className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-green-500/50 transition-all group">
                <CheckSquare size={20} className="text-green-500 mb-1 group-hover:scale-110 transition-transform"/>
                <span className="text-xs text-slate-300">Corrections</span>
            </button>
            <button onClick={() => router.push('/evaluations')} className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-pink-500/50 transition-all group">
                <Star size={20} className="text-pink-500 mb-1 group-hover:scale-110 transition-transform"/>
                <span className="text-xs text-slate-300">Évaluations</span>
            </button>
            <button onClick={() => router.push('/community')} className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 transition-all group">
                <Users size={20} className="text-blue-500 mb-1 group-hover:scale-110 transition-transform"/>
                <span className="text-xs text-slate-300">Communauté</span>
            </button>
            <button onClick={() => router.push('/settings')} className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500/50 transition-all group">
                <Settings size={20} className="text-slate-400 mb-1 group-hover:scale-110 transition-transform"/>
                <span className="text-xs text-slate-300">Paramètres</span>
            </button>
            
            {(authUser.role === 'ADMIN' || authUser.role === 'PROF') && (
                <button onClick={() => router.push('/admin')} className="flex flex-col items-center justify-center p-3 rounded-lg bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 hover:border-red-500/50 transition-all group">
                    <Shield size={20} className="text-red-400 group-hover:scale-110 transition-transform"/>
                    <span className="text-xs font-bold text-red-300">Admin</span>
                </button>
            )}
            
            <button onClick={() => logout()} className="col-span-3 flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-800 hover:bg-red-900/30 border border-slate-700 hover:border-red-500/50 transition-all group mt-1">
                <LogOut size={16} className="text-slate-400 group-hover:text-red-400 group-hover:scale-110 transition-transform"/>
                <span className="text-xs font-bold text-slate-300 group-hover:text-red-300">Se déconnecter</span>
            </button>
        </div>
      )}
    </div>
  );
}
