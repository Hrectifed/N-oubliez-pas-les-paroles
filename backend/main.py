from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import random


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"]
)

# Data models
class Song(BaseModel):
    id: int
    title: str
    category: str
    youtube_url: str
    spotify_id: str
    lrc: str  # LRC file content as string
    hidden_line_indices: List[int]  # Indices of lines to hide

class Category(BaseModel):
    name: str
    song_ids: List[int]

class Player(BaseModel):
    username: str

class Game(BaseModel):
    id: int
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
    new_song = Song(id=song_id, **song.dict())
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
    attempt: str  # The guessed lyric
    player: str

@app.post("/games/{game_id}/attempt_lyrics")
def attempt_lyrics(game_id: int, attempt: LyricsAttempt):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    if attempt.song_id not in songs:
        raise HTTPException(status_code=404, detail="Song not found")
    song = songs[attempt.song_id]
    # For now, check only the first hidden line
    if not song.hidden_line_indices:
        return {"correct": False, "expected": []}
    idx = song.hidden_line_indices[0]
    # Parse LRC to get the expected lyric
    lrc_lines = [line for line in song.lrc.splitlines() if line.strip() and line.strip()[0] == '[' and ']' in line]
    def parse_lrc_line(line):
        try:
            ts, text = line.split(']', 1)
            return text.strip()
        except:
            return ''
    expected = parse_lrc_line(lrc_lines[idx]) if idx < len(lrc_lines) else ''
    correct = attempt.attempt.strip().lower() == expected.strip().lower()
    if correct:
        games[game_id].scores[attempt.player] += 1
    return {"correct": correct, "expected": [expected]}
