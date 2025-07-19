import React, { useEffect, useState } from 'react';
import { getGame, startGame, selectCategory, selectSong, attemptLyrics, getCategories } from './api';

function PlayGame({ gameId }) {
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
    setAttempt(Array(s.hidden_indices.length).fill(''));
    setStep('sing');
  };

  const handleAttempt = async () => {
    const res = await attemptLyrics(gameId, song.id, attempt, game.current_player);
    setResult(res);
    setStep('result');
  };

  if (!game) return <div>Chargement...</div>;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h2>Jouer</h2>
      <div>Joueur: {game.current_player}</div>
      {step === 'waiting' && <button onClick={handleStart}>Démarrer la partie</button>}
      {step === 'category' && (
        <div>
          <h3>Choisissez une catégorie</h3>
          {game.categories.map(cat => (
            <button key={cat} onClick={() => handleSelectCategory(cat)}>{cat}</button>
          ))}
        </div>
      )}
      {step === 'song' && (
        <div>
          <h3>Choisissez une chanson</h3>
          {songs.map(s => (
            <button key={s.id} onClick={() => handleSelectSong(s.id)}>{s.title}</button>
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
            {song.lyrics.map((line, idx) => (
              song.hidden_indices.includes(idx)
                ? <input key={idx} value={attempt[song.hidden_indices.indexOf(idx)] || ''} onChange={e => {
                    const arr = [...attempt];
                    arr[song.hidden_indices.indexOf(idx)] = e.target.value;
                    setAttempt(arr);
                  }} style={{ width: 200, margin: 2 }} />
                : <div key={idx}>{line}</div>
            ))}
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
