'use client';

import { useRef, useCallback, useState } from 'react';
import { 
  HelpCircle, Check, XIcon, Plus, MousePointer
} from 'lucide-react';
import { SchemaBlock, ExerciseMode } from '../types';

interface SchemaCanvasProps {
  imageUrl: string;
  blocks: SchemaBlock[];
  mode: 'builder' | 'player' | 'evaluator';
  exerciseMode?: ExerciseMode; // 'drag-drop' | 'free-input'
  
  // State shared
  zoom?: number;
  selectedBlockId?: string | null;
  
  // Builder specific
  onBlockSelect?: (id: string) => void;
  onBlockMouseDown?: (e: React.MouseEvent, blockId: string, point: {x: number, y: number}) => void; // New prop for dragging
  onDrawStart?: (point: { x: number; y: number }) => void;
  onDrawMove?: (point: { x: number; y: number }) => void;
  onDrawEnd?: () => void;
  isDrawing?: boolean;
  tempBlock?: Partial<SchemaBlock> | null;
  tool?: 'select' | 'draw';
  
  // Player specific
  answers?: Record<string, string>;
  onAnswerChange?: (blockId: string, value: string) => void;
  onRemoveAnswer?: (blockId: string) => void;
  dragOverBlockId?: string | null;
  onDragOver?: (e: React.DragEvent, blockId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (blockId: string) => void;
  showHints?: boolean;
  
  // Evaluator specific
  evaluations?: Record<string, { correct: boolean; points: number }>;
}

export default function SchemaCanvas({
  imageUrl,
  blocks,
  mode,
  exerciseMode = 'drag-drop',
  zoom = 100,
  selectedBlockId,
  onBlockSelect,
  onBlockMouseDown,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  isDrawing = false,
  tempBlock,
  tool = 'select',
  answers = {},
  onAnswerChange,
  onRemoveAnswer,
  dragOverBlockId,
  onDragOver,
  onDragLeave,
  onDrop,
  showHints = false,
  evaluations
}: SchemaCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  // Conversion coordonnées écran -> pourcentage
  const screenToPercent = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'builder') return;
    if (e.button !== 0) return;
    const point = screenToPercent(e.clientX, e.clientY);
    onDrawStart?.(point);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode !== 'builder') return;
    const point = screenToPercent(e.clientX, e.clientY);
    onDrawMove?.(point);
  };

  const handleMouseUp = () => {
    if (mode !== 'builder') return;
    onDrawEnd?.();
  };

  return (
    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0d0f12]">
      <div
        ref={canvasRef}
        className={`relative select-none ${mode === 'builder' ? 'cursor-crosshair' : ''}`}
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt="Schéma"
          className="max-w-full max-h-[75vh] rounded-lg shadow-xl"
          draggable={false}
        />
        
        {/* Blocs */}
        {blocks.map((block, index) => {
          const isSelected = selectedBlockId === block.id;
          const userAnswer = answers[block.id];
          const evaluation = evaluations?.[block.id];
          
          // Styles de base communs (Positionnement)
          const baseStyle = {
            left: `${block.x}%`,
            top: `${block.y}%`,
            width: `${block.width}%`,
            height: `${block.height}%`,
            minWidth: '60px',
            minHeight: '24px'
          };

          // Styles spécifiques au mode
          let className = "absolute rounded transition-all shadow-sm bg-white ";
          
          if (mode === 'builder') {
             // Builder: Blanc opaque, hover transparent, bordures grises ou bleues
             className += `cursor-pointer hover:opacity-50 ${
               isSelected 
                ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500' 
                : 'border-gray-400 hover:border-gray-300'
             } border-2`;
          } else if (mode === 'player') {
             // Player: Blanc opaque, styles d'interaction
             if (exerciseMode === 'drag-drop') {
               if (dragOverBlockId === block.id) className += 'bg-blue-50 border-2 border-blue-400';
               else if (userAnswer) className += 'bg-white border-2 border-green-500';
               else className += 'bg-white border-2 border-dashed border-gray-400';
             } else {
               // free-input
               className += 'bg-white border-2 border-gray-300';
             }
          } else if (mode === 'evaluator') {
             // Evaluator: Blanc opaque, bordures vertes/rouges
             className += isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#0d0f12] ' : '';
             className += evaluation?.correct 
               ? 'border-2 border-green-500' 
               : 'border-2 border-red-500';
          }

          return (
            <div
              key={block.id}
              className={className}
              style={baseStyle}
              onMouseDown={(e) => {
                if (mode === 'builder') {
                  e.stopPropagation();
                  const point = screenToPercent(e.clientX, e.clientY);
                  onBlockMouseDown?.(e, block.id, point);
                }
              }}
              onClick={(e) => {
                if (mode === 'evaluator') {
                  e.stopPropagation();
                  onBlockSelect?.(block.id);
                }
              }}
              onDragOver={(e) => {
                if (mode === 'player' && exerciseMode === 'drag-drop') {
                  onDragOver?.(e, block.id);
                }
              }}
              onDragLeave={onDragLeave}
              onDrop={() => {
                if (mode === 'player' && exerciseMode === 'drag-drop') {
                  onDrop?.(block.id);
                }
              }}
            >
              {/* Contenu Builder */}
              {mode === 'builder' && (
                <>
                  <div className="absolute top-1 right-1 text-[8px] font-bold text-gray-500 bg-gray-100/80 px-1 rounded whitespace-nowrap z-10">
                    #{index + 1}
                  </div>
                  {block.answer && (
                    <div className="w-full h-full flex items-center justify-center p-1 text-center">
                      <span className="text-[10px] font-medium text-black truncate w-full" title={block.answer}>
                        {block.answer}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Contenu Player */}
              {mode === 'player' && (
                <>
                  <div className="absolute -top-5 left-0 flex items-center gap-1 z-20">
                    {showHints && block.hint && (
                      <button
                        onClick={() => setActiveHint(activeHint === block.id ? null : block.id)}
                        className="text-yellow-400 hover:text-yellow-300 bg-gray-900/90 rounded-full p-0.5"
                      >
                        <HelpCircle size={14} />
                      </button>
                    )}
                  </div>
                  
                  {activeHint === block.id && block.hint && (
                    <div className="absolute -top-12 left-0 right-0 text-[10px] text-yellow-300 bg-yellow-900/90 px-2 py-1 rounded z-30">
                      💡 {block.hint}
                    </div>
                  )}

                  {exerciseMode === 'free-input' ? (
                    <input
                      type="text"
                      value={userAnswer || ''}
                      onChange={(e) => onAnswerChange?.(block.id, e.target.value)}
                      className="w-full h-full bg-transparent text-black text-center text-sm px-1 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="..."
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {userAnswer ? (
                        <div 
                          className="bg-blue-600 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-blue-700 flex items-center gap-1 truncate max-w-full"
                          onClick={() => onRemoveAnswer?.(block.id)}
                          title="Cliquer pour retirer"
                        >
                          <span className="truncate">{userAnswer}</span>
                          <XIcon size={10} className="shrink-0" />
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">Glisser</span>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Contenu Evaluator */}
              {mode === 'evaluator' && (
                <>
                  <div className={`absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-20 ${
                    evaluation?.correct ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {evaluation?.correct ? <Check size={12} className="text-white" /> : <XIcon size={12} className="text-white" />}
                  </div>
                  
                  <div className="absolute -top-5 left-0 text-[10px] font-bold text-white bg-gray-900/90 px-1.5 py-0.5 rounded z-10">
                    #{index + 1}
                  </div>

                  <div className="w-full h-full flex items-center justify-center p-1">
                    <span className={`text-xs font-medium truncate ${userAnswer ? 'text-black' : 'text-gray-400 italic'}`}>
                      {userAnswer || '(vide)'}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Bloc temporaire (Builder) */}
        {mode === 'builder' && isDrawing && tempBlock && tempBlock.width && tempBlock.height && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
            style={{
              left: `${tempBlock.x}%`,
              top: `${tempBlock.y}%`,
              width: `${tempBlock.width}%`,
              height: `${tempBlock.height}%`
            }}
          />
        )}
      </div>
    </div>
  );
}
