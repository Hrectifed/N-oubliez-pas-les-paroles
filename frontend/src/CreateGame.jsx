import React, { useState } from 'react';
import { addSong, getCategories, createGame } from './api';

function CreateGame({ onGameCreated }) {
  const [step, setStep] = useState(1);
  const [songs, setSongs] = useState([]);
  const [song, setSong] = useState({ title: '', category: '', youtube_url: '', lyrics: '', hidden_indices: '' });
  const [players, setPlayers] = useState(['']);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  // Add song step
  const handleAddSong = async () => {
    if (!song.title || !song.category || !song.youtube_url || !song.lyrics || !song.hidden_indices) {
      setError('Tous les champs sont requis.');
      return;
    }
    const lyricsArr = song.lyrics.split('\n');
    const hiddenArr = song.hidden_indices.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
    const newSong = await addSong({ ...song, lyrics: lyricsArr, hidden_indices: hiddenArr });
    setSongs([...songs, newSong]);
    setSong({ title: '', category: '', youtube_url: '', lyrics: '', hidden_indices: '' });
    setError('');
    setStep(1);
  };

  // Add player step
  const handleAddPlayer = () => {
    setPlayers([...players, '']);
  };

  const handlePlayerChange = (i, value) => {
    const arr = [...players];
    arr[i] = value;
    setPlayers(arr);
  };

  const handleCreateGame = async () => {
    const filtered = players.map(p => p.trim()).filter(Boolean);
    if (filtered.length === 0) {
      setError('Ajoutez au moins un joueur.');
      return;
    }
    const game = await createGame(filtered);
    onGameCreated(game.id);
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto' }}>
      <h2>Créer une partie</h2>
      {step === 1 && (
        <div>
          <h3>Ajouter une chanson</h3>
          <input placeholder="Titre" value={song.title} onChange={e => setSong({ ...song, title: e.target.value })} />
          <input placeholder="Catégorie" value={song.category} onChange={e => setSong({ ...song, category: e.target.value })} />
          <input placeholder="URL Youtube" value={song.youtube_url} onChange={e => setSong({ ...song, youtube_url: e.target.value })} />
          <textarea placeholder="Paroles (une ligne par ligne)" value={song.lyrics} onChange={e => setSong({ ...song, lyrics: e.target.value })} />
          <input placeholder="Indices à cacher (ex: 2,5)" value={song.hidden_indices} onChange={e => setSong({ ...song, hidden_indices: e.target.value })} />
          <button onClick={handleAddSong}>Ajouter la chanson</button>
          <button onClick={() => setStep(2)} style={{ marginLeft: 10 }}>Suivant</button>
          {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
      )}
      {step === 2 && (
        <div>
          <h3>Ajouter des joueurs</h3>
          {players.map((p, i) => (
            <input key={i} placeholder={`Joueur ${i + 1}`} value={p} onChange={e => handlePlayerChange(i, e.target.value)} />
          ))}
          <button onClick={handleAddPlayer}>Ajouter un joueur</button>
          <button onClick={handleCreateGame} style={{ marginLeft: 10 }}>Créer la partie</button>
          <button onClick={() => setStep(1)} style={{ marginLeft: 10 }}>Retour</button>
          {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <h4>Chansons ajoutées:</h4>
        <ul>
          {songs.map(s => <li key={s.id}>{s.title} ({s.category})</li>)}
        </ul>
      </div>
    </div>
  );
}

export default CreateGame;
