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
    picture_url: Optional[str] = None

class CategorySelection(BaseModel):
    category: str

class Game(BaseModel):
    id: int
    name: str
    players: List[Player]
    songs: Dict[int, Song]  # Game-specific songs
    categories: Dict[str, Category]  # Game-specific categories
    played_categories: List[str]
    current_round: int
    current_player: Optional[str]
    players_played_this_round: List[str]  # Track who has played in current round
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

# --- Game-specific Song & Category Management ---
@app.post("/games/{game_id}/songs", response_model=Song)
def add_song_to_game(game_id: int, song: SongCreate):
    global song_counter
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    song_id = song_counter
    song_counter += 1
    lyrics = parse_lrc(song.lrc)
    new_song = Song(id=song_id, lyrics=lyrics, **song.dict())
    game.songs[song_id] = new_song
    
    # Add to game-specific category
    if song.category not in game.categories:
        game.categories[song.category] = Category(name=song.category, song_ids=[])
    game.categories[song.category].song_ids.append(song_id)
    
    return new_song

@app.put("/games/{game_id}/songs/{song_id}", response_model=Song)
def update_song_in_game(game_id: int, song_id: int, song: SongCreate):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    if song_id not in game.songs:
        raise HTTPException(status_code=404, detail="Song not found in this game")
    
    old_song = game.songs[song_id]
    old_category = old_song.category
    
    # Parse new lyrics
    lyrics = parse_lrc(song.lrc)
    updated_song = Song(id=song_id, lyrics=lyrics, **song.dict())
    game.songs[song_id] = updated_song
    
    # Handle category changes
    if old_category != song.category:
        # Remove from old category
        if old_category in game.categories:
            game.categories[old_category].song_ids = [
                sid for sid in game.categories[old_category].song_ids if sid != song_id
            ]
            # Remove category if it becomes empty
            if not game.categories[old_category].song_ids:
                del game.categories[old_category]
        
        # Add to new category
        if song.category not in game.categories:
            game.categories[song.category] = Category(name=song.category, song_ids=[])
        game.categories[song.category].song_ids.append(song_id)
    
    return updated_song

