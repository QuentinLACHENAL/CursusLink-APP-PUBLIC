'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Shield, Users, Medal } from 'lucide-react';
import { api } from '../../services/api';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [coalitions, setCoalitions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'coalitions'>('students');

  useEffect(() => {
    // Charger les classements
    const fetchLeaderboards = async () => {
      try {
        const schoolFilter = user?.school ? `?school=${user.school}` : '';
        
        const resStudents = await api.get<any[]>(`users/leaderboard${schoolFilter}`);
        setStudents(resStudents);

        const resCoa = await api.get<any[]>(`coalitions${schoolFilter}`);
        setCoalitions(resCoa);
      } catch (err) {
        console.error(err);
      }
    };

    if (user) fetchLeaderboards();
  }, [user]);

  const getRankColor = (index: number) => {
    switch(index) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-slate-300';
      case 2: return 'text-amber-600';
      default: return 'text-slate-500';
    }
  };

  const getCoalitionGradient = (name: string) => {
    switch(name) {
      case 'The Order': return 'from-yellow-600 to-amber-800';
      case 'Cyber-Syndicate': return 'from-cyan-600 to-blue-800';
      case 'Data-Mages': return 'from-purple-600 to-indigo-800';
      default: return 'from-slate-600 to-slate-500';
    }
  };

  const getCoalitionBorder = (name: string) => {
    switch(name) {
      case 'The Order': return 'border-yellow-500';
      case 'Cyber-Syndicate': return 'border-cyan-500';
      case 'Data-Mages': return 'border-purple-500';
      default: return 'border-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Trophy className="text-yellow-500" /> Classement {user?.school ? `(${user.school})` : ''}
        </h1>

        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'students' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            Étudiants
          </button>
          <button 
            onClick={() => setActiveTab('coalitions')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'coalitions' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            Coalitions
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {activeTab === 'students' && (
            <div className="divide-y divide-slate-800">
              {students.map((student, index) => (
                <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
                  <div className={`font-black text-xl w-8 text-center ${getRankColor(index)}`}>
                    {index + 1}
                  </div>
                  <img src={student.avatarUrl} alt={student.username} className="w-10 h-10 rounded-full bg-slate-800" />
                  <div className="flex-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      {student.firstName} {student.lastName}
                      {index < 3 && <Medal size={16} className={getRankColor(index)} />}
                    </div>
                    <div className="text-xs text-slate-500">@{student.username} • {student.coalition || 'Sans Coalition'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold text-blue-400">{student.xp} XP</div>
                    <div className="text-xs text-slate-600">Level {Math.floor(student.xp / 1000) + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'coalitions' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
              {coalitions.map((coa, index) => (
                <div key={coa.id} className={`relative bg-gradient-to-br ${getCoalitionGradient(coa.name)} p-6 rounded-2xl border-2 ${getCoalitionBorder(coa.name)} shadow-xl transform hover:scale-105 transition-all`}>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-700 font-black text-xl">
                    #{index + 1}
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">{coa.name}</h3>
                  <div className="text-4xl font-black text-white/90 mb-4">{coa.score} pts</div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Users size={16} /> {coa.memberCount || 0} membres
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
