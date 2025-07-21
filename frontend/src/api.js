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

export async function attemptLyrics(gameId, songId, wordAttempts, player) {
  const res = await fetch(`${API_URL}/games/${gameId}/attempt_lyrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_id: songId, attempt: wordAttempts, player })
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

// Game-specific API functions
export async function getGameCategories(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/categories`);
  return res.json();
}

export async function getGameSongs(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/songs`);
  return res.json();
}

export async function getGameSongsByCategory(gameId, category) {
  const res = await fetch(`${API_URL}/games/${gameId}/categories/${encodeURIComponent(category)}/songs`);
  return res.json();
}

export async function addSongToGame(gameId, song) {
  const res = await fetch(`${API_URL}/games/${gameId}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song)
  });
  return res.json();
}

export async function addCategoryToGame(gameId, category) {
  const res = await fetch(`${API_URL}/games/${gameId}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category })
  });
  return res.json();
}
