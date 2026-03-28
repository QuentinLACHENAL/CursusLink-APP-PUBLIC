'use client';

import { useState, useRef } from 'react';
import { Video, X, Plus, Trash2, Eye, Save, Play, Pause, Clock } from 'lucide-react';
import { VideoInteractiveExerciseConfig, VideoMarker } from '../types';

interface VideoBuilderProps {
  exerciseId?: string;
  nodeId: string;
  initialConfig?: VideoInteractiveExerciseConfig;
  onSave: (config: VideoInteractiveExerciseConfig) => void;
  onCancel: () => void;
}

export default function VideoBuilder({
  exerciseId,
  nodeId,
  initialConfig,
  onSave,
  onCancel
}: VideoBuilderProps) {
  const [title, setTitle] = useState(initialConfig?.title ?? '');
  const [description, setDescription] = useState(initialConfig?.description ?? '');
  const [videoUrl, setVideoUrl] = useState(initialConfig?.videoUrl ?? '');
  const [duration, setDuration] = useState<number | undefined>(initialConfig?.duration);
  
  const [markers, setMarkers] = useState<VideoMarker[]>(
    initialConfig?.markers ?? []
  );

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Formater le temps (secondes -> MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Parser le temps (MM:SS -> secondes)
  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      return mins * 60 + secs;
    }
    return parseInt(timeStr) || 0;
  };

  // Ajouter un marqueur
  const addMarker = () => {
    const newMarker: VideoMarker = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: currentTime,
      type: 'question',
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      points: 10,
      pauseVideo: true
    };
    setMarkers([...markers, newMarker].sort((a, b) => a.timestamp - b.timestamp));
  };

  // Modifier un marqueur
  const updateMarker = (id: string, field: keyof VideoMarker, value: any) => {
    setMarkers(markers.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // Modifier une option
  const updateMarkerOption = (id: string, optionIndex: number, value: string) => {
    setMarkers(markers.map(m => {
      if (m.id === id && m.options) {
        const newOptions = [...m.options];
        newOptions[optionIndex] = value;
        return { ...m, options: newOptions };
      }
      return m;
    }));
  };

  // Supprimer un marqueur
  const removeMarker = (id: string) => {
    setMarkers(markers.filter(m => m.id !== id));
  };

  // Aller à un timestamp
  const seekTo = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Valider
  const validate = (): boolean => {
    const newErrors: string[] = [];
    
    if (!title.trim()) newErrors.push('Le titre est requis');
    if (!videoUrl.trim()) newErrors.push('L\'URL de la vidéo est requise');
    if (markers.length < 1) newErrors.push('Au moins 1 marqueur est requis');
    
    markers.forEach((m, index) => {
      if (m.type === 'question') {
        if (!m.question?.trim()) {
          newErrors.push(`Le marqueur ${index + 1} doit avoir une question`);
        }
        if (!m.options || m.options.filter(o => o.trim()).length < 2) {
          newErrors.push(`Le marqueur ${index + 1} doit avoir au moins 2 options`);
        }
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Sauvegarder
  const handleSave = () => {
    if (!validate()) return;

    const totalPoints = markers
      .filter(m => m.type === 'question')
      .reduce((sum, m) => sum + m.points, 0);

    const config: VideoInteractiveExerciseConfig = {
      id: exerciseId || Math.random().toString(36).substr(2, 9),
      nodeId,
      type: 'video',
      title,
      description,
      videoUrl,
      duration,
      markers,
      totalPoints
    };

    onSave(config);
  };

  const totalPoints = markers
    .filter(m => m.type === 'question')
    .reduce((sum, m) => sum + m.points, 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="text-rose-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {exerciseId ? 'Modifier' : 'Créer'} un exercice Vidéo Interactive
                </h2>
                <p className="text-sm text-slate-400">
                  Ajoutez des questions à des moments clés de la vidéo
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Erreurs */}
          {errors.length > 0 && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <ul className="text-red-300 text-sm space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Infos générales */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Analyse d'un cas clinique"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions pour l'étudiant"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* URL Vidéo */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">URL de la vidéo *</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Formats supportés: MP4, WebM. URL YouTube non supportées (nécessite un lecteur dédié).
            </p>
          </div>

          {/* Lecteur vidéo */}
          {videoUrl && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
                <Video size={16} />
                Prévisualisation
              </h3>
              
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>

              {/* Contrôles */}
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm text-slate-400 w-12">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-slate-400 w-12">{formatTime(duration || 0)}</span>
                </div>

                <button
                  onClick={addMarker}
                  className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus size={16} />
                  Ajouter marqueur ici
                </button>
              </div>

              {/* Timeline avec marqueurs */}
              {duration && markers.length > 0 && (
                <div className="relative h-8 bg-slate-700 rounded mt-4">
                  {markers.map(marker => (
                    <button
                      key={marker.id}
                      onClick={() => seekTo(marker.timestamp)}
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-rose-500 rounded cursor-pointer hover:bg-rose-400 transition-colors"
                      style={{ left: `${(marker.timestamp / duration) * 100}%` }}
                      title={`${formatTime(marker.timestamp)} - ${marker.type}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Marqueurs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-semibold">
                Marqueurs ({markers.length})
              </h3>
            </div>

            {markers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                Aucun marqueur. Utilisez le lecteur pour ajouter des marqueurs à des moments précis.
              </div>
            ) : (
              <div className="space-y-4">
                {markers.map((marker, index) => (
                  <div
                    key={marker.id}
                    className="p-4 bg-slate-800 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <button
                        onClick={() => seekTo(marker.timestamp)}
                        className="flex items-center gap-1 px-2 py-1 bg-rose-600/30 text-rose-300 rounded text-sm hover:bg-rose-600/50"
                      >
                        <Clock size={14} />
                        {formatTime(marker.timestamp)}
                      </button>

                      <div className="flex-1 flex items-center gap-3">
                        <select
                          value={marker.type}
                          onChange={(e) => updateMarker(marker.id, 'type', e.target.value)}
                          className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        >
                          <option value="question">Question</option>
                          <option value="info">Info</option>
                        </select>

                        <label className="flex items-center gap-2 text-sm text-slate-400">
                          <input
                            type="checkbox"
                            checked={marker.pauseVideo}
                            onChange={(e) => updateMarker(marker.id, 'pauseVideo', e.target.checked)}
                            className="rounded"
                          />
                          Pause vidéo
                        </label>
                      </div>

                      <button
                        onClick={() => removeMarker(marker.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Question */}
                    <div className="mb-3">
                      <label className="block text-xs text-slate-500 mb-1">
                        {marker.type === 'question' ? 'Question' : 'Message info'}
                      </label>
                      <input
                        type="text"
                        value={marker.question || ''}
                        onChange={(e) => updateMarker(marker.id, 'question', e.target.value)}
                        placeholder={marker.type === 'question' ? 'Posez une question...' : 'Information à afficher...'}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                      />
                    </div>

                    {/* Options (si type question) */}
                    {marker.type === 'question' && (
                      <div className="grid md:grid-cols-2 gap-2 mb-3">
                        {marker.options?.map((option, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${marker.id}`}
                              checked={marker.correctAnswerIndex === optIdx}
                              onChange={() => updateMarker(marker.id, 'correctAnswerIndex', optIdx)}
                              className="text-green-500"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateMarkerOption(marker.id, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className={`flex-1 px-3 py-1.5 bg-slate-700 border rounded text-sm ${
                                marker.correctAnswerIndex === optIdx
                                  ? 'border-green-500 text-green-300'
                                  : 'border-slate-600 text-white'
                              } placeholder-slate-500`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Points (si type question) */}
                    {marker.type === 'question' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Points:</label>
                        <input
                          type="number"
                          min={1}
                          value={marker.points}
                          onChange={(e) => updateMarker(marker.id, 'points', parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
          <span className="text-sm text-slate-500">
            {markers.filter(m => m.type === 'question').length} questions • {totalPoints} points total
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
