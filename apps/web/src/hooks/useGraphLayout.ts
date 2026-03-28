import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface GraphLayoutProps {
  token: string | null;
}

export function useGraphLayout({ token }: GraphLayoutProps) {
  const [currentLayout, setCurrentLayout] = useState<any[]>([]);
  const [bgUrl, setBgUrl] = useState('');
  const [bgScale, setBgScale] = useState(100);
  const [bgOffsetX, setBgOffsetX] = useState(0);
  const [bgOffsetY, setBgOffsetY] = useState(0);
  const [imgLibrary, setImgLibrary] = useState<string[]>([]);
  const [moveMode, setMoveMode] = useState<'single' | 'group'>('single');

  // Load config on mount
  useEffect(() => {
    if (!token) return;
    api.get<{value: string}>('settings/GRAPH_BACKGROUND', token).then(data => setBgUrl(data.value || '')).catch(() => {});
    api.get<{value: string}>('settings/GRAPH_BACKGROUND_SCALE', token).then(data => setBgScale(parseInt(data.value) || 100)).catch(() => {});
    api.get<{value: string}>('settings/GRAPH_BACKGROUND_OFFSET_X', token).then(data => setBgOffsetX(parseInt(data.value) || 0)).catch(() => {});
    api.get<{value: string}>('settings/GRAPH_BACKGROUND_OFFSET_Y', token).then(data => setBgOffsetY(parseInt(data.value) || 0)).catch(() => {});
    api.get<{value: string}>('settings/GRAPH_IMAGES_LIBRARY', token).then(data => setImgLibrary(JSON.parse(data.value || '[]'))).catch(() => {});
  }, [token]);

  const saveLayout = () => {
    if (!currentLayout.length) return alert('Déplacez des nœuds d\'abord');
    api.post<any>('graph/positions', { positions: currentLayout }, token)
      .then(() => alert('Positions sauvegardées !'))
      .catch(err => alert('Erreur lors de la sauvegarde: ' + err.message));
  };

  const saveBackgroundConfig = () => {
    api.post('settings/GRAPH_BACKGROUND', { value: bgUrl }, token);
    api.post('settings/GRAPH_BACKGROUND_SCALE', { value: bgScale.toString() }, token);
    api.post('settings/GRAPH_BACKGROUND_OFFSET_X', { value: bgOffsetX.toString() }, token);
    api.post('settings/GRAPH_BACKGROUND_OFFSET_Y', { value: bgOffsetY.toString() }, token);
    if (bgUrl && !imgLibrary.includes(bgUrl)) {
        const newLib = [...imgLibrary, bgUrl];
        setImgLibrary(newLib);
        api.post('settings/GRAPH_IMAGES_LIBRARY', { value: JSON.stringify(newLib) }, token);
    }
    alert('Configuration du fond sauvegardée !');
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setBgUrl(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  const removeBackground = () => {
    setBgUrl('');
    api.post('settings/GRAPH_BACKGROUND', { value: '' }, token);
    alert('Fond supprimé !');
  };

  return {
    currentLayout,
    setCurrentLayout,
    bgUrl,
    setBgUrl,
    bgScale,
    setBgScale,
    bgOffsetX,
    setBgOffsetX,
    bgOffsetY,
    setBgOffsetY,
    imgLibrary,
    moveMode,
    setMoveMode,
    saveLayout,
    saveBackgroundConfig,
    handleBgUpload,
    removeBackground
  };
}
