'use client';

import SkillGraph from "@/components/SkillGraph";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <div className="mb-8">
          <Image 
            src="/CursusLink500transp.png" 
            alt="CursusLink Logo" 
            width={500} 
            height={500} 
            priority
          />
        </div>
        <p className="text-xl text-slate-400 mb-8 max-w-lg text-center">
          Un univers de connections et de compétences.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all"
          >
            Se connecter
          </button>
          <button 
            onClick={() => router.push('/register')}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold transition-all"
          >
            Créer un compte
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex absolute top-0 left-0 p-4 pointer-events-none">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30 text-white">
          CursusLink&nbsp;
          <code className="font-bold">Prototype v0.6</code>
        </p>
      </div>
      
      {/* Le composant Graphique prend tout l'écran */}
      <div className="w-full h-screen">
        <SkillGraph />
      </div>
    </main>
  );
}