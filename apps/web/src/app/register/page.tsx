'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../services/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('auth/register', { email, password, firstName, lastName });
      alert('Compte créé ! Connectez-vous.');
      router.push('/login');
    } catch (err: any) {
      alert(err.message || 'Erreur inscription');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl shadow-xl w-96 border border-slate-700">
        <h1 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">Inscription</h1>
        
        <div className="flex gap-2 mb-4">
          <input
            className="w-1/2 p-3 bg-slate-900 rounded border border-slate-600 focus:border-green-500 outline-none transition-colors"
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            className="w-1/2 p-3 bg-slate-900 rounded border border-slate-600 focus:border-green-500 outline-none transition-colors"
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <input
          className="w-full p-3 mb-4 bg-slate-900 rounded border border-slate-600 focus:border-green-500 outline-none transition-colors"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full p-3 mb-6 bg-slate-900 rounded border border-slate-600 focus:border-green-500 outline-none transition-colors"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="w-full p-3 bg-green-600 hover:bg-green-500 rounded font-bold transition-all transform hover:scale-[1.02]">
          S'inscrire
        </button>
        <p className="mt-4 text-center text-sm text-slate-400">
          Déjà un compte ? <a href="/login" className="text-green-400 hover:underline">Se connecter</a>
        </p>
      </form>
    </div>
  );
}