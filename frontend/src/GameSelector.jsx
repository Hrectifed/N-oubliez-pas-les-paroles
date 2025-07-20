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

  // Filter games that are in waiting state (available to play)
  const availableGames = games.filter(g => g.state === 'waiting');

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
      <h2>{title}</h2>
      
      {loading && <div>Chargement des parties...</div>}
      
      {!loading && (
        <>
          {availableGames.length === 0 ? (
            <div>
              <p>Aucune partie en attente trouvée.</p>
              <p>Créez une nouvelle partie pour commencer à jouer.</p>
            </div>
          ) : (
            <div style={{ margin: '20px 0' }}>
              <select 
                value={selectedGameId} 
                onChange={e => setSelectedGameId(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', minWidth: '200px' }}
              >
                <option value="">-- Choisir une partie --</option>
                {availableGames.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} (ID: {g.id})
                  </option>
                ))}
              </select>
              <button 
                onClick={handleStartGame}
                style={{ padding: '8px 16px' }}
                disabled={!selectedGameId}
              >
                Démarrer
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