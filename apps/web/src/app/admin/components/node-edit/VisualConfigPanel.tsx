'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Eye, 
  Palette, 
  RotateCcw, 
  Download, 
  Upload, 
  ChevronDown, 
  ChevronUp,
  Layers,
  Sun,
  Moon,
  Circle,
} from 'lucide-react';
import { 
  NodeVisualConfig, 
  PlanetType, 
  StarType,
  VisualStyle,
  PLANET_PALETTES,
  STAR_COLORS,
  VISUAL_TEMPLATES,
  VisualTemplate,
  DEFAULT_VISUALS,
} from '../../../../components/graph/types';
import {
  renderPlanet,
  renderStar,
  renderBlackHole,
} from '../../../../components/graph';

interface VisualConfigPanelProps {
  config: Partial<NodeVisualConfig>;
  nodeType: string;
  onChange: (config: Partial<NodeVisualConfig>) => void;
  onSave?: () => void;
}

type TabType = 'templates' | 'manual' | 'export';

export default function VisualConfigPanel({ config, nodeType, onChange, onSave }: VisualConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [expandedSection, setExpandedSection] = useState<string | null>('type');
  const [searchTerm, setSearchTerm] = useState('');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'planet' | 'star' | 'blackhole' | 'nebula'>('all');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Déterminer le style effectif basé sur la config ou le type de nœud
  const effectiveStyle = config.visualStyle || 
    (nodeType === 'root' || nodeType === 'blackhole' ? 'blackhole' : 
     nodeType === 'region' || nodeType === 'star' || nodeType === 'constellation' ? 'star' : 'planet');
  
  // Fusionner avec les valeurs par défaut
  const effectiveConfig: Partial<NodeVisualConfig> = {
    ...DEFAULT_VISUALS[nodeType] || DEFAULT_VISUALS.topic,
    ...config,
  };

  // Animation et rendu du preview
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const time = performance.now() / 1000;
    
    // Clear avec fond spatial
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, width, height);
    
    // Quelques étoiles de fond
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(i * 17.3) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 23.7) * 0.5 + 0.5) * height;
      const twinkle = 0.3 + Math.sin(time * (1 + i * 0.1)) * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + Math.random() * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
      ctx.fill();
    }
    
    // Rendu de l'objet céleste
    const renderContext = {
      ctx,
      x: width / 2,
      y: height / 2,
      size: Math.min(width, height) * 0.35,
      time,
      globalScale: 1,
    };
    
    const style = effectiveConfig.visualStyle || effectiveStyle;
    
    if (style === 'blackhole') {
      renderBlackHole(renderContext, effectiveConfig);
    } else if (style === 'star') {
      renderStar(renderContext, effectiveConfig);
    } else {
      renderPlanet(renderContext, effectiveConfig);
    }
    
    animationRef.current = requestAnimationFrame(renderPreview);
  }, [effectiveConfig, effectiveStyle]);
  
  useEffect(() => {
    renderPreview();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [renderPreview]);

  // Filtrer les templates
  const filteredTemplates = VISUAL_TEMPLATES.filter(t => {
    if (templateFilter !== 'all' && t.config.visualStyle !== templateFilter) return false;
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Appliquer un template
  const applyTemplate = (template: VisualTemplate) => {
    onChange({ ...template.config });
  };

  // Export/Import de la config
  const exportConfig = () => {
    const json = JSON.stringify(effectiveConfig, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visual-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        onChange(imported);
      } catch (err) {
        console.error('Invalid config file:', err);
      }
    };
    reader.readAsText(file);
  };

  // Section collapsible
  const Section = ({ id, title, icon: Icon, children }: { 
    id: string; 
    title: string; 
    icon: React.ElementType; 
    children: React.ReactNode;
  }) => (
    <div className="border-b border-slate-700/50 last:border-0">
      <button
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full flex items-center justify-between py-2 px-1 text-xs text-slate-400 hover:text-slate-200"
      >
        <span className="flex items-center gap-2">
          <Icon size={12} />
          {title}
        </span>
        {expandedSection === id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expandedSection === id && (
        <div className="pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Preview Canvas */}
      <div className="relative bg-slate-950 p-2">
        <canvas 
          ref={previewCanvasRef}
          width={200}
          height={150}
          className="w-full rounded-lg"
        />
        <div className="absolute bottom-3 right-3 text-[8px] text-slate-500 uppercase">
          Prévisualisation
        </div>
      </div>
      
      {/* Bouton Sauvegarder Rapide */}
      {onSave && (
        <button 
            onClick={onSave}
            className="w-full bg-green-600 hover:bg-green-500 text-white text-base font-bold py-4 border-b-4 border-green-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg mb-4 rounded"
        >
            <Download size={18} /> Appliquer et Sauvegarder
        </button>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-[10px] uppercase font-bold transition-colors ${
            activeTab === 'templates' 
              ? 'text-purple-400 bg-purple-900/20 border-b-2 border-purple-500' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles size={10} className="inline mr-1" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2 text-[10px] uppercase font-bold transition-colors ${
            activeTab === 'manual' 
              ? 'text-purple-400 bg-purple-900/20 border-b-2 border-purple-500' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Palette size={10} className="inline mr-1" />
          Manuel
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 text-[10px] uppercase font-bold transition-colors ${
            activeTab === 'export' 
              ? 'text-purple-400 bg-purple-900/20 border-b-2 border-purple-500' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Download size={10} className="inline mr-1" />
          Export
        </button>
      </div>

      <div className="p-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {/* TAB: Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            {/* Filtres */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              />
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                <option value="all">Tous</option>
                <option value="planet">🪐 Planètes</option>
                <option value="star">⭐ Étoiles</option>
                <option value="blackhole">🕳️ Trous Noirs</option>
                <option value="nebula">💫 Nébuleuses</option>
              </select>
            </div>

            {/* Grille de templates */}
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="group relative p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-lg transition-all text-left"
                >
                  {/* Preview colors */}
                  <div className="flex gap-0.5 mb-2">
                    {template.previewColors.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ 
                          backgroundColor: color,
                          boxShadow: `0 0 8px ${color}66`,
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="text-xs font-medium text-white">
                    {template.emoji} {template.name}
                  </div>
                  <div className="text-[9px] text-slate-500 line-clamp-1">
                    {template.description}
                  </div>
                  
                  {/* Hover indicator */}
                  <div className="absolute inset-0 border-2 border-purple-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </button>
              ))}
            </div>
            
            {filteredTemplates.length === 0 && (
              <div className="text-center py-4 text-slate-500 text-xs">
                Aucun template trouvé
              </div>
            )}
          </div>
        )}

        {/* TAB: Configuration manuelle */}
        {activeTab === 'manual' && (
          <div className="space-y-1">
            {/* Type d'objet */}
            <Section id="type" title="Type d'objet céleste" icon={Layers}>
              <select
                value={config.visualStyle || 'auto'}
                onChange={(e) => onChange({ ...config, visualStyle: e.target.value === 'auto' ? undefined : e.target.value as VisualStyle })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="auto">🔄 Automatique</option>
                <option value="planet">🪐 Planète</option>
                <option value="star">⭐ Étoile</option>
                <option value="blackhole">🕳️ Trou Noir</option>
                <option value="nebula">💫 Nébuleuse</option>
              </select>
            </Section>

            {/* Options Planète */}
            {(effectiveStyle === 'planet' || config.visualStyle === 'planet') && (
              <>
                <Section id="planet-type" title="Type de planète" icon={Circle}>
                  <select
                    value={config.planetType || 'rocky'}
                    onChange={(e) => onChange({ ...config, planetType: e.target.value as PlanetType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                  >
                    <option value="rocky">🪨 Rocheuse</option>
                    <option value="gas">🌫️ Gazeuse</option>
                    <option value="ice">🧊 Glacée</option>
                    <option value="volcanic">🌋 Volcanique</option>
                    <option value="ocean">🌊 Océanique</option>
                    <option value="desert">🏜️ Désertique</option>
                    <option value="earth">🌍 Terrestre</option>
                  </select>
                </Section>

                <Section id="planet-colors" title="Couleurs" icon={Palette}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">Principale</label>
                      <input
                        type="color"
                        value={config.primaryColor || PLANET_PALETTES[config.planetType as PlanetType || 'rocky'].primary}
                        onChange={(e) => onChange({ ...config, primaryColor: e.target.value })}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">Secondaire</label>
                      <input
                        type="color"
                        value={config.secondaryColor || PLANET_PALETTES[config.planetType as PlanetType || 'rocky'].secondary}
                        onChange={(e) => onChange({ ...config, secondaryColor: e.target.value })}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </Section>

                <Section id="planet-rings" title="Anneaux" icon={Circle}>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={config.hasRings || false}
                      onChange={(e) => onChange({ ...config, hasRings: e.target.checked })}
                      className="rounded bg-slate-700 border-slate-600 text-purple-500"
                    />
                    <span className="text-xs text-slate-300">💫 Activer les anneaux</span>
                  </label>
                  
                  {config.hasRings && (
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">Couleur des anneaux</label>
                      <input
                        type="color"
                        value={config.ringColor || '#d4ac6e'}
                        onChange={(e) => onChange({ ...config, ringColor: e.target.value })}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </Section>
              </>
            )}

            {/* Options Étoile */}
            {(effectiveStyle === 'star' || config.visualStyle === 'star') && (
              <>
                <Section id="star-type" title="Type d'étoile" icon={Sun}>
                  <select
                    value={config.starType || 'yellow'}
                    onChange={(e) => onChange({ ...config, starType: e.target.value as StarType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                  >
                    <option value="yellow">☀️ Jaune (Soleil)</option>
                    <option value="red">🔴 Rouge (Géante)</option>
                    <option value="blue">🔵 Bleue (Chaude)</option>
                    <option value="white">⚪ Blanche (Naine)</option>
                    <option value="orange">🟠 Orange</option>
                    <option value="neutron">⚡ Neutron (Pulsar)</option>
                  </select>
                </Section>

                <Section id="star-effects" title="Effets" icon={Sparkles}>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] text-slate-500 flex justify-between">
                        <span>Intensité corona</span>
                        <span>{Math.round((config.coronaIntensity || 0.8) * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0.2"
                        max="2"
                        step="0.1"
                        value={config.coronaIntensity || 0.8}
                        onChange={(e) => onChange({ ...config, coronaIntensity: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 flex justify-between">
                        <span>Vitesse pulsation</span>
                        <span>{config.pulseSpeed || 2}x</span>
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="5"
                        step="0.5"
                        value={config.pulseSpeed || 2}
                        onChange={(e) => onChange({ ...config, pulseSpeed: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* Options Trou Noir */}
            {(effectiveStyle === 'blackhole' || config.visualStyle === 'blackhole') && (
              <>
                <Section id="bh-disk" title="Disque d'accrétion" icon={Moon}>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">Couleur</label>
                      <input
                        type="color"
                        value={config.accretionDiskColor || '#ff6b35'}
                        onChange={(e) => onChange({ ...config, accretionDiskColor: e.target.value })}
                        className="w-full h-8 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 flex justify-between">
                        <span>Taille horizon</span>
                        <span>{Math.round((config.eventHorizonSize || 0.4) * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0.2"
                        max="0.7"
                        step="0.05"
                        value={config.eventHorizonSize || 0.4}
                        onChange={(e) => onChange({ ...config, eventHorizonSize: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* Options Nébuleuse */}
            {config.visualStyle === 'nebula' && (
              <Section id="nebula-colors" title="Couleurs nébuleuse" icon={Sparkles}>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="color"
                      value={config.nebulaColors?.[i] || ['#4a90d9', '#9b59b6', '#3498db'][i]}
                      onChange={(e) => {
                        const colors = [...(config.nebulaColors || ['#4a90d9', '#9b59b6', '#3498db'])];
                        colors[i] = e.target.value;
                        onChange({ ...config, nebulaColors: colors });
                      }}
                      className="w-8 h-8 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Glow commun */}
            <Section id="glow" title="Intensité lumineuse" icon={Sun}>
              <div>
                <label className="text-[9px] text-slate-500 flex justify-between mb-1">
                  <span>Glow</span>
                  <span>{Math.round((config.glowIntensity || 0.5) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.1"
                  value={config.glowIntensity || 0.5}
                  onChange={(e) => onChange({ ...config, glowIntensity: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </Section>

            {/* Reset */}
            <button
              onClick={() => onChange({})}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-red-400 py-2 border border-slate-700 rounded hover:border-red-500/50 transition-colors"
            >
              <RotateCcw size={12} />
              Réinitialiser
            </button>
          </div>
        )}

        {/* TAB: Export/Import */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 mb-4">
              Exportez ou importez votre configuration visuelle pour la réutiliser sur d'autres nœuds.
            </div>
            
            <button
              onClick={exportConfig}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors"
            >
              <Download size={14} />
              Exporter la configuration
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importConfig}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <button className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors">
                <Upload size={14} />
                Importer une configuration
              </button>
            </div>

            {/* Config actuelle */}
            <div className="mt-4">
              <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">
                Configuration actuelle
              </div>
              <pre className="bg-slate-950 p-2 rounded text-[9px] text-slate-400 overflow-x-auto max-h-32">
                {JSON.stringify(effectiveConfig, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
