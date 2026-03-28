'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '../../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<any>('auth/login', { email, password });
      login(res.access_token, res.user);
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl shadow-xl w-96 border border-slate-700">
        <h1 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Connexion</h1>
        <input
          className="w-full p-3 mb-4 bg-slate-900 rounded border border-slate-600 focus:border-blue-500 outline-none transition-colors"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full p-3 mb-6 bg-slate-900 rounded border border-slate-600 focus:border-blue-500 outline-none transition-colors"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full p-3 bg-blue-600 hover:bg-blue-500 rounded font-bold transition-all transform hover:scale-[1.02]">
          Se connecter
        </button>
        <p className="mt-4 text-center text-sm text-slate-400">
          Pas de compte ? <a href="/register" className="text-blue-400 hover:underline">S'inscrire</a>
        </p>
      </form>
    </div>
  );
}