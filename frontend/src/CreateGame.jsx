import React, { useState, useEffect } from 'react';
import { createGame, addSongToGame, addCategoryToGame, updateSongInGame, deleteSongFromGame, renameCategoryInGame, deleteCategoryFromGame, updatePlayerInGame, addPlayerToGame } from './api';
import LyricsSelector from './LyricsSelector';
import GameSelector from './GameSelector';
import { parseLRC } from './lrcUtils';

function CreateGame({ onGameCreated }) {
  const [step, setStep] = useState(1); // 1: game name, 2: songs/categories, 3: players, 4: ready
  const [gameName, setGameName] = useState('');
  const [gameId, setGameId] = useState(null);
  const [songs, setSongs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [players, setPlayers] = useState([{ username: '', picture_url: '' }]);
  const [error, setError] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  
  // Song form state
  const [song, setSong] = useState({ 
    title: '', 
    category: '', 
    youtube_url: '', 
    spotify_id: '', 
    lrc: '', 
    hidden_line_indices: [] 
  });
  const [lrcLines, setLrcLines] = useState([]);
  const [showSongForm, setShowSongForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingSong, setEditingSong] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingPlayerIndex, setEditingPlayerIndex] = useState(null);

  // Constants for localStorage keys
  const DRAFT_KEY = 'createGameDraft';
  
  // Auto-save game creation draft
  const saveDraft = () => {
    if (step > 1 || gameName.trim()) { // Only save if we have started creating
      const draft = {
        step,
        gameName,
        songs,
        categories,
        players,
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  };

  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const draftStr = localStorage.getItem(DRAFT_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        // Check if draft is not too old (24 hours)
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          return draft;
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
    return null;
  };

  // Clear draft from localStorage
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  // Restore draft
  const restoreDraft = (draft) => {
    setStep(draft.step);
    setGameName(draft.gameName);
    setSongs(draft.songs || []);
    setCategories(draft.categories || []);
    setPlayers(draft.players || [{ username: '', picture_url: '' }]);
    setShowRestoreDialog(false);
  };

  // Check for existing draft on component mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setShowRestoreDialog(true);
    }
  }, []);

  // Auto-save whenever key state changes
  useEffect(() => {
    saveDraft();
  }, [step, gameName, songs, categories, players]);

  // Step 1: Game name
  const handleGameNameSubmit = async () => {
    if (!gameName.trim()) {
      setError('Le nom de la partie est requis.');
      return;
    }
    
    // Just move to next step - we'll create the game at the end
    setStep(2);
    setError('');
  };

  // Step 2: Song/Category management
  const handleAddSong = async () => {
    if (!song.title || !song.youtube_url || !song.lrc || song.hidden_line_indices.length === 0) {
      setError('Titre, URL YouTube, LRC et au moins une ligne cachée sont requis.');
      return;
    }
    
    try {
      let newSong;
      if (editingSong) {
        // Update existing song locally
        const updatedSong = { ...editingSong, ...song };
        setSongs(songs.map(s => s.id === editingSong.id ? updatedSong : s));
        setEditingSong(null);
      } else {
        // Add new song locally
        const songId = Date.now(); // temporary ID for local state
        // If no category is set, assign to default
        const songWithCategory = { 
          id: songId, 
          ...song, 
          category: song.category || '' 
        };
        setSongs([...songs, songWithCategory]);
      }
      
      setSong({ title: '', category: '', youtube_url: '', spotify_id: '', lrc: '', hidden_line_indices: [] });
      setLrcLines([]);
      setShowSongForm(false);
      setError('');
    } catch (error) {
      setError('Erreur lors de l\'ajout/modification de la chanson');
    }
  };

  const handleEditSong = (songToEdit) => {
    setEditingSong(songToEdit);
    // Clear fields first for better editing experience
    setSong({
      title: '',
      category: '',
      youtube_url: '',
      spotify_id: '',
      lrc: '',
      hidden_line_indices: []
    });
    setLrcLines([]);
    
    // Set the data after a small delay to allow fields to clear visually
    setTimeout(() => {
      setSong({
        title: songToEdit.title || '',
        category: songToEdit.category || '',
        youtube_url: songToEdit.youtube_url || '',
        spotify_id: songToEdit.spotify_id || '',
        lrc: songToEdit.lrc || '',
        hidden_line_indices: songToEdit.hidden_line_indices || []
      });
      if (songToEdit.lrc) {
        try {
          const parsed = parseLRC(songToEdit.lrc);
          setLrcLines(parsed);
        } catch (error) {
          console.error('Error parsing LRC:', error);
          setLrcLines([]);
        }
      }
    }, 100);
    
    setShowSongForm(true);
  };

  const handleDeleteSong = async (songId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette chanson ?')) {
      setSongs(songs.filter(s => s.id !== songId));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Le nom de la catégorie est requis.');
      return;
    }
    
    try {
      if (editingCategory) {
        // Rename existing category locally
        setCategories(categories.map(cat => cat === editingCategory ? newCategoryName : cat));
        setSongs(songs.map(song => 
          song.category === editingCategory 
            ? { ...song, category: newCategoryName }
            : song
        ));
        setEditingCategory(null);
      } else {
        // Add new category locally
        if (!categories.includes(newCategoryName)) {
          setCategories([...categories, newCategoryName]);
        }
      }
      
      setNewCategoryName('');
      setShowCategoryForm(false);
      setError('');
    } catch (error) {
      setError('Erreur lors de l\'ajout/modification de la catégorie');
    }
  };

  const handleEditCategory = (categoryName) => {
    setEditingCategory(categoryName);
    setNewCategoryName(categoryName);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (categoryName) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie et toutes ses chansons ?')) {
      setCategories(categories.filter(cat => cat !== categoryName));
      setSongs(songs.filter(song => song.category !== categoryName));
    }
  };

  // Handle LRC content changes
  const handleLrcChange = (content) => {
    setSong(s => ({ ...s, lrc: content }));
    try {
      const parsed = parseLRC(content);
      setLrcLines(parsed);
    } catch (error) {
      console.error('Error parsing LRC:', error);
      setLrcLines([]);
    }
  };

  // Auto-fetch LRC from Spotify ID
  const handleSpotifyIdChange = async (spotifyId) => {
    setSong(s => ({ ...s, spotify_id: spotifyId }));
    
    if (spotifyId.trim() && spotifyId.length > 10) {
      try {
        // Try to fetch LRC from lyricsify API
        const response = await fetch(`http://127.0.0.1:4000/lyrics/${spotifyId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.lrc) {
            handleLrcChange(data.lrc);
            setError(''); // Clear any previous errors
          }
        }
      } catch (error) {
        // Fail silently - the lyricsify service might not be running
        console.log('Lyricsify service not available:', error);
      }
    }
  };

  const handleToggleHidden = idx => {
    setSong(s => {
      const arr = s.hidden_line_indices.includes(idx)
        ? s.hidden_line_indices.filter(i => i !== idx)
        : [...s.hidden_line_indices, idx];
      return { ...s, hidden_line_indices: arr };
    });
  };

  // Step 3: Player management
  const handleAddPlayer = () => {
    setPlayers([...players, { username: '', picture_url: '' }]);
  };

  const handlePlayerChange = (i, field, value) => {
    const arr = [...players];
    arr[i] = { ...arr[i], [field]: value };
    setPlayers(arr);
    setEditingPlayerIndex(null);
  };

  const handleRemovePlayer = (index) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const handleEditPlayer = (index) => {
    setEditingPlayerIndex(index);
  };

  const handlePlayersSubmit = async () => {
    const filtered = players.filter(p => p.username.trim()).map(p => ({ ...p, username: p.username.trim() }));
    if (filtered.length === 0) {
      setError('Ajoutez au moins un joueur.');
      return;
    }
    
    // Create the game with all data
    const categoriesFromSongs = [...new Set(songs.map(s => s.category || 'Sans catégorie'))];
    const allCategories = [...new Set([...categories, ...categoriesFromSongs])];
    
    const gameData = { 
      name: gameName, 
      player_names: filtered.map(p => p.username),
      songs: songs.map(s => ({
        title: s.title,
        category: s.category || 'Sans catégorie',
        youtube_url: s.youtube_url,
        spotify_id: s.spotify_id || '',
        lrc: s.lrc,
        hidden_line_indices: s.hidden_line_indices
      })),
      categories: allCategories
    };
    
    try {
      const createdGame = await createGame(gameData);
      setGameId(createdGame.id);
      setStep(4);
      setError('');
      // Clear the draft when game is successfully created
      clearDraft();
    } catch (error) {
      setError('Erreur lors de la création de la partie');
    }
  };

  if (step === 1) {
    return (
      <div className="container">
        <div className="card" style={{ 
          maxWidth: '500px', 
          margin: '40px auto',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="card-header">
            <h2 className="text-primary mb-0">🎵 Créer une partie</h2>
          </div>
          <div className="card-body">
            <h3 className="mb-3">Nom de la partie</h3>
            <input 
              placeholder="Entrez le nom de la partie" 
              value={gameName} 
              onChange={e => setGameName(e.target.value)}
              className="mb-3"
            />
            <button 
              onClick={handleGameNameSubmit}
              className="btn-primary w-full"
              style={{ fontSize: '1.1rem' }}
            >
              Suivant →
            </button>
            {error && <div style={{ color: 'var(--error-color)', marginTop: '16px', padding: '12px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={{ maxWidth: 1200, margin: '40px auto', padding: '20px' }}>
        <h2>Gérer les chansons et catégories - {gameName}</h2>
        
        <div style={{ display: 'flex', gap: '40px', minHeight: '600px' }}>
          {/* Songs Column */}
          <div style={{ flex: 1, border: '2px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Chansons ({songs.length})</h3>
              <button 
                onClick={() => setShowSongForm(true)}
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                + Ajouter une chanson
              </button>
            </div>
            
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {songs.filter(s => !s.category).map(s => (
                <div 
                  key={s.id} 
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify(s));
                  }}
                  style={{ 
                    border: '1px solid #eee', 
                    borderRadius: '4px', 
                    padding: '12px', 
                    marginBottom: '8px',
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'grab'
                  }}
                  onMouseDown={(e) => e.target.style.cursor = 'grabbing'}
                  onMouseUp={(e) => e.target.style.cursor = 'grab'}
                >
                  <div>
                    <strong>{s.title || 'Sans titre'}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>🎵 Glissez dans une catégorie</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleEditSong(s)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteSong(s.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🗑️ Suppr.
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Show categorized songs in a disabled state */}
              {songs.filter(s => s.category).map(s => (
                <div key={s.id} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '4px', 
                  padding: '12px', 
                  marginBottom: '8px',
                  backgroundColor: '#f5f5f5',
                  opacity: 0.6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{s.title || 'Sans titre'}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>📂 Dans "{s.category}"</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => {
                        // Remove from category
                        setSongs(songs.map(song => 
                          song.id === s.id ? { ...song, category: '' } : song
                        ));
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📤 Retirer
                    </button>
                    <button
                      onClick={() => handleEditSong(s)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteSong(s.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🗑️ Suppr.
                    </button>
                  </div>
                </div>
              ))}
              
              {songs.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666',
                  fontStyle: 'italic',
                  padding: '40px 20px',
                  border: '2px dashed #ddd',
                  borderRadius: '8px'
                }}>
                  Aucune chanson ajoutée
                </div>
              )}
            </div>
          </div>

          {/* Categories Column */}
          <div style={{ flex: 1, border: '2px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Catégories ({categories.length})</h3>
              <button 
                onClick={() => setShowCategoryForm(true)}
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                + Ajouter une catégorie
              </button>
            </div>
            
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {categories.map(cat => {
                const categorySongs = songs.filter(s => s.category === cat);
                return (
                  <div 
                    key={cat} 
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = '#e3f2fd';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f8ff';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = '#f0f8ff';
                      try {
                        const songData = JSON.parse(e.dataTransfer.getData('text/plain'));
                        // Assign song to this category
                        setSongs(songs.map(song => 
                          song.id === songData.id ? { ...song, category: cat } : song
                        ));
                      } catch (error) {
                        console.error('Error dropping song:', error);
                      }
                    }}
                    style={{ 
                      border: '1px solid #eee', 
                      borderRadius: '4px', 
                      padding: '12px', 
                      marginBottom: '8px',
                      backgroundColor: '#f0f8ff',
                      minHeight: '60px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <strong>{cat}</strong> ({categorySongs.length} chansons)
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleEditCategory(cat)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️ Renommer
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️ Suppr.
                        </button>
                      </div>
                    </div>
                    
                    {categorySongs.length === 0 ? (
                      <div style={{ 
                        fontStyle: 'italic', 
                        color: '#666', 
                        textAlign: 'center',
                        border: '2px dashed #ccc',
                        padding: '16px',
                        borderRadius: '4px'
                      }}>
                        🎵 Glissez-déposez des chansons ici
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {categorySongs.map(song => (
                          <div 
                            key={song.id}
                            style={{
                              padding: '8px',
                              backgroundColor: '#e8f5e8',
                              borderRadius: '4px',
                              fontSize: '14px',
                              border: '1px solid #c8e6c9'
                            }}
                          >
                            🎵 {song.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {categories.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666',
                  fontStyle: 'italic',
                  padding: '40px 20px',
                  border: '2px dashed #ddd',
                  borderRadius: '8px'
                }}>
                  Aucune catégorie créée
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={() => setStep(3)}
            disabled={songs.length === 0}
            style={{ 
              padding: '12px 24px',
              backgroundColor: songs.length > 0 ? '#ff9800' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: songs.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '16px'
            }}
          >
            Gérer les joueurs
          </button>
          {songs.length === 0 && (
            <div style={{ color: '#666', marginTop: '8px' }}>
              Ajoutez au moins une chanson pour continuer
            </div>
          )}
        </div>

        {/* Song Form Modal */}
        {showSongForm && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              maxWidth: '1000px',
              width: '95%',
              maxHeight: '90%',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginBottom: '20px' }}>
                {editingSong ? 'Modifier la chanson' : 'Ajouter une chanson'}
              </h3>
              
              {/* Two Column Layout */}
              <div style={{ display: 'flex', gap: '30px', minHeight: '500px' }}>
                
                {/* Left Column - Song Information */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '16px', color: '#2196f3' }}>📝 Informations de la chanson</h4>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Titre *</label>
                    <input 
                      placeholder="Titre de la chanson" 
                      value={song.title} 
                      onChange={e => setSong({ ...song, title: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>URL YouTube *</label>
                    <input 
                      placeholder="https://www.youtube.com/watch?v=..." 
                      value={song.youtube_url} 
                      onChange={e => setSong({ ...song, youtube_url: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  {/* YouTube Preview */}
                  {song.youtube_url && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#e53e3e' }}>🎬 Aperçu vidéo</label>
                      <div style={{ 
                        border: '2px solid #ddd', 
                        borderRadius: '6px', 
                        overflow: 'hidden',
                        backgroundColor: '#f5f5f5'
                      }}>
                        {(() => {
                          const videoId = song.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                          return videoId ? (
                            <iframe
                              width="100%"
                              height="200"
                              src={`https://www.youtube.com/embed/${videoId[1]}`}
                              title="YouTube video preview"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <div style={{ 
                              padding: '40px', 
                              textAlign: 'center', 
                              color: '#666',
                              fontStyle: 'italic'
                            }}>
                              URL YouTube invalide
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Spotify ID</label>
                    <input 
                      placeholder="Spotify ID (optionnel)" 
                      value={song.spotify_id} 
                      onChange={e => handleSpotifyIdChange(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      📡 Les paroles seront récupérées automatiquement depuis l'API lyricsify
                    </div>
                  </div>
                </div>

                {/* Right Column - Lyrics Management */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '16px', color: '#2196f3' }}>🎵 Gestion des paroles</h4>
                  
                  {/* LRC Input Options */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      marginBottom: '10px',
                      borderBottom: '1px solid #eee',
                      paddingBottom: '10px'
                    }}>
                      <button
                        type="button"
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        onClick={() => document.getElementById('lrc-file-input').click()}
                      >
                        📁 Importer fichier LRC
                      </button>
                      <input
                        id="lrc-file-input"
                        type="file"
                        accept=".lrc,.txt"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              handleLrcChange(event.target.result);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </div>
                    
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Contenu LRC *</label>
                    <textarea
                      placeholder="[00:12.50]Ligne de paroles&#10;[00:16.30]Autre ligne"
                      value={song.lrc}
                      onChange={e => handleLrcChange(e.target.value)}
                      style={{ 
                        width: '100%', 
                        height: '120px', 
                        padding: '10px', 
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Format: [mm:ss.ff]texte (ex: [00:12.50]Hello world)
                    </div>
                  </div>
                  
                  {/* Lyrics Selection */}
                  {lrcLines.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        🎯 Lignes à cacher ({song.hidden_line_indices.length} sélectionnées) *
                      </label>
                      <div style={{ 
                        border: '2px solid #ddd', 
                        borderRadius: '6px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        backgroundColor: '#fafafa'
                      }}>
                        <LyricsSelector 
                          lines={lrcLines} 
                          selected={song.hidden_line_indices} 
                          onToggle={handleToggleHidden} 
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Cliquez sur les lignes que les joueurs devront deviner
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                justifyContent: 'flex-end',
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #eee'
              }}>
                <button 
                  onClick={() => {
                    setShowSongForm(false);
                    setEditingSong(null);
                    setSong({ title: '', category: '', youtube_url: '', spotify_id: '', lrc: '', hidden_line_indices: [] });
                    setLrcLines([]);
                  }}
                  style={{ 
                    padding: '10px 20px',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button 
                  onClick={handleAddSong}
                  disabled={!song.title || !song.youtube_url || !song.lrc || song.hidden_line_indices.length === 0}
                  style={{ 
                    padding: '10px 20px',
                    backgroundColor: (!song.title || !song.youtube_url || !song.lrc || song.hidden_line_indices.length === 0) ? '#ccc' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!song.title || !song.youtube_url || !song.lrc || song.hidden_line_indices.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {editingSong ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
              {error && <div style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
            </div>
          </div>
        )}

        {/* Category Form Modal */}
        {showCategoryForm && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h3>{editingCategory ? 'Renommer la catégorie' : 'Ajouter une catégorie'}</h3>
              <input 
                placeholder="Nom de la catégorie" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)}
                style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
              />
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                    setNewCategoryName('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Annuler
                </button>
                <button 
                  onClick={handleAddCategory}
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  {editingCategory ? 'Renommer' : 'Ajouter'}
                </button>
              </div>
              {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 3) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto' }}>
        <h2>Gérer les joueurs - {gameName}</h2>
        <div>
          <h3>Ajouter des joueurs</h3>
          {players.map((player, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '16px', 
              alignItems: 'center',
              padding: '16px',
              border: editingPlayerIndex === i ? '2px solid #2196f3' : '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9'
            }}>
              {/* Player Picture */}
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #ddd',
                backgroundColor: '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {player.picture_url ? (
                  <img 
                    src={player.picture_url} 
                    alt={`${player.username || `Joueur ${i + 1}`}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <div style={{ 
                  fontSize: '24px', 
                  color: '#666',
                  display: player.picture_url ? 'none' : 'block'
                }}>
                  👤
                </div>
              </div>

              {/* Player Info */}
              <div style={{ flex: 1 }}>
                <input 
                  placeholder={`Nom du joueur ${i + 1}`} 
                  value={player.username} 
                  onChange={e => handlePlayerChange(i, 'username', e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px',
                    marginBottom: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  onFocus={() => setEditingPlayerIndex(i)}
                  onBlur={() => setEditingPlayerIndex(null)}
                />
                <input 
                  placeholder="URL de l'image (optionnel)" 
                  value={player.picture_url} 
                  onChange={e => handlePlayerChange(i, 'picture_url', e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  onFocus={() => setEditingPlayerIndex(i)}
                  onBlur={() => setEditingPlayerIndex(null)}
                />
              </div>

              {/* Remove Button */}
              {players.length > 1 && (
                <button
                  onClick={() => handleRemovePlayer(i)}
                  style={{
                    padding: '8px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    minWidth: '40px'
                  }}
                  title="Supprimer ce joueur"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          
          <div style={{ marginBottom: '16px' }}>
            <button 
              onClick={handleAddPlayer}
              style={{ 
                padding: '12px 20px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + Ajouter un joueur
            </button>
          </div>
          
          <div style={{ 
            padding: '16px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <h4 style={{ marginTop: 0 }}>💡 Conseils pour les photos :</h4>
            <ul style={{ margin: 0, fontSize: '14px' }}>
              <li>Utilisez des URLs d'images accessibles publiquement</li>
              <li>Format recommandé : carré (1:1) pour un meilleur rendu</li>
              <li>Évitez les images trop lourdes pour un chargement rapide</li>
              <li>Exemples d'hébergement : imgur.com, cloudinary.com</li>
            </ul>
          </div>
          
          <div>
            <button 
              onClick={handlePlayersSubmit} 
              style={{ 
                marginRight: '8px',
                padding: '12px 24px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Créer la partie
            </button>
            <button 
              onClick={() => setStep(2)}
              style={{ 
                padding: '12px 24px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retour
            </button>
          </div>
          {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <h2>Partie créée !</h2>
        <p>La partie "{gameName}" a été créée avec succès.</p>
        <button 
          onClick={() => onGameCreated(gameId)}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Jouer maintenant
        </button>
      </div>
    );
  }

  // Restore dialog
  if (showRestoreDialog) {
    const draft = loadDraft();
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#2196f3' }}>
            💾 Brouillon détecté
          </h3>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Un brouillon de partie en cours de création a été trouvé.<br/>
            Voulez-vous reprendre où vous vous êtes arrêté ?
          </p>
          {draft && (
            <div style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '15px', 
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div><strong>Nom :</strong> {draft.gameName || '(pas encore défini)'}</div>
              <div><strong>Étape :</strong> {
                draft.step === 1 ? 'Nom de la partie' :
                draft.step === 2 ? 'Chansons et catégories' :
                draft.step === 3 ? 'Joueurs' : 'Terminé'
              }</div>
              <div><strong>Chansons :</strong> {draft.songs?.length || 0}</div>
              <div><strong>Joueurs :</strong> {draft.players?.filter(p => p.username.trim()).length || 0}</div>
              <div><strong>Sauvegardé :</strong> {new Date(draft.timestamp).toLocaleString()}</div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                clearDraft();
                setShowRestoreDialog(false);
              }}
              style={{ 
                padding: '12px 20px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🗑️ Nouveau départ
            </button>
            <button 
              onClick={() => draft && restoreDraft(draft)}
              style={{ 
                padding: '12px 20px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              📂 Reprendre
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default CreateGame;
