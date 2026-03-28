'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare, X, Send, Minimize2, Maximize2, Users, Hash, Shield } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

interface Message {
  sender: string;
  text: string;
  room: string;
  timestamp: number;
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeRoom, setActiveRoom] = useState('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      // Connexion au serveur WebSocket (namespace 'chat' si configuré, sinon root)
      const newSocket = io(API_BASE_URL);
      setSocket(newSocket);

      // Définition des canaux
      const schoolRoom = `school_${user.school || 'default'}`;
      const coalitionRoom = user.coalition ? `coalition_${user.school || 'default'}_${user.coalition}` : null;

      // Rejoindre les rooms
      newSocket.emit('join', { name: user.firstName, school: user.school || 'default' });
      newSocket.emit('joinRoom', 'general');
      newSocket.emit('joinRoom', schoolRoom);
      if (coalitionRoom) newSocket.emit('joinRoom', coalitionRoom);

      // Écouter les messages
      newSocket.on('receiveMessage', (message: Message) => {
        setMessages((prev) => [...prev, message]);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && socket) {
        // Déterminer la room cible selon l'onglet actif
        let targetRoom = 'general';
        if (activeRoom === 'school') targetRoom = `school_${user.school || 'default'}`;
        if (activeRoom === 'coalition') targetRoom = `coalition_${user.school || 'default'}_${user.coalition}`;

        socket.emit('sendMessage', { 
          sender: user.firstName, 
          senderId: user.id,
          text: input, 
          coalition: user.coalition,
          room: targetRoom 
        });
        setInput('');
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false); // Ensure it opens fully
  };

  if (!user) return null;

  return (
    <>
      {/* Bouton Flottant */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 left-6 p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 hover:bg-slate-800 text-white rounded-xl shadow-2xl transition-all transform hover:scale-105 z-50 flex items-center gap-2 group"
        >
          <MessageSquare size={24} className="text-blue-400 group-hover:text-blue-300"/>
          <span className="font-bold hidden md:inline text-sm">Messagerie</span>
        </button>
      )}

      {/* Fenêtre de Chat */}
      {isOpen && (
        <div className={`fixed bottom-6 left-6 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl z-50 flex flex-col transition-all duration-300 ${isMinimized ? 'w-72 h-14' : 'w-80 md:w-96 h-[500px]'}`}>
          
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-t-xl cursor-pointer border-b border-slate-700/50"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <h3 className="font-bold text-white text-sm">Messagerie</h3>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors">
                    {isMinimized ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-slate-400 transition-colors">
                    <X size={16} />
                </button>
            </div>
          </div>

          {!isMinimized && (
            <>
                {/* Tabs Canaux */}
                <div className="flex bg-slate-950/50 p-1 gap-1 border-b border-slate-700/50">
                    <button 
                        onClick={() => setActiveRoom('general')}
                        className={`flex-1 py-1 text-xs font-bold rounded transition-all ${activeRoom === 'general' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:bg-slate-800/50'}`}
                    >
                        Général
                    </button>
                    <button 
                        onClick={() => setActiveRoom('school')}
                        className={`flex-1 py-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${activeRoom === 'school' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:bg-slate-800/50'}`}
                    >
                        <Users size={10}/> École
                    </button>
                    {user.coalition && (
                        <button 
                            onClick={() => setActiveRoom('coalition')}
                            className={`flex-1 py-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${activeRoom === 'coalition' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'text-slate-500 hover:bg-slate-800/50'}`}
                        >
                            <Shield size={10}/> {user.coalition}
                        </button>
                    )}
                </div>

                {/* Zone Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-transparent scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {messages
                        .filter(m => {
                            if (activeRoom === 'general') return m.room === 'general';
                            if (activeRoom === 'school') return m.room.startsWith('school_');
                            if (activeRoom === 'coalition') return m.room.startsWith('coalition_');
                            return true;
                        })
                        .map((msg, index) => (
                        <div key={index} className={`flex flex-col ${msg.sender === user.firstName ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-[10px] font-bold text-slate-400">{msg.sender}</span>
                                <span className="text-[9px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words shadow-sm ${
                                msg.sender === user.firstName 
                                ? 'bg-blue-600/80 text-white rounded-tr-none border border-blue-500/30' 
                                : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700/50'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 bg-slate-800/50 border-t border-slate-700/50 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Message #${activeRoom}...`}
                        className="flex-1 bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-slate-900"
                    />
                    <button type="submit" className="p-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20">
                        <Send size={16} />
                    </button>
                </form>
            </>
          )}
        </div>
      )}
    </>
  );
}