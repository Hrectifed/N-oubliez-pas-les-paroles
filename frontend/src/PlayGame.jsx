import React, { useEffect, useState } from 'react';
import { getGame, startGame, selectCategory, selectSong, attemptLyrics, getCategories } from './api';
import SingingMode from './SingingMode';

function PlayGame({ gameId, onBack }) {
  const [game, setGame] = useState(null);
  const [step, setStep] = useState('waiting');
  const [category, setCategory] = useState('');
  const [songs, setSongs] = useState([]);
  const [song, setSong] = useState(null);
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
    setCategory(cat);
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
    setResult(res);
    setStep('result');
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
      <div>Joueur actuel: {game.current_player || 'En attente'}</div>
      {step === 'waiting' && <button onClick={handleStart}>Démarrer la partie</button>}
      {step === 'category' && (
        <div>
          <h3>Choisissez une catégorie</h3>
          {game.categories.map(cat => (
            <button key={cat} onClick={() => handleSelectCategory(cat)} style={{ margin: '5px' }}>
              {cat}
            </button>
          ))}
        </div>
      )}
      {step === 'song' && (
        <div>
          <h3>Choisissez une chanson</h3>
          {songs.map(s => (
            <button key={s.id} onClick={() => handleSelectSong(s.id)} style={{ margin: '5px', display: 'block' }}>
              {s.title}
            </button>
          ))}
        </div>
      )}
      {step === 'sing' && song && (
        <SingingMode 
          song={song}
          onAttemptSubmit={handleAttemptSubmit}
          onBack={() => setStep('song')}
        />
      )}
      {step === 'result' && result && (
        <div>
          <h3>Résultat</h3>
          {result.correct ? (
            <div style={{ color: 'green', fontSize: '18px', margin: '20px 0' }}>
              🎉 Parfait ! Toutes les paroles sont correctes !
            </div>
          ) : (
            <div style={{ color: 'red', fontSize: '18px', margin: '20px 0' }}>
              ❌ Quelques erreurs...
            </div>
          )}
          
          {result.word_results && result.word_results.length > 0 && (
            <div style={{ margin: '20px 0' }}>
              <h4>Détail des mots :</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.word_results.map((wordResult, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      backgroundColor: wordResult.correct ? '#c8e6c9' : '#ffcdd2',
                      border: `2px solid ${wordResult.correct ? '#4caf50' : '#f44336'}`,
                      margin: '2px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>
                      {wordResult.correct ? '✓' : '✗'} {wordResult.word}
                    </div>
                    {!wordResult.correct && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Votre réponse: "{wordResult.attempt}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ margin: '20px 0' }}>
            <strong>Paroles attendues :</strong>
            <div style={{ fontStyle: 'italic', margin: '10px 0' }}>
              {result.expected.join(' ')}
            </div>
          </div>

          {result.score && (
            <div style={{ 
              background: '#e3f2fd', 
              padding: '10px', 
              borderRadius: '4px',
              margin: '20px 0' 
            }}>
              Score obtenu: {result.score}/100
            </div>
          )}

          <button 
            onClick={() => setStep('category')}
            style={{ 
              padding: '12px 24px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Prochain tour
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayGame;
