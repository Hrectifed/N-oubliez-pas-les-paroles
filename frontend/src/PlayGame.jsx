import React, { useEffect, useState } from 'react';
import { getGame, startGame, selectCategory, selectSong, attemptLyrics, nextPlayer, completeCategory } from './api';
import SingingMode from './SingingMode';

function PlayGame({ gameId, onBack }) {
  const [game, setGame] = useState(null);
  const [step, setStep] = useState('waiting');
  const [category, setCategory] = useState('');
  const [songs, setSongs] = useState([]);
  const [song, setSong] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [attempt, setAttempt] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (gameId) {
      getGame(gameId).then(setGame);
    }
  }, [gameId]);

  if (!gameId) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2>Aucune partie sélectionnée</h2>
        <p>Veuillez d'abord sélectionner ou créer une partie.</p>
        {onBack && (
          <button onClick={onBack} style={{ padding: '8px 16px' }}>
            Retour
          </button>
        )}
      </div>
    );
  }

  const handleStart = async () => {
    await startGame(gameId);
    const g = await getGame(gameId);
    setGame(g);
    setStep('category');
  };

  const handleSelectCategory = async cat => {
    if (game.played_categories.includes(cat)) {
      alert('Cette catégorie a déjà été jouée!');
      return;
    }
    setCategory(cat);
    setSelectedCategory(cat);
    const res = await selectCategory(gameId, cat);
    setSongs(res.songs);
    setStep('song');
  };

  const handleSelectSong = async songId => {
    const s = songs.find(s => s.id === songId);
    setSong(s);
    setStep('sing');
  };

  const handleAttemptSubmit = async (wordAttempts) => {
    const res = await attemptLyrics(gameId, song.id, wordAttempts, game.current_player);
    
    // Mark category as completed and move to next player
    await completeCategory(gameId, selectedCategory);
    const nextPlayerRes = await nextPlayer(gameId);
    
    // Refresh game state
    const updatedGame = await getGame(gameId);
    setGame(updatedGame);
    
    // Check if round is complete or game finished
    if (nextPlayerRes.round_complete) {
      if (nextPlayerRes.message === "Game finished") {
        alert(`Partie terminée! Scores finaux: ${Object.entries(updatedGame.scores).map(([name, score]) => `${name}: ${score}`).join(', ')}`);
        setStep('waiting');
      } else {
        alert(`Round ${nextPlayerRes.round - 1} terminé! Nouveau round commence.`);
        setStep('category');
      }
    } else {
      setStep('category');
    }
    
    return res;
  };

  if (!game) return <div style={{ textAlign: 'center', marginTop: 40 }}>Chargement...</div>;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Jouer - {game.name}</h2>
        {onBack && (
          <button onClick={onBack} style={{ padding: '8px 16px' }}>
            Retour au menu
          </button>
        )}
      </div>
      
      {/* Current Player Display */}
      {game.current_player && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          border: '2px solid #2196f3'
        }}>
          {(() => {
            const currentPlayerObj = game.players.find(p => p.username === game.current_player);
            return (
              <>
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #2196f3',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {currentPlayerObj?.picture_url ? (
                    <img 
                      src={currentPlayerObj.picture_url} 
                      alt={game.current_player}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div style={{ 
                    fontSize: '20px', 
                    color: '#2196f3',
                    display: currentPlayerObj?.picture_url ? 'none' : 'block'
                  }}>
                    👤
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2196f3' }}>
                    🎤 Tour de {game.current_player}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Score: {game.scores[game.current_player] || 0} points
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* All Players Display */}
      {game.players && game.players.length > 1 && (
        <div style={{ 
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px' }}>📊 Scores des joueurs</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {game.players.map(player => (
              <div key={player.username} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: player.username === game.current_player ? '#c8e6c9' : '#fff',
                borderRadius: '6px',
                border: player.username === game.current_player ? '2px solid #4caf50' : '1px solid #ddd',
                minWidth: '120px'
              }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {player.picture_url ? (
                    <img 
                      src={player.picture_url} 
                      alt={player.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    display: player.picture_url ? 'none' : 'block'
                  }}>
                    👤
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {player.username}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {game.scores[player.username] || 0} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {step === 'waiting' && <button onClick={handleStart}>Démarrer la partie</button>}
      {step === 'category' && (
        <div>
          <h3>Choisissez une catégorie</h3>
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              🎯 Round {game.current_round} - Tour de {game.current_player}
            </div>
            {game.players_played_this_round && game.players_played_this_round.length > 0 && (
              <div style={{ fontSize: '14px', color: '#666' }}>
                Ont déjà joué ce round: {game.players_played_this_round.join(', ')}
              </div>
            )}
          </div>
          
          {game.categories && (() => {
            // Handle both array and object formats
            const categoryKeys = Array.isArray(game.categories) 
              ? game.categories 
              : Object.keys(game.categories);
            
            if (categoryKeys.length === 0) {
              return (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#666',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '8px',
                  margin: '20px 0'
                }}>
                  Aucune catégorie disponible dans ce jeu.
                </div>
              );
            }
            
            return categoryKeys.map(cat => {
              const isPlayed = game.played_categories.includes(cat);
              return (
                <button 
                  key={cat} 
                  onClick={() => handleSelectCategory(cat)} 
                  disabled={isPlayed}
                  style={{ 
                    margin: '8px',
                    padding: '15px 25px',
                    backgroundColor: isPlayed ? '#e0e0e0' : '#2196f3',
                    color: isPlayed ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isPlayed ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    transition: 'background-color 0.2s',
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    opacity: isPlayed ? 0.6 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isPlayed) e.target.style.backgroundColor = '#1976d2';
                  }}
                  onMouseOut={(e) => {
                    if (!isPlayed) e.target.style.backgroundColor = '#2196f3';
                  }}
                >
                  {isPlayed ? '✓' : '📂'} {cat} {isPlayed ? '(Déjà jouée)' : ''}
                </button>
              );
            });
          })()}
        </div>
      )}
      {step === 'song' && (
        <div>
          <h3>Choisissez une chanson - Catégorie: {category}</h3>
          
          {songs.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              Aucune chanson disponible dans cette catégorie.
              <br />
              <button 
                onClick={() => setStep('category')} 
                style={{ 
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retour aux catégories
              </button>
            </div>
          ) : (
            songs.map(s => (
              <button 
                key={s.id} 
                onClick={() => handleSelectSong(s.id)} 
                style={{ 
                  margin: '8px 0', 
                  padding: '15px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#4caf50'}
              >
                🎵 {s.title}
              </button>
            ))
          )}
        </div>
      )}
      {step === 'sing' && song && (
        <SingingMode 
          song={song}
          onAttemptSubmit={handleAttemptSubmit}
          onBack={() => setStep('song')}
        />
      )}
    </div>
  );
}

export default PlayGame;
