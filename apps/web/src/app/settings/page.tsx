'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';
import { ArrowLeft, User, ShoppingBag, Save, Sparkles, Wallet, CheckCircle, Crown, Palette, Hexagon, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

export default function SettingsPage() {
  const { user: authUser, token, login } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'shop'>('profile');
  const [userData, setUserData] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  
  // Avatar State
  const [avatarMode, setAvatarMode] = useState<'generated' | 'upload'>('generated');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);

  // État pour tracker les modifications non sauvegardées
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialState, setInitialState] = useState<{
    avatarMode: 'generated' | 'upload';
    avatarSeed: string;
    customAvatar: string | null;
    bio: string;
  } | null>(null);

  useEffect(() => {
    if (!token || !authUser?.id) return;

    // Charger les données utilisateur
    fetch(`${API_BASE_URL}/users/profile/${authUser.id}`)
        .then(res => res.json())
        .then(data => {
            setUserData(data);
            
            // Détection du mode
            const isDiceBear = data.avatarUrl && data.avatarUrl.includes('api.dicebear.com');
            const detectedMode = isDiceBear ? 'generated' : 'upload';
            const detectedSeed = isDiceBear ? (data.avatarUrl.split('seed=')[1] || authUser.firstName) : '';
            const detectedCustomAvatar = isDiceBear ? null : data.avatarUrl;
            const detectedBio = data.bio || '';

            setAvatarMode(detectedMode);
            setAvatarSeed(detectedSeed);
            setCustomAvatar(detectedCustomAvatar);
            setBio(detectedBio);

            // Sauvegarder l'état initial pour détecter les changements
            setInitialState({
                avatarMode: detectedMode,
                avatarSeed: detectedSeed,
                customAvatar: detectedCustomAvatar,
                bio: detectedBio
            });

            setLoading(false);
        });

    // Charger le catalogue (Sécurisé)
    fetch(`${API_BASE_URL}/shop/catalog`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setCatalog(data);
            } else {
                setCatalog([]);
            }
        })
        .catch(() => setCatalog([]));

  }, [token, authUser]);

  // Détecter les modifications non sauvegardées
  useEffect(() => {
    if (!initialState) return;

    const hasChanges =
      avatarMode !== initialState.avatarMode ||
      avatarSeed !== initialState.avatarSeed ||
      customAvatar !== initialState.customAvatar ||
      bio !== initialState.bio;

    setHasUnsavedChanges(hasChanges);
  }, [avatarMode, avatarSeed, customAvatar, bio, initialState]);

  /**
   * Redimensionne et compresse une image pour respecter la limite de taille
   */
  const resizeImage = (file: File, maxSize: number = 100000): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Taille max du canvas (200x200 pour un avatar)
        const MAX_DIMENSION = 200;
        let { width, height } = img;

        // Redimensionner proportionnellement
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Compresser en réduisant la qualité si nécessaire
        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);

        // Réduire la qualité jusqu'à ce que la taille soit acceptable
        while (result.length > maxSize * 1.37 && quality > 0.1) { // 1.37 = ratio base64
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      };

      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));

      // Charger l'image depuis le fichier
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Toujours redimensionner/compresser l'image
      const resizedImage = await resizeImage(file);
      setCustomAvatar(resizedImage);
    } catch (error) {
      alert('Erreur lors du traitement de l\'image.');
      console.error(error);
    }
  };

  const saveProfile = async () => {
    let newAvatarUrl = userData.avatarUrl;

    if (avatarMode === 'generated') {
        newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;
    } else if (avatarMode === 'upload' && customAvatar) {
        newAvatarUrl = customAvatar;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ avatarUrl: newAvatarUrl, bio })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur ${response.status}`);
        }

        alert('Profil sauvegardé !');
        setUserData({...userData, avatarUrl: newAvatarUrl, bio});
        login(token!, { ...authUser, avatarUrl: newAvatarUrl });

        // Réinitialiser l'état initial pour désactiver le bouton
        setInitialState({
            avatarMode,
            avatarSeed,
            customAvatar,
            bio
        });
        setHasUnsavedChanges(false);
    } catch (error: any) {
        console.error('Erreur sauvegarde:', error);
        alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const buyItem = (item: any) => {
    if (!confirm(`Acheter ${item.name} pour ${item.price} Crédits ?`)) return;

    fetch(`${API_BASE_URL}/shop/buy`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: item.id })
    })
    .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        alert(`Achat réussi !`);
        setUserData({ ...userData, credits: data.newCredits, inventory: data.inventory });
    })
    .catch(err => alert(err.message));
  };

  const equipItem = (item: any) => {
    const updatePayload: any = {};
    if (item.type === 'title') updatePayload.title = item.value;
    if (item.type === 'nameColor') updatePayload.nameColor = item.value;
    if (item.type === 'avatarBorder') updatePayload.avatarBorder = item.value;

    fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
    }).then(() => {
        setUserData({ ...userData, ...updatePayload });
        alert('Équipé !');
    });
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement...</div>;

  const inventoryIds = userData.inventory || [];
  
  // Preview dynamique
  const previewAvatar = avatarMode === 'generated' 
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`
    : (customAvatar || userData.avatarUrl);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.push('/')}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <User className="text-blue-500" />
                    Mon Espace
                </h1>
            </div>

            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'profile' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <User size={16} /> Profil
                </button>
                <button
                    onClick={() => setActiveTab('shop')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'shop' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <ShoppingBag size={16} /> Boutique
                </button>
            </div>
        </div>

        {/* --- ONGLET PROFIL --- */}
        {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left duration-500">
                
                {/* Carte d'Identité (Preview) */}
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-900/20 to-transparent"></div>
                    
                    {/* Avatar Preview */}
                    <div className={`w-32 h-32 rounded-full overflow-hidden bg-slate-800 mb-4 relative z-10 ${userData.avatarBorder || 'border-4 border-slate-700'}`}>
                        <img 
                            src={previewAvatar} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Nom avec Couleur Active */}
                    <h2 className={`text-2xl font-black mb-1 ${userData.nameColor || 'text-white'}`}>
                        {userData.firstName} {userData.lastName}
                    </h2>

                    {/* Titre Actif */}
                    {userData.title ? (
                        <span className="bg-yellow-900/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-yellow-900/50 mb-4">
                            {userData.title}
                        </span>
                    ) : (
                        <span className="text-slate-500 text-xs uppercase tracking-widest mb-4">
                            {userData.role === 'ADMIN' ? 'Administrateur' : userData.role === 'PROF' ? 'Professeur' : 'Étudiant'}
                        </span>
                    )}

                    {/* Bio */}
                    <p className="text-center text-slate-400 text-sm italic mb-6">
                        "{bio || 'Pas de bio...'}"
                    </p>

                    <div className="w-full grid grid-cols-2 gap-4 text-center">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="text-xs text-slate-500 uppercase font-bold">Niveau</div>
                            <div className="text-xl font-mono font-bold text-white">{userData.level}</div>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="text-xs text-slate-500 uppercase font-bold">Crédits</div>
                            <div className="text-xl font-mono font-bold text-yellow-400 flex items-center justify-center gap-1">
                                {userData.credits} <Wallet size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Formulaire d'Édition */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Sparkles className="text-yellow-500" /> Modifier l'Avatar
                        </h3>

                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setAvatarMode('generated')}
                                className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${avatarMode === 'generated' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                            >
                                <RefreshCw size={18} /> Générateur
                            </button>
                            <button
                                onClick={() => setAvatarMode('upload')}
                                className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${avatarMode === 'upload' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                            >
                                <Upload size={18} /> Upload
                            </button>
                        </div>

                        {avatarMode === 'generated' ? (
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Seed (Texte magique)</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        value={avatarSeed}
                                        onChange={(e) => setAvatarSeed(e.target.value)}
                                        placeholder="Tapez n'importe quoi..."
                                    />
                                    <button 
                                        onClick={() => setAvatarSeed(Math.random().toString(36))}
                                        className="px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-colors"
                                    >
                                        Aléatoire
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Image (redimensionnée automatiquement)</label>
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-950 hover:bg-slate-900 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <ImageIcon className="w-8 h-8 mb-3 text-slate-500" />
                                            <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Cliquez pour upload</span></p>
                                            <p className="text-xs text-slate-600">PNG, JPG, WEBP</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <User className="text-green-500" /> Bio & Infos
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">À propos de moi</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none resize-none h-24"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Racontez votre histoire..."
                                />
                            </div>

                        </div>
                    </div>

                    {/* Inventaire / Équipement */}
                    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <ShoppingBag className="text-purple-500" /> Vos Équipements
                        </h3>
                        
                        {inventoryIds.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 italic">
                                Votre inventaire est vide. Allez faire un tour à la boutique !
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {catalog.filter(i => inventoryIds.includes(i.id)).map(item => (
                                    <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400">
                                                {item.type === 'title' && <Crown size={20} />}
                                                {item.type === 'nameColor' && <Palette size={20} />}
                                                {item.type === 'avatarBorder' && <Hexagon size={20} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{item.name}</div>
                                                <div className="text-xs text-slate-500">{item.type}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => equipItem(item)}
                                            className="text-xs font-bold bg-slate-800 hover:bg-green-600 text-slate-300 hover:text-white px-3 py-1.5 rounded transition-colors"
                                        >
                                            Équiper
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- ONGLET SHOP --- */}
        {activeTab === 'shop' && (
            <div className="animate-in slide-in-from-right duration-500">
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl p-8 mb-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
                        <ShoppingBag size={200} />
                    </div>
                    <h2 className="text-3xl font-black mb-2">La Boutique</h2>
                    <p className="text-yellow-100 mb-6 max-w-lg">
                        Dépensez vos crédits durement gagnés pour personnaliser votre profil. 
                        Ces objets sont purement cosmétiques et montrent votre statut de vétéran.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur px-4 py-2 rounded-full border border-white/20">
                        <Wallet className="text-yellow-400" size={20} />
                        <span className="font-mono font-bold text-xl">{userData.credits} Crédits disponibles</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catalog.map((item) => {
                        const isOwned = inventoryIds.includes(item.id);
                        const canAfford = userData.credits >= item.price;

                        return (
                            <div key={item.id} className={`bg-slate-900 border ${isOwned ? 'border-green-900/50' : 'border-slate-800'} p-6 rounded-2xl flex flex-col shadow-lg transition-transform hover:-translate-y-1`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                                        {item.type === 'title' && <Crown size={24} className="text-yellow-500" />}
                                        {item.type === 'nameColor' && <Palette size={24} className="text-pink-500" />}
                                        {item.type === 'avatarBorder' && <Hexagon size={24} className="text-cyan-500" />}
                                    </div>
                                    {isOwned && <CheckCircle className="text-green-500" size={24} />}
                                </div>
                                
                                <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                                <p className="text-sm text-slate-400 mb-4 flex-1">{item.description}</p>
                                
                                {/* Aperçu visuel simple */}
                                <div className="mb-6 bg-slate-950 p-3 rounded text-center">
                                    {item.type === 'title' && <span className="bg-yellow-900/20 text-yellow-500 px-2 py-0.5 rounded text-xs font-bold border border-yellow-900/50">{item.value}</span>}
                                    {item.type === 'nameColor' && <span className={`${item.value} font-bold`}>Pseudo Preview</span>}
                                    {item.type === 'avatarBorder' && <div className={`w-8 h-8 rounded-full bg-slate-800 mx-auto ${item.value}`}></div>}
                                </div>

                                <button
                                    onClick={() => buyItem(item)}
                                    disabled={isOwned || !canAfford}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                                        isOwned 
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : canAfford 
                                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                    }`}
                                >
                                    {isOwned ? 'Possédé' : (
                                        <>
                                            Acheter {item.price} <Wallet size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

      </div>

      {/* Bouton de sauvegarde flottant - visible uniquement si modifications */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <button
            onClick={saveProfile}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-full font-bold text-white shadow-2xl shadow-green-500/30 flex items-center gap-3 transition-all hover:scale-105 animate-pulse"
          >
            <Save size={20} />
            Sauvegarder les changements
          </button>
        </div>
      )}
    </div>
  );
}