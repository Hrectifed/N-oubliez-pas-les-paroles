import React, { useEffect, useState } from 'react';
import { getGame, startGame, selectCategory, selectSong, attemptLyrics, getCategories } from './api';

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
    setAttempt(Array(s.hidden_indices?.length || 0).fill(''));
    setStep('sing');
  };

  const handleAttempt = async () => {
    const res = await attemptLyrics(gameId, song.id, attempt, game.current_player);
    setResult(res);
    setStep('result');
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
        <div>
          <h3>{song.title}</h3>
          <div>
            <iframe width="400" height="225" src={song.youtube_url.replace('watch?v=', 'embed/')} title="YouTube video" frameBorder="0" allowFullScreen></iframe>
          </div>
          <div style={{ marginTop: 20 }}>
            {song.lyrics?.map((line, idx) => (
              song.hidden_indices?.includes(idx)
                ? <input key={idx} value={attempt[song.hidden_indices.indexOf(idx)] || ''} onChange={e => {
                    const arr = [...attempt];
                    arr[song.hidden_indices.indexOf(idx)] = e.target.value;
                    setAttempt(arr);
                  }} style={{ width: 200, margin: 2 }} />
                : <div key={idx}>{line}</div>
            )) || <div>Paroles non disponibles</div>}
          </div>
          <button onClick={handleAttempt}>Valider</button>
        </div>
      )}
      {step === 'result' && result && (
        <div>
          <h3>Résultat</h3>
          {result.correct ? <div style={{ color: 'green' }}>Bonne réponse !</div> : <div style={{ color: 'red' }}>Mauvaise réponse.</div>}
          <div>Réponse attendue : {result.expected.join(' / ')}</div>
          <button onClick={() => setStep('category')}>Prochain tour</button>
        </div>
      )}
    </div>
  );
}

export default PlayGame;
