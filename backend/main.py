from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import random
import re


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://127.0.0.1:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "http://localhost:3000",
        
        "https://127.0.0.1:8000",
        "http://127.0.0.1:8000",
        "https://localhost:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Utility function to parse LRC content
def parse_lrc(lrc_content: str):
    """Parse LRC content into array of {time, text} objects"""
    lines = lrc_content.split('\n')
    result = []
    time_exp = re.compile(r'\[(\d+):(\d+)(?:\.(\d+))?\]')
    
    for line in lines:
        match = time_exp.match(line)
        if match:
            min_val = int(match.group(1))
            sec_val = int(match.group(2))
            ms_val = int(match.group(3).ljust(3, '0')[:3]) if match.group(3) else 0
            time_ms = min_val * 60 * 1000 + sec_val * 1000 + ms_val
            text = time_exp.sub('', line).strip()
            result.append({"time": time_ms, "text": text})
    
    return result

# Data models
class Song(BaseModel):
    id: int
    title: str
    category: str
    youtube_url: str
    spotify_id: str
    lrc: str  # LRC file content as string
    lyrics: List[Dict]  # Parsed lyrics with timing
    hidden_line_indices: List[int]  # Indices of lines to hide

class Category(BaseModel):
    name: str
    song_ids: List[int]

class Player(BaseModel):
    username: str

class Game(BaseModel):
    id: int
    name: str
    players: List[Player]
    categories: List[str]
    played_categories: List[str]
    current_round: int
    current_player: Optional[str]
    state: str  # 'waiting', 'playing', 'finished'
    scores: Dict[str, int]

# In-memory storage
songs: Dict[int, Song] = {}
categories: Dict[str, Category] = {}
games: Dict[int, Game] = {}
song_counter = 1
game_counter = 1

# --- Song & Category Management ---
class SongCreate(BaseModel):
    title: str
    category: str
    youtube_url: str
    spotify_id: str
    lrc: str
    hidden_line_indices: List[int]

@app.post("/songs", response_model=Song)
def add_song(song: SongCreate):
    global song_counter
    song_id = song_counter
    song_counter += 1
    lyrics = parse_lrc(song.lrc)
    new_song = Song(id=song_id, lyrics=lyrics, **song.dict())
    songs[song_id] = new_song
    # Add to category
    if song.category not in categories:
        categories[song.category] = Category(name=song.category, song_ids=[])
    categories[song.category].song_ids.append(song_id)
    return new_song

@app.get("/categories", response_model=List[Category])
def get_categories():
    return list(categories.values())

@app.get("/songs", response_model=List[Song])
def get_songs():
    return list(songs.values())

@app.get("/categories/{category_name}/songs", response_model=List[Song])
def get_songs_by_category(category_name: str):
    if category_name not in categories:
        raise HTTPException(status_code=404, detail="Category not found")
    return [songs[sid] for sid in categories[category_name].song_ids]

# --- Game Management ---
class GameCreate(BaseModel):
    name: str
    player_names: List[str]

@app.post("/games", response_model=Game)
def create_game(game: GameCreate):
    global game_counter
    if len(categories) == 0:
        raise HTTPException(status_code=400, detail="No categories available")
    game_id = game_counter
    game_counter += 1
    players = [Player(username=name) for name in game.player_names]
    game_obj = Game(
        id=game_id,
        name=game.name,
        players=players,
        categories=list(categories.keys()),
        played_categories=[],
        current_round=0,
        current_player=None,
        state="waiting",
        scores={name: 0 for name in game.player_names}
    )
    games[game_id] = game_obj
    return game_obj

# List all games with id, name, and state (for filtering playable games)

class GameSummary(BaseModel):
    id: int
    name: str
    state: str

@app.get("/games", response_model=List[GameSummary])
def list_games():
    return [GameSummary(id=g.id, name=g.name, state=g.state) for g in games.values()]

@app.get("/games/{game_id}", response_model=Game)
def get_game(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    return games[game_id]

@app.post("/games/{game_id}/start")
def start_game(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if game.state != "waiting":
        raise HTTPException(status_code=400, detail="Game already started or finished")
    # Pick first player randomly
    game.current_player = random.choice([p.username for p in game.players])
    game.state = "playing"
    return {"current_player": game.current_player}

@app.post("/games/{game_id}/next_round")
def next_round(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if game.state != "playing":
        raise HTTPException(status_code=400, detail="Game not in playing state")
    # Remove played category if any
    if game.current_round > 0 and len(game.played_categories) > 0:
        game.categories = [c for c in game.categories if c not in game.played_categories]
    # End game if no categories left
    if not game.categories:
        game.state = "finished"
        return {"message": "Game finished", "scores": game.scores}
    # Pick next player randomly
    remaining_players = [p.username for p in game.players if p.username != game.current_player]
    if not remaining_players:
        remaining_players = [p.username for p in game.players]
    game.current_player = random.choice(remaining_players)
    game.current_round += 1
    return {"current_player": game.current_player, "round": game.current_round}

class CategorySelection(BaseModel):
    category: str

@app.post("/games/{game_id}/select_category")
def select_category(game_id: int, selection: CategorySelection):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if selection.category not in game.categories:
        raise HTTPException(status_code=400, detail="Category not in game")
    game.played_categories.append(selection.category)
    return {"songs": [songs[sid] for sid in categories[selection.category].song_ids]}

class SongSelection(BaseModel):
    song_id: int

@app.post("/games/{game_id}/select_song")
def select_song(game_id: int, selection: SongSelection):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    if selection.song_id not in songs:
        raise HTTPException(status_code=404, detail="Song not found")
    song = songs[selection.song_id]
    return song

class LyricsAttempt(BaseModel):
    song_id: int
    attempt: List[str]  # Array of guessed words
    player: str

@app.post("/games/{game_id}/attempt_lyrics")
def attempt_lyrics(game_id: int, attempt: LyricsAttempt):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    if attempt.song_id not in songs:
        raise HTTPException(status_code=404, detail="Song not found")
    
    song = songs[attempt.song_id]
    if not song.hidden_line_indices:
        return {"correct": False, "expected": [], "word_results": []}
    
    # Get all hidden lines and their words
    expected_words = []
    hidden_texts = []
    
    for idx in song.hidden_line_indices:
        if idx < len(song.lyrics):
            hidden_text = song.lyrics[idx]["text"]
            hidden_texts.append(hidden_text)
            # Split into words, removing punctuation for comparison
            words = re.findall(r'\b\w+\b', hidden_text.lower())
            expected_words.extend(words)
    
    # Compare word by word
    word_results = []
    correct_count = 0
    
    for i, (expected, attempted) in enumerate(zip(expected_words, attempt.attempt)):
        is_correct = expected.lower().strip() == attempted.lower().strip()
        word_results.append({
            "word": expected,
            "attempt": attempted,
            "correct": is_correct
        })
        if is_correct:
            correct_count += 1
    
    # Add score based on percentage of correct words
    total_words = len(expected_words)
    score = 0
    if total_words > 0:
        score = int((correct_count / total_words) * 100)
        if score >= 80:  # 80% threshold for points
            games[game_id].scores[attempt.player] += score // 10
    
    return {
        "correct": correct_count == total_words,
        "expected": hidden_texts,
        "word_results": word_results,
        "score": score
    }
