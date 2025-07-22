import React, { useState, useEffect } from 'react';
import { getGames } from './api';

function GameSelector({ onGameSelected, onBack, title = "Sélectionner une partie" }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getGames();
      setGames(data);
    } catch (err) {
      setError('Impossible de charger les parties. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (!selectedGameId) {
      setError('Veuillez sélectionner une partie.');
      return;
    }
    onGameSelected(parseInt(selectedGameId));
  };

  // Filter games that are available to play or resume
  const availableGames = games.filter(g => g.state === 'waiting');
  const playingGames = games.filter(g => g.state === 'playing');
  const allPlayableGames = [...availableGames, ...playingGames];

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
      <h2>{title}</h2>
      
      {loading && <div>Chargement des parties...</div>}
      
      {!loading && (
        <>
          {allPlayableGames.length === 0 ? (
            <div>
              <p>Aucune partie disponible trouvée.</p>
              <p>Créez une nouvelle partie pour commencer à jouer.</p>
            </div>
          ) : (
            <div style={{ margin: '20px 0' }}>
              {availableGames.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ color: '#4caf50', marginBottom: '10px' }}>🆕 Nouvelles parties</h3>
                  <select 
                    value={selectedGameId} 
                    onChange={e => setSelectedGameId(e.target.value)}
                    style={{ padding: '12px', marginRight: '10px', minWidth: '300px', border: '2px solid #4caf50', borderRadius: '6px' }}
                  >
                    <option value="">-- Choisir une nouvelle partie --</option>
                    {availableGames.map(g => (
                      <option key={g.id} value={g.id}>
                        🎮 {g.name} (ID: {g.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {playingGames.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ color: '#ff9800', marginBottom: '10px' }}>⏸️ Parties en cours</h3>
                  <select 
                    value={selectedGameId} 
                    onChange={e => setSelectedGameId(e.target.value)}
                    style={{ padding: '12px', marginRight: '10px', minWidth: '300px', border: '2px solid #ff9800', borderRadius: '6px' }}
                  >
                    <option value="">-- Reprendre une partie --</option>
                    {playingGames.map(g => (
                      <option key={g.id} value={g.id}>
                        ▶️ {g.name} (ID: {g.id}) - EN COURS
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <button 
                onClick={handleStartGame}
                style={{ 
                  padding: '12px 24px',
                  backgroundColor: selectedGameId ? 
                    (availableGames.find(g => g.id.toString() === selectedGameId) ? '#4caf50' : '#ff9800') 
                    : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedGameId ? 'pointer' : 'not-allowed',
                  fontSize: '16px'
                }}
                disabled={!selectedGameId}
              >
                {selectedGameId && playingGames.find(g => g.id.toString() === selectedGameId) ? 
                  '📂 Reprendre la partie' : 
                  '🎮 Démarrer la partie'}
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div style={{ color: 'red', margin: '10px 0' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button onClick={onBack} style={{ padding: '8px 16px' }}>
          Retour
        </button>
        <button 
          onClick={fetchGames} 
          style={{ padding: '8px 16px', marginLeft: '10px' }}
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}

export default GameSelector;