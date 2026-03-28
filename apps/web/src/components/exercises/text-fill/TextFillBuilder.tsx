'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, X, Eye, EyeOff, Plus, Trash2, GripVertical, Settings, AlignLeft, RefreshCw } from 'lucide-react';
import { TextFillExerciseConfig, TextFillGap } from '../types';

interface TextFillBuilderProps {
  nodeId: string;
  nodeLabel: string;
  initialConfig?: TextFillExerciseConfig;
  onSave: (config: TextFillExerciseConfig) => void;
  onCancel: () => void;
}

export default function TextFillBuilder({
  nodeId,
  nodeLabel,
  initialConfig,
  onSave,
  onCancel
}: TextFillBuilderProps) {
  const [config, setConfig] = useState<TextFillExerciseConfig>(() => initialConfig || {
    id: `text-fill-${Date.now()}`,
    type: 'text-fill',
    title: `Texte à trous - ${nodeLabel}`,
    description: '',
    content: '',
    gaps: [],
    mode: 'drag-drop',
    caseSensitive: false,
    totalPoints: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [textContent, setTextContent] = useState(config.content || '');
  const [showPreview, setShowPreview] = useState(false);
  const [selection, setSelection] = useState<{start: number, end: number, text: string} | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse gaps from text content when loading initial config
  // Actually, we store {{id}} in text. We need to maintain that.
  // The textarea should ideally show the "raw" text with {{id}} OR we show a visual representation.
  // For simplicity, let's show the raw text in the textarea, but maybe highlighting {{...}} is hard in textarea.
  // We'll use a simple textarea. User selects text -> we replace it with {{gap_ID}} and add to gaps list.

  const handleTextSelect = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value.substring(start, end);
    
    if (start !== end && text.trim()) {
      setSelection({ start, end, text });
    } else {
      setSelection(null);
    }
  };

  const createGap = () => {
    if (!selection) return;
    
    const id = `gap-${Date.now()}`;
    const newGap: TextFillGap = {
      id,
      word: selection.text,
      points: 1
    };
    
    // Replace text with {{id}}
    const newText = textContent.substring(0, selection.start) + `{{${id}}}` + textContent.substring(selection.end);
    
    setTextContent(newText);
    setConfig(prev => ({
      ...prev,
      gaps: [...prev.gaps, newGap]
    }));
    setSelection(null);
  };

  const removeGap = (gapId: string) => {
    const gap = config.gaps.find(g => g.id === gapId);
    if (!gap) return;
    
    // Restore word in text? 
    // We replace {{gapId}} with gap.word
    // Be careful with multiple occurrences? IDs are unique time-based.
    
    const newText = textContent.replace(`{{${gapId}}}`, gap.word);
    setTextContent(newText);
    setConfig(prev => ({
      ...prev,
      gaps: prev.gaps.filter(g => g.id !== gapId)
    }));
  };

  const updateGap = (gapId: string, updates: Partial<TextFillGap>) => {
    setConfig(prev => ({
      ...prev,
      gaps: prev.gaps.map(g => g.id === gapId ? { ...g, ...updates } : g)
    }));
  };

  // Sync content
  useEffect(() => {
    setConfig(prev => ({ ...prev, content: textContent }));
  }, [textContent]);

  // Sync points
  useEffect(() => {
    const total = config.gaps.reduce((sum, gap) => sum + gap.points, 0);
    setConfig(prev => ({ ...prev, totalPoints: total }));
  }, [config.gaps]);

  const handleSave = () => {
    if (config.gaps.length === 0) {
      alert('Veuillez créer au moins un trou.');
      return;
    }
    onSave({
      ...config,
      updatedAt: new Date().toISOString()
    });
  };

  // Render text with highlights
  const renderHighlightedText = () => {
    let rendered = textContent;
    // We want to highlight {{gap-xxx}}
    // This is just for visual feedback below the textarea? 
    // Or we replace textarea with a contenteditable div?
    // Stick to textarea for robustness, show gaps list on side.
    
    // Let's replace {{id}} with [WORD] for preview
    config.gaps.forEach(gap => {
        rendered = rendered.replace(`{{${gap.id}}}`, `[${gap.word}]`);
    });
    return rendered;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-[#1a1d24] w-full max-w-6xl h-[90vh] rounded-xl border border-white/10 flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151820]">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
              <AlignLeft size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Éditeur Texte à Trous</h2>
              <p className="text-xs text-gray-400">Sélectionnez du texte et cliquez sur "Masquer" pour créer un trou</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(!showPreview)} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white flex items-center gap-2">
                {showPreview ? <EyeOff size={16}/> : <Eye size={16}/>} {showPreview ? 'Éditer' : 'Aperçu'}
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white font-bold flex items-center gap-2">
                <Save size={16}/> Enregistrer
            </button>
            <button onClick={onCancel} className="p-2 hover:bg-red-500/20 text-red-400 rounded">
                <X size={20}/>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Editor */}
            <div className={`flex-1 flex flex-col p-4 bg-[#0d0f12] overflow-hidden ${showPreview ? 'hidden' : ''}`}>
                <div className="mb-4 bg-slate-800 p-2 rounded flex items-center gap-4 border border-slate-700">
                    <button 
                        onClick={createGap}
                        disabled={!selection}
                        className={`px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-all ${
                            selection 
                            ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <EyeOff size={14}/> Masquer la sélection
                    </button>
                    {selection && <span className="text-xs text-slate-400">Sélection : "{selection.text}"</span>}
                </div>

                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        onSelect={handleTextSelect}
                        className="w-full h-full bg-slate-900 border border-slate-700 rounded p-4 text-slate-200 font-mono text-sm resize-none focus:border-blue-500 focus:outline-none leading-relaxed"
                        placeholder="Copiez votre texte ici, puis sélectionnez les mots à masquer..."
                    />
                </div>
            </div>

            {/* Preview */}
            <div className={`flex-1 p-8 bg-[#0d0f12] overflow-y-auto ${!showPreview ? 'hidden' : ''}`}>
                <div className="prose prose-invert max-w-none">
                    {/* Basic replacement for preview */}
                    {config.content.split(/(\{\{gap-\d+\}\})/).map((part, i) => {
                        if (part.startsWith('{{gap-')) {
                            const id = part.replace('{{', '').replace('}}', '');
                            const gap = config.gaps.find(g => g.id === id);
                            if (!gap) return <span key={i} className="text-red-500">?</span>;
                            
                            return (
                                <span key={i} className="mx-1 inline-block">
                                    {config.mode === 'drag-drop' ? (
                                        <span className="bg-slate-800 border-2 border-dashed border-slate-600 text-transparent px-2 py-0.5 rounded min-w-[60px] select-none">
                                            {gap.word}
                                        </span>
                                    ) : (
                                        <input disabled className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-sm w-24" placeholder="..." />
                                    )}
                                </span>
                            );
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </div>
                
                {config.mode === 'drag-drop' && (
                    <div className="mt-8 p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-wrap gap-2">
                        {config.gaps.map(gap => (
                            <div key={gap.id} className="bg-purple-600 text-white px-3 py-1.5 rounded shadow cursor-grab active:cursor-grabbing">
                                {gap.word}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sidebar Settings */}
            <div className="w-80 bg-[#151820] border-l border-white/10 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="font-bold text-white mb-4">Configuration</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Mode de jeu</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setConfig({...config, mode: 'drag-drop'})}
                                    className={`p-2 rounded text-xs border ${config.mode === 'drag-drop' ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    Glisser-Déposer
                                </button>
                                <button
                                    onClick={() => setConfig({...config, mode: 'input'})}
                                    className={`p-2 rounded text-xs border ${config.mode === 'input' ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    Saisie Libre
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Titre</label>
                            <input 
                                value={config.title}
                                onChange={(e) => setConfig({...config, title: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="font-bold text-white mb-2 text-sm flex items-center justify-between">
                        Trous ({config.gaps.length})
                        <span className="text-xs text-yellow-400">{config.totalPoints} pts</span>
                    </h3>
                    
                    <div className="space-y-2">
                        {config.gaps.map((gap, index) => (
                            <div key={gap.id} className="bg-slate-800 p-3 rounded border border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-white text-sm bg-slate-900 px-1.5 py-0.5 rounded">#{index + 1}</span>
                                    <button onClick={() => removeGap(gap.id)} className="text-red-400 hover:bg-red-900/30 p-1 rounded">
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
                                <div className="mb-2">
                                    <div className="text-xs text-slate-400 mb-1">Mot masqué</div>
                                    <div className="text-sm font-mono text-green-400 bg-slate-900 p-1 rounded break-all">{gap.word}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-slate-500 block">Points</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={gap.points}
                                            onChange={(e) => updateGap(gap.id, { points: parseInt(e.target.value)||1 })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 block">Indice</label>
                                        <input 
                                            value={gap.hint || ''}
                                            onChange={(e) => updateGap(gap.id, { hint: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-white"
                                            placeholder="..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
