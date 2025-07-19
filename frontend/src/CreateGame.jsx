import React, { useState } from 'react';
import { addSong, getCategories, createGame } from './api';
import LyricsSelector from './LyricsSelector';
import { parseLRC } from './lrcUtils';

function CreateGame({ onGameCreated }) {
  const [step, setStep] = useState(1);
  const [songs, setSongs] = useState([]);
  const [song, setSong] = useState({ title: '', category: '', youtube_url: '', spotify_id: '', lrc: '', hidden_line_indices: [] });
  const [lrcLines, setLrcLines] = useState([]);
  const [fetchingLrc, setFetchingLrc] = useState(false);
  const [players, setPlayers] = useState(['']);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  // Add song step
  const handleFetchLrc = async () => {
    if (!song.spotify_id) {
      setError('Spotify ID requis');
      return;
    }
    setFetchingLrc(true);
    setError('');
    try {
      // Change port as needed
      const res = await fetch(`http://localhost:PORT/v1/lyrics/${song.spotify_id}`);
      if (!res.ok) throw new Error('LRC introuvable');
      const data = await res.json();
      setSong(s => ({ ...s, lrc: data.lrc }));
      setLrcLines(parseLRC(data.lrc));
    } catch (e) {
      setError('Erreur lors de la récupération du LRC');
    }
    setFetchingLrc(false);
  };

  const handleToggleHidden = idx => {
    setSong(s => {
      const arr = s.hidden_line_indices.includes(idx)
        ? s.hidden_line_indices.filter(i => i !== idx)
        : [...s.hidden_line_indices, idx];
      return { ...s, hidden_line_indices: arr };
    });
  };

  const handleAddSong = async () => {
    if (!song.title || !song.category || !song.youtube_url || !song.spotify_id || !song.lrc || song.hidden_line_indices.length === 0) {
      setError('Tous les champs sont requis et au moins une ligne cachée.');
      return;
    }
    const newSong = await addSong(song);
    setSongs([...songs, newSong]);
    setSong({ title: '', category: '', youtube_url: '', spotify_id: '', lrc: '', hidden_line_indices: [] });
    setLrcLines([]);
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
          <input placeholder="Spotify ID (ex: 5K1m4aaPCxwnm9SKlWW1vh)" value={song.spotify_id} onChange={e => setSong({ ...song, spotify_id: e.target.value })} />
          <button onClick={handleFetchLrc} disabled={fetchingLrc}>Récupérer les paroles (LRC)</button>
          {lrcLines.length > 0 && (
            <div style={{ margin: '16px 0' }}>
              <h4>Sélectionnez les lignes à cacher :</h4>
              <LyricsSelector lines={lrcLines} selected={song.hidden_line_indices} onToggle={handleToggleHidden} />
            </div>
          )}
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
