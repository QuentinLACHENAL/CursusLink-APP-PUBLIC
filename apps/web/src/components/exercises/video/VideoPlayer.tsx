'use client';

import { useState, useRef, useEffect } from 'react';
import { Video, X, Play, Pause, Check, XCircle, Clock, Info } from 'lucide-react';
import { VideoInteractiveExerciseConfig, VideoMarker } from '../types';

interface VideoPlayerProps {
  config: VideoInteractiveExerciseConfig;
  studentId: string;
  studentName: string;
  onSubmit: (submission: VideoSubmission) => void;
  onCancel: () => void;
}

export interface VideoSubmission {
  id: string;
  exerciseId: string;
  studentId: string;
  studentName: string;
  answers: { markerId: string; answerIndex: number; isCorrect: boolean }[];
  submittedAt: string;
  status: 'pending' | 'evaluated';
  score?: number;
  maxScore: number;
}

export default function VideoPlayer({
  config,
  studentId,
  studentName,
  onSubmit,
  onCancel
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  
  // État des marqueurs
  const [activeMarker, setActiveMarker] = useState<VideoMarker | null>(null);
  const [answeredMarkers, setAnsweredMarkers] = useState<Record<string, number>>({});
  const [markerResults, setMarkerResults] = useState<Record<string, boolean>>({});
  const [showInfo, setShowInfo] = useState<VideoMarker | null>(null);
  
  const [finished, setFinished] = useState(false);

  // Formater le temps
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle time update - vérifier les marqueurs
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Vérifier si on atteint un marqueur non encore traité
    for (const marker of config.markers) {
      const alreadyAnswered = answeredMarkers[marker.id] !== undefined;
      const isActive = activeMarker?.id === marker.id;
      
      if (!alreadyAnswered && !isActive && Math.abs(time - marker.timestamp) < 0.5) {
        if (marker.pauseVideo) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
        
        if (marker.type === 'question') {
          setActiveMarker(marker);
        } else {
          setShowInfo(marker);
        }
        break;
      }
    }
  };

  // Répondre à une question
  const handleAnswer = (answerIndex: number) => {
    if (!activeMarker) return;

    const isCorrect = answerIndex === activeMarker.correctAnswerIndex;
    
    setAnsweredMarkers(prev => ({
      ...prev,
      [activeMarker.id]: answerIndex
    }));
    
    setMarkerResults(prev => ({
      ...prev,
      [activeMarker.id]: isCorrect
    }));

    // Fermer après 1.5s et reprendre la vidéo
    setTimeout(() => {
      setActiveMarker(null);
      if (videoRef.current && !finished) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }, 1500);
  };

  // Fermer info et continuer
  const dismissInfo = () => {
    if (!showInfo) return;
    
    setShowInfo(null);
    
    // Marquer comme vu
    setAnsweredMarkers(prev => ({
      ...prev,
      [showInfo.id]: -1 // -1 = vu (info, pas de réponse)
    }));

    if (videoRef.current && !finished) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle video end
  const handleEnded = () => {
    setIsPlaying(false);
    setFinished(true);
  };

  // Calculer le score et soumettre
  const handleSubmit = () => {
    const questionMarkers = config.markers.filter(m => m.type === 'question');
    const answers = questionMarkers.map(marker => ({
      markerId: marker.id,
      answerIndex: answeredMarkers[marker.id] ?? -1,
      isCorrect: markerResults[marker.id] ?? false
    }));

    const score = questionMarkers.reduce((sum, marker) => {
      return sum + (markerResults[marker.id] ? marker.points : 0);
    }, 0);

    const submission: VideoSubmission = {
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: config.id,
      studentId,
      studentName,
      answers,
      submittedAt: new Date().toISOString(),
      status: 'evaluated',
      score,
      maxScore: config.totalPoints
    };

    onSubmit(submission);
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current || activeMarker || showInfo) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const questionMarkers = config.markers.filter(m => m.type === 'question');
  const answeredCount = Object.keys(answeredMarkers).filter(id => 
    questionMarkers.some(m => m.id === id)
  ).length;
  const correctCount = Object.values(markerResults).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="text-rose-400" size={24} />
              <div>
                <h2 className="text-lg font-bold text-white">{config.title}</h2>
                {config.description && (
                  <p className="text-sm text-slate-400">{config.description}</p>
                )}
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Vidéo */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            src={config.videoUrl}
            className="w-full h-full object-contain"
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          />

          {/* Overlay question */}
          {activeMarker && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-lg w-full">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-rose-400" />
                  <span className="text-sm text-slate-400">
                    {formatTime(activeMarker.timestamp)}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">
                  {activeMarker.question}
                </h3>

                <div className="space-y-2">
                  {activeMarker.options?.map((option, index) => {
                    const isAnswered = answeredMarkers[activeMarker.id] !== undefined;
                    const isSelected = answeredMarkers[activeMarker.id] === index;
                    const isCorrect = index === activeMarker.correctAnswerIndex;
                    const showResult = isAnswered;

                    return (
                      <button
                        key={index}
                        onClick={() => !isAnswered && handleAnswer(index)}
                        disabled={isAnswered}
                        className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                          showResult
                            ? isCorrect
                              ? 'bg-green-500/30 border-2 border-green-500'
                              : isSelected
                                ? 'bg-red-500/30 border-2 border-red-500'
                                : 'bg-slate-700 border border-slate-600 opacity-50'
                            : 'bg-slate-700 border border-slate-600 hover:border-rose-500'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          showResult && isCorrect
                            ? 'bg-green-500 text-white'
                            : showResult && isSelected
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-600 text-slate-300'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-white">{option}</span>
                        {showResult && isCorrect && <Check size={18} className="ml-auto text-green-400" />}
                        {showResult && isSelected && !isCorrect && <XCircle size={18} className="ml-auto text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Overlay info */}
          {showInfo && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8">
              <div className="bg-blue-900/50 rounded-xl border border-blue-500 p-6 max-w-lg w-full">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={20} className="text-blue-400" />
                  <span className="text-blue-300 font-medium">Information</span>
                </div>
                
                <p className="text-white text-lg mb-4">
                  {showInfo.question}
                </p>

                <button
                  onClick={dismissInfo}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-700">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              disabled={!!activeMarker || !!showInfo}
              className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <span className="text-sm text-slate-400 w-12">{formatTime(currentTime)}</span>
            
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full"
                disabled={!!activeMarker || !!showInfo}
              />
              
              {/* Marqueurs sur la timeline */}
              {config.markers.map(marker => {
                const isQuestion = marker.type === 'question';
                const isAnswered = answeredMarkers[marker.id] !== undefined;
                const isCorrect = markerResults[marker.id];

                return (
                  <div
                    key={marker.id}
                    className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transform -translate-x-1/2 ${
                      isAnswered
                        ? isQuestion
                          ? isCorrect ? 'bg-green-500' : 'bg-red-500'
                          : 'bg-blue-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ left: `${(marker.timestamp / duration) * 100}%` }}
                  />
                );
              })}
            </div>
            
            <span className="text-sm text-slate-400 w-12">{formatTime(duration)}</span>
          </div>

          {/* Progression */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Questions: {answeredCount}/{questionMarkers.length} • 
              <span className="text-green-400 ml-1">{correctCount} correct</span>
            </div>

            {finished && (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                Terminer ({correctCount * 10}/{config.totalPoints} pts)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
