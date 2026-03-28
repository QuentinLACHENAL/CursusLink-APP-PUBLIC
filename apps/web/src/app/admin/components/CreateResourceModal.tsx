'use client';

import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import ExerciseBuilder from '../../../components/ExerciseBuilder';
import { SchemaExerciseBuilder } from '../../../components/exercises/schema';
import { TextFillBuilder } from '../../../components/exercises/text-fill';
import { OrderBuilder } from '../../../components/exercises/order';
import { MatchingBuilder } from '../../../components/exercises/matching';
import { AxisBuilder } from '../../../components/exercises/axis';
import { EstimationBuilder } from '../../../components/exercises/estimation';
import { CategorizationBuilder } from '../../../components/exercises/categorization';

const CATEGORIES = [
  { id: 'bases-theoriques', label: 'Bases Théoriques', icon: '📚', color: 'blue', description: 'QCM, Anatomie, Physiologie, Définitions' },
  { id: 'observation', label: 'Observation', icon: '👁️', color: 'purple', description: 'Vidéos, Photos, Placement de points' },
  { id: 'raisonnement', label: 'Raisonnement', icon: '🧠', color: 'cyan', description: 'Cas cliniques, Diagnostics, Tableaux' },
  { id: 'pratique', label: 'Pratique & Soins', icon: '🛠️', color: 'green', description: 'Médiations, Parcours, Étapes de séance' },
  { id: 'defis', label: 'Défis Ludiques', icon: '🏆', color: 'yellow', description: 'Millionnaire, Course de chevaux, Pendu' },
];

const FILIERES = [
  { id: 'standard', label: 'Standard', icon: '📋', description: 'Exercices génériques multi-filières' },
  { id: 'psychomot', label: 'Psychomotricité', icon: '🧘', description: 'Approche holistique du patient' },
];

export interface Resource {
  id: string;
  type: 'document' | 'exercise';
  name: string;
  description?: string;
  category: string;
  filiere?: 'standard' | 'psychomot';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  files?: any[];
  exerciseType?: 'qcm' | 'schema' | 'matching' | 'fill-blank' | 'order' | 'text-fill' | 'video' | 'crossword' | 'axis' | 'estimation' | 'millionaire' | 'categorization';
  exerciseData?: string;
  linkedNodes?: string[];
}

