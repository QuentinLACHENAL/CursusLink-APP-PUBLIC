'use client';

import { useState } from 'react';
import { 
  Palette, 
  Moon, 
  Sun, 
  Sparkles, 
  Zap, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import { useGraphTheme } from '../context/GraphThemeContext';
import { THEMES, GraphTheme } from './graph/types';

interface ThemeSelectorProps {
  compact?: boolean;
}

export default function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { 
    currentTheme, 
    themeName, 
    setTheme, 
    customTheme,
    setCustomTheme,
    highPerformanceMode, 
    setHighPerformanceMode 
  } = useGraphTheme();
  
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const themes = Object.entries(THEMES);
  
  // Icônes pour les thèmes
  const themeIcons: Record<string, React.ReactNode> = {
    deepSpace: <Moon size={14} />,
    nebula: <Sparkles size={14} />,
    solarSystem: <Sun size={14} />,
    cyber: <Zap size={14} />,
    medical: <span className="text-xs">🏥</span>,
  };

  const updateCustomColor = (key: keyof GraphTheme, value: string) => {
    setCustomTheme({
      ...(customTheme || {}),
      [key]: value,
    });
  };

  const resetCustomTheme = () => {
    setCustomTheme(null);
  };

  const exportTheme = () => {
    const data = {
      baseName: themeName,
      customizations: customTheme,
      highPerformanceMode,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${themeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.baseName && THEMES[data.baseName]) {
          setTheme(data.baseName);
        }
        if (data.customizations) {
          setCustomTheme(data.customizations);
        }
        if (typeof data.highPerformanceMode === 'boolean') {
          setHighPerformanceMode(data.highPerformanceMode);
        }
      } catch (err) {
        console.error('Invalid theme file:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (compact) {
    // Version compacte (dropdown)
    return (
      <div className="relative">
        <select
          value={themeName}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-white cursor-pointer hover:bg-slate-700 pr-8 appearance-none"
        >
          {themes.map(([key, theme]) => (
            <option key={key} value={key}>
              {theme.name}
            </option>
          ))}
        </select>
        <Palette size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Palette size={16} className="text-purple-400" />
          Thème Visuel
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHighPerformanceMode(!highPerformanceMode)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
              highPerformanceMode 
                ? 'bg-green-900/30 border-green-500/50 text-green-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Mode haute performance (moins d'effets)"
          >
            <Zap size={10} />
            {highPerformanceMode ? 'Perf ON' : 'Perf OFF'}
          </button>
        </div>
      </div>

      {/* Sélection de thème */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {themes.map(([key, theme]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                themeName === key
                  ? 'bg-purple-900/30 border-purple-500/50 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              {/* Preview des couleurs */}
              <div className="flex flex-col gap-0.5">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ 
                    backgroundColor: theme.backgroundColor,
                    boxShadow: `0 0 8px ${theme.defaultNodeGlow}`,
                    border: `2px solid ${theme.linkMasteredColor}`,
                  }}
                />
              </div>
              <div>
                <div className="text-xs font-medium flex items-center gap-1">
                  {themeIcons[key]}
                  {theme.name}
                </div>
              </div>
              {themeName === key && (
                <div className="ml-auto">
                  <Eye size={12} className="text-purple-400" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Aperçu du thème actuel */}
        <div 
          className="relative h-20 rounded-lg mb-3 overflow-hidden"
          style={{ backgroundColor: currentTheme.backgroundColor }}
        >
          {/* Mini galaxie de prévisualisation */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Liens */}
            <svg className="absolute inset-0 w-full h-full">
              <line 
                x1="50%" y1="50%" x2="25%" y2="30%"
                stroke={currentTheme.linkColor}
                strokeWidth="2"
              />
              <line 
                x1="50%" y1="50%" x2="75%" y2="30%"
                stroke={currentTheme.linkMasteredColor}
                strokeWidth="2"
              />
              <line 
                x1="50%" y1="50%" x2="30%" y2="70%"
                stroke={currentTheme.linkColor}
                strokeWidth="2"
              />
              <line 
                x1="50%" y1="50%" x2="70%" y2="70%"
                stroke={currentTheme.particleColor}
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </svg>
            
            {/* Nœuds */}
            <div 
              className="absolute w-6 h-6 rounded-full"
              style={{ 
                left: '50%', 
                top: '50%', 
                transform: 'translate(-50%, -50%)',
                backgroundColor: currentTheme.defaultNodeGlow,
                boxShadow: `0 0 15px ${currentTheme.defaultNodeGlow}`,
              }}
            />
            <div 
              className="absolute w-3 h-3 rounded-full"
              style={{ 
                left: '25%', 
                top: '30%',
                backgroundColor: currentTheme.linkMasteredColor,
                boxShadow: `0 0 8px ${currentTheme.linkMasteredColor}`,
              }}
            />
            <div 
              className="absolute w-3 h-3 rounded-full"
              style={{ 
                left: '75%', 
                top: '30%',
                backgroundColor: currentTheme.particleColor,
                boxShadow: `0 0 8px ${currentTheme.particleColor}`,
              }}
            />
            <div 
              className="absolute w-2 h-2 rounded-full"
              style={{ 
                left: '30%', 
                top: '70%',
                backgroundColor: currentTheme.linkColor,
              }}
            />
            <div 
              className="absolute w-2 h-2 rounded-full"
              style={{ 
                left: '70%', 
                top: '70%',
                backgroundColor: currentTheme.labelColor,
              }}
            />
          </div>
          
          {/* Labels */}
          <div 
            className="absolute bottom-1 right-2 text-[8px] uppercase"
            style={{ color: currentTheme.labelColor }}
          >
            {currentTheme.name}
          </div>
        </div>

        {/* Personnalisation */}
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}
          className="w-full flex items-center justify-between p-2 bg-slate-800/50 hover:bg-slate-800 rounded border border-slate-700 text-xs text-slate-300"
        >
          <span className="flex items-center gap-2">
            <Palette size={12} />
            Personnaliser les couleurs
          </span>
          {showCustomizer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showCustomizer && (
          <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800 space-y-3">
            {/* Couleurs personnalisables */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Glow des nœuds</label>
                <input
                  type="color"
                  value={customTheme?.defaultNodeGlow || currentTheme.defaultNodeGlow}
                  onChange={(e) => updateCustomColor('defaultNodeGlow', e.target.value)}
                  className="w-full h-7 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Liens normaux</label>
                <input
                  type="color"
                  value={customTheme?.linkColor || currentTheme.linkColor}
                  onChange={(e) => updateCustomColor('linkColor', e.target.value)}
                  className="w-full h-7 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Liens maîtrisés</label>
                <input
                  type="color"
                  value={customTheme?.linkMasteredColor || currentTheme.linkMasteredColor}
                  onChange={(e) => updateCustomColor('linkMasteredColor', e.target.value)}
                  className="w-full h-7 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Particules</label>
                <input
                  type="color"
                  value={customTheme?.particleColor || currentTheme.particleColor}
                  onChange={(e) => updateCustomColor('particleColor', e.target.value)}
                  className="w-full h-7 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Labels</label>
                <input
                  type="color"
                  value={customTheme?.labelColor || currentTheme.labelColor}
                  onChange={(e) => updateCustomColor('labelColor', e.target.value)}
                  className="w-full h-7 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Fond</label>
                <input
                  type="color"
                  value={customTheme?.backgroundColor || currentTheme.backgroundColor}
                  onChange={(e) => updateCustomColor('backgroundColor', e.target.value)}
                  className="w-full h-7 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Bouton reset */}
            {customTheme && (
              <button
                onClick={resetCustomTheme}
                className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-slate-500 hover:text-red-400 border border-slate-700 rounded hover:border-red-500/50 transition-colors"
              >
                <RotateCcw size={12} />
                Réinitialiser les personnalisations
              </button>
            )}
          </div>
        )}

        {/* Export/Import */}
        <button
          onClick={() => setShowExport(!showExport)}
          className="w-full flex items-center justify-between p-2 mt-2 bg-slate-800/50 hover:bg-slate-800 rounded border border-slate-700 text-xs text-slate-300"
        >
          <span className="flex items-center gap-2">
            <Download size={12} />
            Exporter / Importer
          </span>
          {showExport ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showExport && (
          <div className="mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800 space-y-2">
            <button
              onClick={exportTheme}
              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors"
            >
              <Download size={12} />
              Exporter le thème
            </button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <button className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors">
                <Upload size={12} />
                Importer un thème
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
