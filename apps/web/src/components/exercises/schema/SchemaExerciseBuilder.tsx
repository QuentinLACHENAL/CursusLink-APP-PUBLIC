'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Save, Upload, Plus, Trash2, Move, Eye, EyeOff, 
  Settings, HelpCircle, Image as ImageIcon, MousePointer,
  GripVertical, Copy, Download, RotateCcw, ZoomIn, ZoomOut,
  Shuffle, Clock, Target, FileText, AlertCircle
} from 'lucide-react';
import { SchemaExerciseConfig, SchemaBlock, ExerciseMode } from '../types';
import { API_BASE_URL } from '../../../services/api';

interface SchemaExerciseBuilderProps {
  nodeId: string;
  nodeLabel: string;
  initialConfig?: SchemaExerciseConfig;
  token: string;
  onSave: (config: SchemaExerciseConfig) => void;
  onCancel: () => void;
  onImageSelected?: (file: File) => Promise<string>;
}

export default function SchemaExerciseBuilder({
  nodeId,
  nodeLabel,
  initialConfig,
  token,
  onSave,
  onCancel,
  onImageSelected
}: SchemaExerciseBuilderProps) {
  // États principaux
  const [config, setConfig] = useState<SchemaExerciseConfig>(() => initialConfig || {
    id: `schema-${Date.now()}`,
    type: 'schema',
    title: `Schéma - ${nodeLabel}`,
    description: '',
    imageUrl: '',
    blocks: [],
    mode: 'drag-drop' as ExerciseMode,
    showHints: true,
    shuffleBlocks: true,
    totalPoints: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [tempBlock, setTempBlock] = useState<Partial<SchemaBlock> | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [tool, setTool] = useState<'select' | 'draw'>('draw');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTool('select');
        setSelectedBlock(null);
      } else if (e.key === 'd' || e.key === 'D') {
        setTool('draw');
      } else if (e.key === 'Delete' && selectedBlock) {
        deleteBlock(selectedBlock);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlock]);

  // Calculer le total des points
  useEffect(() => {
    const total = config.blocks.reduce((sum, block) => sum + block.points, 0);
    setConfig(prev => ({ ...prev, totalPoints: total }));
  }, [config.blocks]);

  // Gestion de l'upload d'image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (PNG, JPG, etc.)');
      return;
    }

    if (onImageSelected) {
      try {
        const url = await onImageSelected(file);
        const img = new Image();
        img.onload = () => {
          setConfig(prev => ({
            ...prev,
            imageUrl: url,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight
          }));
        };
        img.src = url;
      } catch (e) {
        console.error(e);
        alert('Erreur lors de la sélection de l\'image');
      }
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const res = await fetch(`${API_BASE_URL}/uploads/node/${nodeId}/multiple`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload failed:', res.status, errorText);
        
        let errorMessage = '❌ Échec de l\'upload\n\n';
        
        if (res.status === 413) {
          errorMessage += 'Le fichier est trop volumineux (max 50 Mo).\n\n';
        } else if (res.status === 415 || errorText.includes('mimetype') || errorText.includes('type')) {
          errorMessage += 'Format de fichier non accepté.\n\n';
        } else if (res.status === 401 || res.status === 403) {
          errorMessage += 'Erreur d\'authentification.\n\n';
        } else {
          errorMessage += `Erreur serveur (${res.status}).\n\n`;
        }
        
        errorMessage += '📎 Formats acceptés :\n';
        errorMessage += '• Images : PNG, JPG, JPEG, GIF, WebP\n';
        errorMessage += '• Taille max : 50 Mo';
        
        alert(errorMessage);
        throw new Error('Upload failed');
      }

      const data = await res.json();
      console.log('Upload response:', data);
      
      // Le serveur peut retourner différents formats de réponse
      let uploadedFile = null;
      
      if (data.uploadedFiles && Array.isArray(data.uploadedFiles) && data.uploadedFiles.length > 0) {
        uploadedFile = data.uploadedFiles[0];
      } else if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        uploadedFile = data.files[0];
      } else if (Array.isArray(data) && data.length > 0) {
        uploadedFile = data[0];
      } else if (data.filename) {
        // Réponse directe avec filename
        uploadedFile = data;
      }
      
      console.log('Parsed uploaded file:', uploadedFile);
      
      if (uploadedFile && uploadedFile.filename) {
        const imageUrl = `${API_BASE_URL}/uploads/file/${uploadedFile.filename}`;
        
        // Obtenir les dimensions de l'image
        const img = new Image();
        img.onload = () => {
          setConfig(prev => ({
            ...prev,
            imageUrl,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight
          }));
          alert('✅ Image importée avec succès !\n\nVous pouvez maintenant créer des blocs en cliquant-glissant sur le schéma.');
        };
        img.onerror = () => {
          alert('❌ Erreur lors du chargement de l\'image');
        };
        img.src = imageUrl;
      } else {
        alert('❌ Aucun fichier reçu du serveur\n\nRéponse serveur : ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Upload error:', error);
      // L'erreur détaillée a déjà été affichée dans le bloc if (!res.ok)
      // On ne fait rien de plus ici pour éviter les doubles alertes
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Conversion coordonnées écran -> pourcentage
  const screenToPercent = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  // Début du dessin d'un bloc
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!config.imageUrl || e.button !== 0) return;
    
    const { x, y } = screenToPercent(e.clientX, e.clientY);

    if (tool === 'draw') {
      setIsDrawing(true);
      setDrawStart({ x, y });
      setTempBlock({ x, y, width: 0, height: 0 });
    } else if (tool === 'select' && selectedBlock) {
      // Début du drag
      const block = config.blocks.find(b => b.id === selectedBlock);
      if (block) {
        setIsDragging(true);
        setDragOffset({ x: x - block.x, y: y - block.y });
      }
    }
  };

  // Pendant le dessin
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!config.imageUrl) return;
    const { x, y } = screenToPercent(e.clientX, e.clientY);

    if (isDrawing && drawStart && tool === 'draw') {
      setTempBlock({
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        width: Math.abs(x - drawStart.x),
        height: Math.abs(y - drawStart.y)
      });
    } else if (isDragging && selectedBlock && tool === 'select') {
      setConfig(prev => ({
        ...prev,
        blocks: prev.blocks.map(block => 
          block.id === selectedBlock
            ? { ...block, x: Math.max(0, Math.min(100 - block.width, x - dragOffset.x)), y: Math.max(0, Math.min(100 - block.height, y - dragOffset.y)) }
            : block
        )
      }));
    }
  };

  // Fin du dessin
  const handleMouseUp = () => {
    if (isDrawing && tempBlock && tempBlock.width && tempBlock.height && tempBlock.width > 2 && tempBlock.height > 2) {
      const newBlock: SchemaBlock = {
        id: `block-${Date.now()}`,
        x: tempBlock.x!,
        y: tempBlock.y!,
        width: tempBlock.width,
        height: tempBlock.height,
        answer: '',
        points: 1,
        order: config.blocks.length + 1
      };
      setConfig(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
      setSelectedBlock(newBlock.id);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setTempBlock(null);
    setIsDragging(false);
  };

  // Supprimer un bloc
  const deleteBlock = (blockId: string) => {
    setConfig(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId)
    }));
    if (selectedBlock === blockId) setSelectedBlock(null);
  };

  // Dupliquer un bloc
  const duplicateBlock = (blockId: string) => {
    const block = config.blocks.find(b => b.id === blockId);
    if (!block) return;
    const newBlock: SchemaBlock = {
      ...block,
      id: `block-${Date.now()}`,
      x: Math.min(block.x + 5, 95),
      y: Math.min(block.y + 5, 95),
      order: config.blocks.length + 1
    };
    setConfig(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setSelectedBlock(newBlock.id);
  };

  // Mettre à jour un bloc
  const updateBlock = (blockId: string, updates: Partial<SchemaBlock>) => {
    setConfig(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
    }));
  };

  // Sauvegarder
  const handleSave = () => {
    if (!config.imageUrl) {
      alert('Veuillez d\'abord ajouter un schéma');
      return;
    }
    if (config.blocks.length === 0) {
      alert('Veuillez créer au moins un bloc à identifier');
      return;
    }
    const emptyBlocks = config.blocks.filter(b => !b.answer.trim());
    if (emptyBlocks.length > 0) {
      alert(`${emptyBlocks.length} bloc(s) n'ont pas de réponse définie`);
      return;
    }
    
    const finalConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    onSave(finalConfig);
  };

  // Sauvegarder en ligne directement
  const handleSaveOnline = async () => {
    if (!config.imageUrl) {
      alert('Veuillez d\'abord ajouter un schéma');
      return;
    }
    if (config.blocks.length === 0) {
      alert('Veuillez créer au moins un bloc à identifier');
      return;
    }
    const emptyBlocks = config.blocks.filter(b => !b.answer.trim());
    if (emptyBlocks.length > 0) {
      alert(`${emptyBlocks.length} bloc(s) n'ont pas de réponse définie`);
      return;
    }

    const finalConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };

    // Si c'est une création (pas encore de vrai nodeId), on sauvegarde juste en local/draft
    if (nodeId.startsWith('new-') || nodeId.startsWith('library-')) {
        onSave(finalConfig);
        return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/graph/node/${nodeId}/exercise`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exerciseType: 'schema',
          exerciseData: JSON.stringify(finalConfig)
        })
      });

      if (!res.ok) throw new Error('Failed to save');

      alert('✓ Configuration sauvegardée en ligne !');
      onSave(finalConfig);
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde en ligne');
    }
  };

  // Exporter la configuration
  const handleExport = () => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-exercise-${nodeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importer une configuration
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.type === 'schema') {
          setConfig(imported);
        } else {
          alert('Format de fichier invalide');
        }
      } catch {
        alert('Erreur lors de l\'import du fichier');
      }
    };
    reader.readAsText(file);
  };

  const selectedBlockData = selectedBlock ? config.blocks.find(b => b.id === selectedBlock) : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1d24] w-[95vw] h-[95vh] rounded-xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151820]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Exercice Schéma à Trous</h2>
              <p className="text-xs text-gray-400">Nœud : {nodeLabel}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showPreview ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              {showPreview ? 'Édition' : 'Aperçu'}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
              title="Paramètres"
            >
              <Settings size={18} />
            </button>
            <button onClick={handleExport} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300" title="Exporter JSON">
              <Download size={18} />
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium" title="Enregistrer localement">
              <Save size={16} /> Enregistrer
            </button>
            {nodeId !== 'new-node' && (
              <button onClick={handleSaveOnline} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium" title="Sauvegarder en ligne">
                ☁️ Publier
              </button>
            )}
            <button onClick={onCancel} className="p-2 hover:bg-red-600/20 rounded-lg text-red-400">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Panneau gauche - Canvas */}
          <div className="flex-1 flex flex-col bg-[#0d0f12] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-[#151820] border-b border-white/5">
              <div className="flex items-center gap-2">
                {/* Bouton changer l'image */}
                {config.imageUrl && (
                  <label className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 rounded-lg text-xs font-medium cursor-pointer transition-all">
                    <Upload size={14} />
                    Changer l'image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
                
                <div className="h-6 w-px bg-gray-700" />
                
                <div className="flex bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setTool('select')}
                    className={`p-2 rounded ${tool === 'select' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Sélectionner/Déplacer (Esc)"
                  >
                    <MousePointer size={16} />
                  </button>
                  <button
                    onClick={() => setTool('draw')}
                    className={`px-3 py-2 rounded flex items-center gap-2 font-medium text-xs transition-all ${
                      tool === 'draw' 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    title="Dessiner un bloc (D)"
                  >
                    <Plus size={16} />
                    Ajouter un bloc
                  </button>
                </div>
                
                <div className="h-6 w-px bg-gray-700" />
                
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
                  <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 text-gray-400 hover:text-white">
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1 text-gray-400 hover:text-white">
                    <ZoomIn size={14} />
                  </button>
                </div>
                
                <button onClick={() => setZoom(100)} className="p-2 text-gray-400 hover:text-white text-xs">
                  Reset
                </button>
              </div>
              
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400">
                  <Target size={12} className="inline mr-1" />
                  {config.blocks.length} blocs
                </span>
                <span className="text-yellow-400">
                  ⭐ {config.totalPoints} pts
                </span>
              </div>
            </div>

            {/* Zone de dessin */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {!config.imageUrl ? (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-600" />
                  </div>
                  <p className="text-gray-400 mb-4">Importez un schéma pour commencer</p>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium cursor-pointer transition-all">
                    <Upload size={18} />
                    Choisir une image
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {isUploading && (
                    <div className="mt-4 w-64 mx-auto">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  ref={canvasRef}
                  className="relative select-none"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img
                    ref={imageRef}
                    src={config.imageUrl}
                    alt="Schéma"
                    className="max-w-full max-h-[70vh] rounded-lg shadow-xl"
                    draggable={false}
                  />
                  
                  {/* Blocs existants */}
                  {config.blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className={`absolute border-2 rounded cursor-pointer transition-all hover:opacity-50 ${
                        selectedBlock === block.id
                          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                          : 'border-gray-400 hover:border-gray-300'
                      }`}
                      style={{
                        left: `${block.x}%`,
                        top: `${block.y}%`,
                        width: `${block.width}%`,
                        height: `${block.height}%`,
                        backgroundColor: showPreview 
                          ? 'rgba(0, 0, 0, 0.8)' 
                          : 'white'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlock(block.id);
                        setTool('select');
                      }}
                    >
                      <div className="absolute top-1 right-1 text-[8px] font-bold text-gray-500 bg-gray-100/80 px-1 rounded whitespace-nowrap">
                        #{index + 1}
                      </div>
                      {!showPreview && block.answer && (
                        <div className="w-full h-full flex items-center justify-center p-1 text-center">
                          <span className="text-[10px] font-medium text-black truncate w-full" title={block.answer}>
                            {block.answer}
                          </span>
                        </div>
                      )}
                      {showPreview && (
                        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                          ?
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Bloc temporaire en cours de dessin */}
                  {tempBlock && tempBlock.width && tempBlock.height && (
                    <div
                      className="absolute border-2 border-dashed border-green-500 bg-green-500/20 pointer-events-none"
                      style={{
                        left: `${tempBlock.x}%`,
                        top: `${tempBlock.y}%`,
                        width: `${tempBlock.width}%`,
                        height: `${tempBlock.height}%`
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            {config.imageUrl && !showPreview && (
              <div className="p-3 bg-[#151820] border-t border-white/5">
                <div className="flex items-start gap-3">
                  <HelpCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-300 font-medium">
                      {tool === 'draw' 
                        ? '🖱️ Mode Dessin : Cliquez et glissez pour créer un bloc sur le schéma'
                        : '✋ Mode Sélection : Cliquez sur un bloc pour le sélectionner, puis glissez pour le déplacer'
                      }
                    </p>
                    <div className="flex gap-4 text-gray-500">
                      <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px]">D</kbd> Dessiner</span>
                      <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px]">Esc</kbd> Sélectionner</span>
                      <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px]">Suppr</kbd> Effacer bloc</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panneau droit - Propriétés */}
          <div className="w-80 bg-[#151820] border-l border-white/10 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setShowSettings(false)}
                className={`flex-1 px-4 py-3 text-sm font-medium ${!showSettings ? 'text-white border-b-2 border-blue-500' : 'text-gray-500'}`}
              >
                Bloc sélectionné
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className={`flex-1 px-4 py-3 text-sm font-medium ${showSettings ? 'text-white border-b-2 border-blue-500' : 'text-gray-500'}`}
              >
                Paramètres
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {showSettings ? (
                /* Paramètres généraux */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre de l'exercice</label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description (optionnel)</label>
                    <textarea
                      value={config.description || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 h-20 resize-none"
                      placeholder="Instructions pour l'étudiant..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      Mode de réponse
                      <span className="text-yellow-400 ml-2">⚡ Important</span>
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 border border-transparent has-[:checked]:border-blue-500 has-[:checked]:bg-blue-900/20">
                        <input
                          type="radio"
                          name="mode"
                          value="drag-drop"
                          checked={config.mode === 'drag-drop'}
                          onChange={() => setConfig(prev => ({ ...prev, mode: 'drag-drop' }))}
                          className="text-blue-500 mt-0.5"
                        />
                        <div>
                          <span className="text-white text-sm font-medium flex items-center gap-2">
                            🎯 Glisser-Déposer
                            <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">AUTO</span>
                          </span>
                          <p className="text-xs text-gray-400 mt-1">Les réponses sont mélangées dans une liste. L'étudiant les glisse sur le schéma.</p>
                          <p className="text-[10px] text-green-400 mt-1">✓ Correction automatique</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 border border-transparent has-[:checked]:border-blue-500 has-[:checked]:bg-blue-900/20">
                        <input
                          type="radio"
                          name="mode"
                          value="free-input"
                          checked={config.mode === 'free-input'}
                          onChange={() => setConfig(prev => ({ ...prev, mode: 'free-input' }))}
                          className="text-blue-500 mt-0.5"
                        />
                        <div>
                          <span className="text-white text-sm font-medium flex items-center gap-2">
                            ✍️ Saisie libre
                            <span className="text-[10px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded">MANUEL</span>
                          </span>
                          <p className="text-xs text-gray-400 mt-1">L'étudiant écrit lui-même chaque réponse dans un champ texte.</p>
                          <p className="text-[10px] text-orange-400 mt-1">⚠️ Nécessite correction manuelle par le prof ou un pair</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showHints}
                        onChange={(e) => setConfig(prev => ({ ...prev, showHints: e.target.checked }))}
                        className="rounded bg-gray-700 border-gray-600 text-blue-500"
                      />
                      Afficher les indices
                    </label>
                    {config.mode === 'drag-drop' && (
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.shuffleBlocks}
                          onChange={(e) => setConfig(prev => ({ ...prev, shuffleBlocks: e.target.checked }))}
                          className="rounded bg-gray-700 border-gray-600 text-blue-500"
                        />
                        Mélanger les réponses
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      <Clock size={12} className="inline mr-1" />
                      Limite de temps (optionnel)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.timeLimit || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, timeLimit: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="w-24 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700"
                        placeholder="—"
                        min="0"
                      />
                      <span className="text-xs text-gray-500">secondes</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <label className="block text-xs text-gray-400 mb-2">Importer une configuration</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm cursor-pointer border border-dashed border-gray-600">
                      <FileText size={14} />
                      Charger un fichier JSON
                      <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
                  </div>
                </div>
              ) : selectedBlockData ? (
                /* Édition du bloc sélectionné */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">
                      Bloc #{config.blocks.findIndex(b => b.id === selectedBlock) + 1}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => duplicateBlock(selectedBlock!)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                        title="Dupliquer"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => deleteBlock(selectedBlock!)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Réponse attendue <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={selectedBlockData.answer}
                      onChange={(e) => updateBlock(selectedBlock!, { answer: e.target.value })}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-blue-500"
                      placeholder="Ex: Fémur, Humérus..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Indice (optionnel)</label>
                    <input
                      type="text"
                      value={selectedBlockData.hint || ''}
                      onChange={(e) => updateBlock(selectedBlock!, { hint: e.target.value })}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-blue-500"
                      placeholder="Un indice pour aider l'étudiant..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Points</label>
                    <input
                      type="number"
                      value={selectedBlockData.points}
                      onChange={(e) => updateBlock(selectedBlock!, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-24 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-blue-500"
                      min="1"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <label className="block text-xs text-gray-400 mb-2">Position & Taille</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">X:</span>
                        <span className="text-gray-300 ml-1">{selectedBlockData.x.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Y:</span>
                        <span className="text-gray-300 ml-1">{selectedBlockData.y.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Largeur:</span>
                        <span className="text-gray-300 ml-1">{selectedBlockData.width.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Hauteur:</span>
                        <span className="text-gray-300 ml-1">{selectedBlockData.height.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Aucun bloc sélectionné */
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <MousePointer className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Sélectionnez un bloc</p>
                  <p className="text-xs mt-1">ou dessinez-en un nouveau</p>
                </div>
              )}
            </div>

            {/* Liste des blocs */}
            {config.blocks.length > 0 && !showSettings && (
              <div className="border-t border-white/10 p-3 max-h-48 overflow-y-auto">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Tous les blocs ({config.blocks.length})</h4>
                <div className="space-y-1">
                  {config.blocks.map((block, index) => (
                    <button
                      key={block.id}
                      onClick={() => setSelectedBlock(block.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-all ${
                        selectedBlock === block.id
                          ? 'bg-blue-600/30 text-blue-300'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <GripVertical size={12} className="opacity-50" />
                      <span className="font-medium">#{index + 1}</span>
                      <span className="flex-1 truncate">{block.answer || '(vide)'}</span>
                      <span className="text-yellow-400">{block.points}pt</span>
                      {!block.answer && <AlertCircle size={12} className="text-red-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
