'use client';

import { useState, useRef } from 'react';
import { X, Save, Image as ImageIcon, FileText } from 'lucide-react';

interface SimpleCourseEditorProps {
  initialContent: string;
  onSave: (content: string, files: Map<string, File>) => void;
  onClose: () => void;
}

export default function SimpleCourseEditor({ initialContent, onSave, onClose }: SimpleCourseEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [filesMap, setFilesMap] = useState<Map<string, File>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) return;

      const blobUrl = URL.createObjectURL(file);
      
      // Store mapping
      const newMap = new Map(filesMap);
      newMap.set(blobUrl, file);
      setFilesMap(newMap);

      // Insert markdown
      const markdownImage = `
![${file.name}](${blobUrl})
`;
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newText = content.substring(0, start) + markdownImage + content.substring(end);
      setContent(newText);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-[#1a1d24] w-full max-w-4xl h-[80vh] rounded-xl border border-white/10 flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151820] rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Éditeur de Cours</h2>
              <p className="text-xs text-gray-400">Rédigez votre contenu et glissez des images</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 bg-[#0d0f12]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="w-full h-full bg-transparent text-gray-200 font-mono text-sm resize-none focus:outline-none"
            placeholder="# Introduction au cours..."
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#151820] rounded-b-xl flex justify-between items-center">
          <div className="text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <ImageIcon size={14} />
              {filesMap.size} image(s) en attente d'upload
            </span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm">
              Annuler
            </button>
            <button 
              onClick={() => onSave(content, filesMap)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold flex items-center gap-2"
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
