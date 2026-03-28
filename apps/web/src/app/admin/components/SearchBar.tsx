'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Hexagon, Layers } from 'lucide-react';

interface SearchBarProps {
  structure: any;
  onNodeSelect: (node: any) => void;
}

export default function SearchBar({ structure, onNodeSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Raccourci Ctrl+K pour ouvrir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Recherche
  useEffect(() => {
    if (!query.trim() || !structure) {
      setResults([]);
      return;
    }

    const searchResults: any[] = [];
    const q = query.toLowerCase();

    Object.entries(structure).forEach(([galaxyName, galaxy]: [string, any]) => {
      // Recherche dans les galaxies
      if (galaxyName.toLowerCase().includes(q)) {
        searchResults.push({
          type: 'galaxy',
          label: galaxyName,
          galaxy: galaxyName,
          icon: 'galaxy'
        });
      }

      Object.entries(galaxy.groups).forEach(([systemName, system]: [string, any]) => {
        // Recherche dans les systèmes
        if (systemName.toLowerCase().includes(q)) {
          searchResults.push({
            type: 'system',
            label: systemName,
            galaxy: galaxyName,
            system: systemName,
            icon: 'system'
          });
        }

        // Recherche dans les nœuds
        system.nodes.forEach((node: any) => {
          if (node.label?.toLowerCase().includes(q) || node.id?.includes(q)) {
            searchResults.push({
              ...node,
              type: 'node',
              galaxy: galaxyName,
              system: systemName,
              icon: node.type === 'Project' ? 'project' : node.type === 'exercise' ? 'exercise' : 'topic'
            });
          }
        });
      });
    });

    setResults(searchResults.slice(0, 10));
    setSelectedIndex(0);
  }, [query, structure]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onNodeSelect(results[selectedIndex]);
      setIsOpen(false);
      setQuery('');
    }
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'galaxy': return <Hexagon size={14} className="text-blue-400" />;
      case 'system': return <Layers size={14} className="text-purple-400" />;
      case 'project': return <span className="text-yellow-400">★</span>;
      case 'exercise': return <span className="text-green-400">✎</span>;
      default: return <MapPin size={14} className="text-slate-400" />;
    }
  };

  return (
    <>
      {/* Bouton de recherche */}
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-400 text-xs transition-colors"
      >
        <Search size={14} />
        <span>Rechercher...</span>
        <kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-slate-600">Ctrl+K</kbd>
      </button>

      {/* Modal de recherche */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/60">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
              <Search size={18} className="text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher un cours, exercice, galaxie..."
                className="flex-1 bg-transparent text-white outline-none placeholder-slate-500"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white">
                  <X size={16} />
                </button>
              )}
              <kbd className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-500 border border-slate-700">Esc</kbd>
            </div>

            {/* Résultats */}
            <div className="max-h-[400px] overflow-auto">
              {results.length === 0 && query && (
                <div className="px-4 py-8 text-center text-slate-500">
                  Aucun résultat pour "{query}"
                </div>
              )}

              {results.length === 0 && !query && (
                <div className="px-4 py-8 text-center text-slate-500">
                  <p>Commencez à taper pour rechercher</p>
                  <p className="text-xs mt-2">Cours, exercices, galaxies, systèmes...</p>
                </div>
              )}

              {results.map((result, i) => (
                <button
                  key={result.id || `${result.type}-${result.label}-${i}`}
                  onClick={() => {
                    onNodeSelect(result);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                    i === selectedIndex ? 'bg-blue-600/20' : 'hover:bg-slate-800'
                  }`}
                >
                  {getIcon(result.icon)}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{result.label}</div>
                    <div className="text-xs text-slate-500">
                      {result.galaxy}
                      {result.system && ` / ${result.system}`}
                      {result.xp !== undefined && <span className="text-emerald-500 ml-2">{result.xp} XP</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    result.type === 'galaxy' ? 'bg-blue-900/50 text-blue-400' :
                    result.type === 'system' ? 'bg-purple-900/50 text-purple-400' :
                    result.type === 'Project' ? 'bg-yellow-900/50 text-yellow-400' :
                    result.type === 'exercise' ? 'bg-green-900/50 text-green-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {result.type}
                  </span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-800 flex gap-4 text-[10px] text-slate-600">
              <span>↑↓ naviguer</span>
              <span>↵ sélectionner</span>
              <span>Esc fermer</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
