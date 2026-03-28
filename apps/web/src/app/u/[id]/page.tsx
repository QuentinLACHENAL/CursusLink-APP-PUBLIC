'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Award, Users } from 'lucide-react';
import { api } from '../../../services/api';

export default function PublicProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (id) {
        api.get<any>(`users/public-profile/${id}`)
            .then(setProfile)
            .catch(console.error);
    }
  }, [id]);

  if (!profile) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <button onClick={() => router.back()} className="mb-8 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center gap-2">
        <ArrowLeft size={20} /> Retour
      </button>

      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-blue-900 to-purple-900 relative">
            <div className="absolute -bottom-16 left-8">
                <img 
                    src={profile.avatarUrl} 
                    alt={profile.username} 
                    className="w-32 h-32 rounded-full border-4 border-slate-900 shadow-xl bg-slate-800"
                />
            </div>
        </div>

        {/* Info */}
        <div className="pt-20 px-8 pb-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        {profile.firstName} {profile.lastName}
                        <span className="text-sm bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">@{profile.username}</span>
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <Users size={16}/> {profile.coalition || 'Sans Coalition'} • {profile.school || 'École inconnue'}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
                        Level {Math.floor(profile.xp / 1000) + 1}
                    </div>
                    <p className="text-slate-500 font-mono">{profile.xp} XP</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Shield size={16}/> Rôle</div>
                    <div className="text-xl font-bold text-white">{profile.role}</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Award size={16}/> Titre</div>
                    <div className="text-xl font-bold text-white">{profile.title || 'Novice'}</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Users size={16}/> Coalition</div>
                    <div className="text-xl font-bold text-white">{profile.coalition || '-'}</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}