export default function CreateResourceModal({ type, onClose, onCreate, token }: {
  type: 'document' | 'exercise';
  onClose: () => void;
  onCreate: (data: Partial<Resource>) => void;
  token: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bases-theoriques');
  const [filiere, setFiliere] = useState<'standard' | 'psychomot'>('standard');
  const [tags, setTags] = useState('');
  const [exerciseType, setExerciseType] = useState<'qcm' | 'schema' | 'text-fill' | 'order' | 'matching' | 'axis' | 'estimation' | 'categorization' | 'video' | 'crossword' | 'millionaire'>('qcm');
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    setUploading(true);
    const newFiles: any[] = [];

    for (const file of Array.from(fileList)) {
      newFiles.push({
        filename: `${Date.now()}-${file.name}`,
        originalName: file.name,
        size: file.size,
        mimetype: file.type
      });
    }

    setFiles([...files, ...newFiles]);
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Le nom est requis');
      return;
    }

    if (type === 'exercise') {
      setShowBuilder(true);
    } else {
      finalizeCreation();
    }
  };

  const finalizeCreation = (exerciseData?: string) => {
    onCreate({
      name,
      description,
      category,
      filiere,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      exerciseType: type === 'exercise' ? exerciseType : undefined,
      exerciseData,
      files: type === 'document' ? files : undefined
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
        <div className="bg-[#1a1d24] rounded-xl w-full max-w-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">
              {type === 'document' ? '📄 Nouveau document' : '🎯 Nouvel exercice'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Nom *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                placeholder="Ex: QCM Anatomie du bras"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white h-20 resize-none"
                placeholder="Description optionnelle..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Filière</label>
                <select
                  value={filiere}
                  onChange={(e) => setFiliere(e.target.value as any)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {FILIERES.map(fil => (
                    <option key={fil.id} value={fil.id}>{fil.icon} {fil.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {type === 'exercise' && (
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Type d'exercice</label>
                <select
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value as any)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="qcm">📋 QCM</option>
                  <option value="schema">🖼️ Schéma à trous</option>
                  <option value="order">🔢 Ordre simple</option>
                  <option value="text-fill">✍️ Texte à trous</option>
                  <option value="matching">🔗 Associations</option>
                  <option value="axis">📊 Classement sur axe</option>
                  <option value="estimation">🎯 Estimation</option>
                  <option value="categorization">📂 Catégorisation</option>
                  <option value="video" disabled>🎥 Vidéo interactive (bientôt)</option>
                  <option value="crossword" disabled>🧩 Mots croisés (bientôt)</option>
                  <option value="millionaire" disabled>💰 Millionnaire (bientôt)</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Tags (séparés par virgule)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                placeholder="anatomie, os, membre supérieur"
              />
            </div>

            {type === 'document' && (
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Fichiers</label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 cursor-pointer hover:border-blue-500 hover:text-blue-400 transition-colors">
                  <Upload size={18} />
                  {uploading ? 'Upload en cours...' : 'Cliquez pour ajouter des fichiers'}
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        <FileText size={12} /> {f.originalName}
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-auto text-red-400">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white">
              Annuler
            </button>
            <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">
              {type === 'exercise' ? 'Configurer et Créer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>

      {showBuilder && exerciseType === 'qcm' && (
        <div className="fixed inset-0 z-[70]">
          <ExerciseBuilder
            type="qcm"
            initialData=""
            onSave={(data) => {
              finalizeCreation(data);
              setShowBuilder(false);
            }}
            onClose={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && exerciseType === 'schema' && (
        <div className="fixed inset-0 z-[70]">
          <SchemaExerciseBuilder
            nodeId="library-resource"
            nodeLabel={name}
            token={token}
            onSave={(config) => {
              finalizeCreation(JSON.stringify(config));
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
            onImageSelected={async (file) => {
               return URL.createObjectURL(file);
            }}
          />
        </div>
      )}

      {showBuilder && exerciseType === 'text-fill' && (
        <div className="fixed inset-0 z-[70]">
          <TextFillBuilder
            nodeId="library-resource"
            nodeLabel={name || 'Nouveau texte à trous'}
            initialConfig={undefined}
            onSave={(config) => {
              finalizeCreation(JSON.stringify(config));
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && exerciseType === 'order' && (
        <div className="fixed inset-0 z-[70]">
          <OrderBuilder
            nodeId="library-resource"
            nodeLabel={name || 'Nouvel ordre'}
            token={token}
            initialConfig={undefined}
            onSave={(config) => {
              finalizeCreation(JSON.stringify(config));
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && exerciseType === 'matching' && (
        <div className="fixed inset-0 z-[70]">
          <MatchingBuilder
            nodeId="library-resource"
            nodeLabel={name || 'Nouvelles associations'}
            token={token}
            initialConfig={undefined}
            onSave={(config) => {
              finalizeCreation(JSON.stringify(config));
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && exerciseType === 'axis' && (
        <div className="fixed inset-0 z-[70]">
          <AxisBuilder
            nodeId="library-resource"
            initialConfig={undefined}
            onSave={(config) => {
              finalizeCreation(JSON.stringify(config));
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && exerciseType === 'estimation' && (
        <div className="fixed inset-0 z-[70]">
          <EstimationBuilder
            nodeId="library-resource"
            initialConfig={undefined}
            onSave={(config) => {
              finalizeCreation(JSON.stringify(config));
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && exerciseType === 'categorization' && (
        <div className="fixed inset-0 z-[70]">
          <CategorizationBuilder
            nodeId="library-resource"
            onSave={(config) => {
              finalizeCreation(JSON.stringify(config));
              setShowBuilder(false);
            }}
            onCancel={() => setShowBuilder(false)}
          />
        </div>
      )}

      {showBuilder && (exerciseType === 'video' || exerciseType === 'crossword' || exerciseType === 'millionaire') && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]">
          <div className="bg-[#1a1d24] rounded-xl p-8 max-w-md text-center">
            <div className="text-5xl mb-4">🚧</div>
            <h3 className="text-xl font-bold text-white mb-2">En cours de développement</h3>
            <p className="text-gray-400 mb-4">Ce type d'exercice sera bientôt disponible.</p>
            <button
              onClick={() => setShowBuilder(false)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
