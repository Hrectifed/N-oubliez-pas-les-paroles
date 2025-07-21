import React, { useState, useEffect } from 'react';
import { createGame, addSongToGame, addCategoryToGame, updateSongInGame, deleteSongFromGame, renameCategoryInGame, deleteCategoryFromGame, updatePlayerInGame, addPlayerToGame, removePlayerFromGame } from './api';
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

  // Step 1: Game name
  const handleGameNameSubmit = async () => {
    if (!gameName.trim()) {
      setError('Le nom de la partie est requis.');
      return;
    }
    
    // Create an initial empty game
    const initialGame = await createGame({ 
      name: gameName, 
      player_names: ['temp'], // We'll update this later
      songs: [],
      categories: []
    });
    setGameId(initialGame.id);
    setStep(2);
    setError('');
  };

  // Step 2: Song/Category management
  const handleAddSong = async () => {
    if (!song.title || !song.category || !song.youtube_url || !song.lrc || song.hidden_line_indices.length === 0) {
      setError('Tous les champs sont requis et au moins une ligne cachée.');
      return;
    }
    
    try {
      let newSong;
      if (editingSong) {
        // Update existing song
        newSong = await updateSongInGame(gameId, editingSong.id, song);
        setSongs(songs.map(s => s.id === editingSong.id ? newSong : s));
        setEditingSong(null);
      } else {
        // Add new song
        newSong = await addSongToGame(gameId, song);
        setSongs([...songs, newSong]);
      }
      
      if (!categories.includes(song.category)) {
        setCategories([...categories, song.category]);
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
    setSong({
      title: songToEdit.title,
      category: songToEdit.category,
      youtube_url: songToEdit.youtube_url,
      spotify_id: songToEdit.spotify_id,
      lrc: songToEdit.lrc,
      hidden_line_indices: songToEdit.hidden_line_indices
    });
    setLrcLines(songToEdit.lyrics || []);
    setShowSongForm(true);
  };

  const handleDeleteSong = async (songId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette chanson ?')) {
      try {
        await deleteSongFromGame(gameId, songId);
        setSongs(songs.filter(s => s.id !== songId));
        // Update categories if needed
        const remainingSongs = songs.filter(s => s.id !== songId);
        const usedCategories = [...new Set(remainingSongs.map(s => s.category))];
        setCategories(usedCategories);
      } catch (error) {
        setError('Erreur lors de la suppression de la chanson');
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Le nom de la catégorie est requis.');
      return;
    }
    
    try {
      if (editingCategory) {
        // Rename existing category
        await renameCategoryInGame(gameId, editingCategory, newCategoryName);
        setCategories(categories.map(cat => cat === editingCategory ? newCategoryName : cat));
        setSongs(songs.map(song => 
          song.category === editingCategory 
            ? { ...song, category: newCategoryName }
            : song
        ));
        setEditingCategory(null);
      } else {
        // Add new category
        await addCategoryToGame(gameId, newCategoryName);
        setCategories([...categories, newCategoryName]);
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
      try {
        await deleteCategoryFromGame(gameId, categoryName);
        setCategories(categories.filter(cat => cat !== categoryName));
        setSongs(songs.filter(song => song.category !== categoryName));
      } catch (error) {
        setError('Erreur lors de la suppression de la catégorie');
      }
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
    
    // Update the game with real players
    const updatedGame = await createGame({ 
      name: gameName, 
      player_names: filtered.map(p => p.username),
      songs: songs.map(s => ({
        title: s.title,
        category: s.category,
        youtube_url: s.youtube_url,
        spotify_id: s.spotify_id,
        lrc: s.lrc,
        hidden_line_indices: s.hidden_line_indices
      })),
      categories: categories
    });
    
    setGameId(updatedGame.id);
    setStep(4);
    setError('');
  };

  if (step === 1) {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto' }}>
        <h2>Créer une partie</h2>
        <div>
          <h3>Nom de la partie</h3>
          <input 
            placeholder="Entrez le nom de la partie" 
            value={gameName} 
            onChange={e => setGameName(e.target.value)}
            style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
          />
          <button onClick={handleGameNameSubmit}>Suivant</button>
          {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
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
              {songs.map(s => (
                <div key={s.id} style={{ 
                  border: '1px solid #eee', 
                  borderRadius: '4px', 
                  padding: '12px', 
                  marginBottom: '8px',
                  backgroundColor: '#f9f9f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{s.title}</strong> - {s.category}
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
                  <div key={cat} style={{ 
                    border: '1px solid #eee', 
                    borderRadius: '4px', 
                    padding: '12px', 
                    marginBottom: '8px',
                    backgroundColor: '#f0f8ff'
                  }}>
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
                    {categorySongs.length === 0 && (
                      <div style={{ 
                        fontStyle: 'italic', 
                        color: '#666', 
                        textAlign: 'center',
                        border: '2px dashed #ccc',
                        padding: '16px',
                        borderRadius: '4px'
                      }}>
                        Glissez-déposez des chansons ici
                      </div>
                    )}
                  </div>
                );
              })}
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
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80%',
              overflowY: 'auto'
            }}>
              <h3>{editingSong ? 'Modifier la chanson' : 'Ajouter une chanson'}</h3>
              <input 
                placeholder="Titre" 
                value={song.title} 
                onChange={e => setSong({ ...song, title: e.target.value })}
                style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
              />
              <input 
                placeholder="Catégorie" 
                value={song.category} 
                onChange={e => setSong({ ...song, category: e.target.value })}
                style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
              />
              <input 
                placeholder="URL Youtube" 
                value={song.youtube_url} 
                onChange={e => setSong({ ...song, youtube_url: e.target.value })}
                style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
              />
              <input 
                placeholder="Spotify ID (optionnel)" 
                value={song.spotify_id} 
                onChange={e => setSong({ ...song, spotify_id: e.target.value })}
                style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
              />
              <textarea
                placeholder="Contenu LRC (format: [mm:ss.ff]texte)"
                value={song.lrc}
                onChange={e => handleLrcChange(e.target.value)}
                style={{ 
                  width: '100%', 
                  height: '120px', 
                  padding: '8px', 
                  marginBottom: '8px',
                  fontFamily: 'monospace'
                }}
              />
              
              {lrcLines.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4>Sélectionnez les lignes à cacher :</h4>
                  <LyricsSelector 
                    lines={lrcLines} 
                    selected={song.hidden_line_indices} 
                    onToggle={handleToggleHidden} 
                  />
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    setShowSongForm(false);
                    setEditingSong(null);
                    setSong({ title: '', category: '', youtube_url: '', spotify_id: '', lrc: '', hidden_line_indices: [] });
                    setLrcLines([]);
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Annuler
                </button>
                <button 
                  onClick={handleAddSong}
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  {editingSong ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
              {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
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

  return null;
}

export default CreateGame;