@app.delete("/games/{game_id}/songs/{song_id}")
def delete_song_from_game(game_id: int, song_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    if song_id not in game.songs:
        raise HTTPException(status_code=404, detail="Song not found in this game")
    
    song = game.songs[song_id]
    category = song.category
    
    # Remove song
    del game.songs[song_id]
    
    # Remove from category
    if category in game.categories:
        game.categories[category].song_ids = [
            sid for sid in game.categories[category].song_ids if sid != song_id
        ]
        # Remove category if it becomes empty
        if not game.categories[category].song_ids:
            del game.categories[category]
    
    return {"message": "Song deleted successfully"}

@app.get("/games/{game_id}/categories", response_model=List[Category])
def get_game_categories(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    return list(games[game_id].categories.values())

@app.get("/games/{game_id}/songs", response_model=List[Song])
def get_game_songs(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    return list(games[game_id].songs.values())

@app.get("/games/{game_id}/categories/{category_name}/songs", response_model=List[Song])
def get_game_songs_by_category(game_id: int, category_name: str):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if category_name not in game.categories:
        raise HTTPException(status_code=404, detail="Category not found in this game")
    return [game.songs[sid] for sid in game.categories[category_name].song_ids if sid in game.songs]

@app.post("/games/{game_id}/categories")
def add_category_to_game(game_id: int, category: CategorySelection):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    if category.category not in game.categories:
        game.categories[category.category] = Category(name=category.category, song_ids=[])
    return {"message": f"Category '{category.category}' added to game"}

@app.put("/games/{game_id}/categories/{old_name}")
def rename_category_in_game(game_id: int, old_name: str, category: CategorySelection):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    if old_name not in game.categories:
        raise HTTPException(status_code=404, detail="Category not found in this game")
    
    if old_name != category.category:
        # Rename category
        game.categories[category.category] = game.categories[old_name]
        del game.categories[old_name]
        
        # Update songs that reference this category
        for song in game.songs.values():
            if song.category == old_name:
                song.category = category.category
    
    return {"message": f"Category renamed from '{old_name}' to '{category.category}'"}

@app.delete("/games/{game_id}/categories/{category_name}")
def delete_category_from_game(game_id: int, category_name: str):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    if category_name not in game.categories:
        raise HTTPException(status_code=404, detail="Category not found in this game")
    
    # Delete all songs in this category
    song_ids_to_delete = list(game.categories[category_name].song_ids)
    for song_id in song_ids_to_delete:
        if song_id in game.songs:
            del game.songs[song_id]
    
    # Delete category
    del game.categories[category_name]
    
    return {"message": f"Category '{category_name}' and all its songs deleted successfully"}

# Player management
class PlayerUpdate(BaseModel):
    old_username: str
    new_username: str
    picture_url: Optional[str] = None

@app.put("/games/{game_id}/players")
def update_player_in_game(game_id: int, player_update: PlayerUpdate):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    
    # Find and update player
    for player in game.players:
        if player.username == player_update.old_username:
            player.username = player_update.new_username
            if player_update.picture_url is not None:
                player.picture_url = player_update.picture_url
            break
    else:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Update scores dictionary
    if player_update.old_username in game.scores:
        game.scores[player_update.new_username] = game.scores.pop(player_update.old_username)
    
    # Update current player if needed
    if game.current_player == player_update.old_username:
        game.current_player = player_update.new_username
    
    return {"message": f"Player updated successfully"}

@app.post("/games/{game_id}/players")
def add_player_to_game(game_id: int, player: Player):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    
    # Check if player already exists
    if any(p.username == player.username for p in game.players):
        raise HTTPException(status_code=400, detail="Player already exists")
    
    game.players.append(player)
    game.scores[player.username] = 0
    
    return {"message": f"Player '{player.username}' added to game"}

@app.delete("/games/{game_id}/players/{username}")
def remove_player_from_game(game_id: int, username: str):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    
    # Remove player
    game.players = [p for p in game.players if p.username != username]
    
    # Remove from scores
    if username in game.scores:
        del game.scores[username]
    
    # Update current player if needed
    if game.current_player == username:
        if game.players:
            game.current_player = game.players[0].username
        else:
            game.current_player = None
    
    return {"message": f"Player '{username}' removed from game"}

# --- Game Management ---
class GameCreate(BaseModel):
    name: str
    player_names: List[str]
    songs: Optional[List[SongCreate]] = []
    categories: Optional[List[str]] = []

@app.post("/games")
def create_game(game: GameCreate):
    global game_counter, song_counter
    game_id = game_counter
    game_counter += 1
    players = [Player(username=name) for name in game.player_names]
    
    # Create game-specific songs and categories
    game_songs = {}
    game_categories = {}
    
    # Process songs for this game
    for song_data in game.songs:
        song_id = song_counter
        song_counter += 1
        lyrics = parse_lrc(song_data.lrc)
        new_song = Song(id=song_id, lyrics=lyrics, **song_data.dict())
        game_songs[song_id] = new_song
        
        # Add to game-specific category
        if song_data.category not in game_categories:
            game_categories[song_data.category] = Category(name=song_data.category, song_ids=[])
        game_categories[song_data.category].song_ids.append(song_id)
    
    # Add any additional empty categories
    for cat_name in game.categories:
        if cat_name not in game_categories:
            game_categories[cat_name] = Category(name=cat_name, song_ids=[])
    
    game_obj = Game(
        id=game_id,
        name=game.name,
        players=[Player(username=name, picture_url=None) for name in game.player_names],
        songs=game_songs,
        categories=game_categories,
        played_categories=[],
        current_round=0,
        current_player=None,
        players_played_this_round=[],
        state="waiting",
        scores={name: 0 for name in game.player_names}
    )
    games[game_id] = game_obj
    
    # Return properly formatted response
    categories_dict = {}
    for name, category in game_obj.categories.items():
        categories_dict[name] = {
            "name": category.name,
            "song_ids": category.song_ids
        }
    
    return {
        "id": game_obj.id,
        "name": game_obj.name,
        "players": [{"username": p.username, "picture_url": p.picture_url} for p in game_obj.players],
        "songs": {str(k): {
            "id": v.id,
            "title": v.title,
            "category": v.category,
            "youtube_url": v.youtube_url,
            "spotify_id": v.spotify_id,
            "lrc": v.lrc,
            "lyrics": v.lyrics,
            "hidden_line_indices": v.hidden_line_indices
        } for k, v in game_obj.songs.items()},
        "categories": categories_dict,
        "played_categories": game_obj.played_categories,
        "current_round": game_obj.current_round,
        "current_player": game_obj.current_player,
        "players_played_this_round": game_obj.players_played_this_round,
        "state": game_obj.state,
        "scores": game_obj.scores
    }

# List all games with id, name, and state (for filtering playable games)

class GameSummary(BaseModel):
    id: int
    name: str
    state: str

@app.get("/games", response_model=List[GameSummary])
def list_games():
    return [GameSummary(id=g.id, name=g.name, state=g.state) for g in games.values()]

@app.get("/games/{game_id}")
def get_game(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = games[game_id]
    
    # Ensure categories are properly formatted as a dict with string keys
    categories_dict = {}
    for name, category in game.categories.items():
        categories_dict[name] = {
            "name": category.name,
            "song_ids": category.song_ids
        }
    
    # Return game data with properly formatted categories
    return {
        "id": game.id,
        "name": game.name,
        "players": [{"username": p.username, "picture_url": p.picture_url} for p in game.players],
        "songs": {str(k): {
            "id": v.id,
            "title": v.title,
            "category": v.category,
            "youtube_url": v.youtube_url,
            "spotify_id": v.spotify_id,
            "lrc": v.lrc,
            "lyrics": v.lyrics,
            "hidden_line_indices": v.hidden_line_indices
        } for k, v in game.songs.items()},
        "categories": categories_dict,
        "played_categories": game.played_categories,
        "current_round": game.current_round,
        "current_player": game.current_player,
        "players_played_this_round": game.players_played_this_round,
        "state": game.state,
        "scores": game.scores
    }

@app.post("/games/{game_id}/start")
def start_game(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if game.state != "waiting":
        raise HTTPException(status_code=400, detail="Game already started or finished")
    # Pick first player randomly and start round 1
    game.current_player = random.choice([p.username for p in game.players])
    game.current_round = 1
    game.players_played_this_round = []
    game.state = "playing"
    return {"current_player": game.current_player, "round": game.current_round}

@app.post("/games/{game_id}/next_player")
def next_player(game_id: int):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if game.state != "playing":
        raise HTTPException(status_code=400, detail="Game not in playing state")
    
    # Add current player to played list if not already there
    if game.current_player and game.current_player not in game.players_played_this_round:
        game.players_played_this_round.append(game.current_player)
    
    # Get all player usernames
    all_players = [p.username for p in game.players]
    
    # Find players who haven't played this round
    remaining_players_this_round = [p for p in all_players if p not in game.players_played_this_round]
    
    if remaining_players_this_round:
        # Still players left in this round - pick randomly from remaining
        game.current_player = random.choice(remaining_players_this_round)
        return {
            "current_player": game.current_player, 
            "round": game.current_round,
            "round_complete": False,
            "players_remaining_this_round": len(remaining_players_this_round) - 1
        }
    else:
        # All players have played this round - start new round
        available_categories = [c for c in game.categories.keys() if c not in game.played_categories]
        
        # Check if game should end
        if not available_categories:
            game.state = "finished"
            return {"message": "Game finished", "scores": game.scores, "round_complete": True}
        
        # Start new round
        game.current_round += 1
        game.players_played_this_round = []
        game.current_player = random.choice(all_players)
        
        return {
            "current_player": game.current_player, 
            "round": game.current_round,
            "round_complete": True,
            "new_round_started": True,
            "players_remaining_this_round": len(all_players) - 1
        }

@app.post("/games/{game_id}/select_category")
def select_category(game_id: int, selection: CategorySelection):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if selection.category not in game.categories:
        raise HTTPException(status_code=400, detail="Category not in game")
    # Don't mark as played here - will be marked when round is complete
    return {"songs": [game.songs[sid] for sid in game.categories[selection.category].song_ids if sid in game.songs]}

@app.post("/games/{game_id}/complete_category")
def complete_category(game_id: int, selection: CategorySelection):
    """Mark a category as completed/played"""
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if selection.category not in game.categories:
        raise HTTPException(status_code=400, detail="Category not in game")
    if selection.category not in game.played_categories:
        game.played_categories.append(selection.category)
    return {"message": f"Category '{selection.category}' marked as completed"}

class SongSelection(BaseModel):
    song_id: int

@app.post("/games/{game_id}/select_song")
def select_song(game_id: int, selection: SongSelection):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if selection.song_id not in game.songs:
        raise HTTPException(status_code=404, detail="Song not found in this game")
    song = game.songs[selection.song_id]
    return song

class LyricsAttempt(BaseModel):
    song_id: int
    attempt: List[str]  # Array of guessed words
    player: str

@app.post("/games/{game_id}/attempt_lyrics")
def attempt_lyrics(game_id: int, attempt: LyricsAttempt):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    if attempt.song_id not in game.songs:
        raise HTTPException(status_code=404, detail="Song not found in this game")
    
    song = game.songs[attempt.song_id]
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
            game.scores[attempt.player] += score // 10
    
    return {
        "correct": correct_count == total_words,
        "expected": hidden_texts,
        "word_results": word_results,
        "score": score
    }
