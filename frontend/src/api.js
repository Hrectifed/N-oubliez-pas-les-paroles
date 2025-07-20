const API_URL = 'http://localhost:8000';

export async function getGame(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}`);
  return res.json();
}

export async function getGames() {
  const res = await fetch(`${API_URL}/games`);
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API_URL}/categories`);
  return res.json();
}

export async function getSongsByCategory(category) {
  const res = await fetch(`${API_URL}/categories/${encodeURIComponent(category)}/songs`);
  return res.json();
}

export async function createGame(gameData) {
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gameData)
  });
  return res.json();
}

export async function startGame(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/start`, { method: 'POST' });
  return res.json();
}

export async function selectCategory(gameId, category) {
  const res = await fetch(`${API_URL}/games/${gameId}/select_category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category })
  });
  return res.json();
}

export async function selectSong(gameId, songId) {
  const res = await fetch(`${API_URL}/games/${gameId}/select_song`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_id: songId })
  });
  return res.json();
}

export async function attemptLyrics(gameId, songId, attempt, player) {
  const res = await fetch(`${API_URL}/games/${gameId}/attempt_lyrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_id: songId, attempt, player })
  });
  return res.json();
}

export async function addSong(song) {
  const res = await fetch(`${API_URL}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song)
  });
  return res.json();
}
