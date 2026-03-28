'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { School, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../../services/api';

interface UsersTabProps {
  users: any[];
}

export default function UsersTab({ users }: UsersTabProps) {
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [localUsers, setLocalUsers] = useState<any[]>(users);
  const router = useRouter();

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const handleUpdatePoints = async (userId: string, delta: number) => {
    // Optimistic update
    setLocalUsers(prev => prev.map(u => {
        if (u.id === userId) {
            return { ...u, evaluationPoints: (u.evaluationPoints ?? 3) + delta };
        }
        return u;
    }));

    try {
      await api.updateEvaluationPoints(userId, delta);
      router.refresh();
    } catch (error) {
      console.error('Failed to update points', error);
      alert('Erreur lors de la mise à jour des points');
      // Revert optimistic update if needed, but router.refresh() usually handles sync.
      // Ideally we should revert here if API fails.
      setLocalUsers(prev => prev.map(u => {
        if (u.id === userId) {
            return { ...u, evaluationPoints: (u.evaluationPoints ?? 3) - delta };
        }
        return u;
      }));
    }
  };

  const groupedUsers = localUsers.reduce((acc: Record<string, any[]>, u) => {
    const school = u.school || 'Sans École';
    if (!acc[school]) acc[school] = [];
    acc[school].push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedUsers).map(([school, schoolUsers]) => {
        const userList = schoolUsers as any[];
        return (
          <div key={school} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div 
              className="p-4 bg-slate-900 flex justify-between cursor-pointer" 
              onClick={() => setExpandedSchool(expandedSchool === school ? null : school)}
            >
              <h3 className="font-bold text-white flex items-center gap-3">
                <School size={20} className="text-blue-500" /> 
                {school} 
                <span className="text-slate-500 text-sm">({userList.length})</span>
              </h3>
              {expandedSchool === school ? <ChevronDown /> : <ChevronRight />}
            </div>
            {expandedSchool === school && (
              <div className="p-4">
                {userList.map((u: any) => (
                  <div key={u.id} className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span>{u.firstName} {u.lastName}</span>
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-1 mr-4 bg-slate-800 px-2 py-1 rounded">
                        <span className="text-sm text-slate-300 font-mono">Pts: {u.evaluationPoints ?? 3}</span>
                        <div className="flex gap-1 ml-2">
                            <button 
                                onClick={() => handleUpdatePoints(u.id, 1)} 
                                className="w-5 h-5 flex items-center justify-center text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded"
                            >
                                +
                            </button>
                            <button 
                                onClick={() => handleUpdatePoints(u.id, -1)} 
                                className="w-5 h-5 flex items-center justify-center text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded"
                            >
                                -
                            </button>
                        </div>
                      </div>
                      <button className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded">Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
