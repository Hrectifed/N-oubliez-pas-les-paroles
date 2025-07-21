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

// Edit functions
export async function updateSongInGame(gameId, songId, song) {
  const res = await fetch(`${API_URL}/games/${gameId}/songs/${songId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song)
  });
  return res.json();
}

export async function deleteSongFromGame(gameId, songId) {
  const res = await fetch(`${API_URL}/games/${gameId}/songs/${songId}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function renameCategoryInGame(gameId, oldName, newName) {
  const res = await fetch(`${API_URL}/games/${gameId}/categories/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: newName })
  });
  return res.json();
}

export async function deleteCategoryFromGame(gameId, categoryName) {
  const res = await fetch(`${API_URL}/games/${gameId}/categories/${encodeURIComponent(categoryName)}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function updatePlayerInGame(gameId, oldUsername, newUsername, pictureUrl = null) {
  const res = await fetch(`${API_URL}/games/${gameId}/players`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      old_username: oldUsername, 
      new_username: newUsername,
      picture_url: pictureUrl
    })
  });
  return res.json();
}

export async function addPlayerToGame(gameId, username, pictureUrl = null) {
  const res = await fetch(`${API_URL}/games/${gameId}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, picture_url: pictureUrl })
  });
  return res.json();
}

export async function nextPlayer(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/next_player`, { method: 'POST' });
  return res.json();
}

export async function completeCategory(gameId, category) {
  const res = await fetch(`${API_URL}/games/${gameId}/complete_category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category })
  });
  return res.json();
}

// Export/Import functions
export async function exportData() {
  const res = await fetch(`${API_URL}/export`);
  return res.json();
}

export async function importData(data) {
  const res = await fetch(`${API_URL}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
