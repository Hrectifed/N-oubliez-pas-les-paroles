#!/usr/bin/env python3
"""
LRC Timing Editor CLI Tool

A command-line version of the LRC timing editor for environments without GUI support.
"""

import json
import re
import os
from typing import Dict, List, Tuple


def parse_lrc_timestamp(timestamp: str) -> Tuple[int, int, int]:
    """
    Parse LRC timestamp like [01:23.45] into minutes, seconds, centiseconds
    Returns (minutes, seconds, centiseconds)
    """
    timestamp = timestamp.strip('[]')
    parts = timestamp.split(':')
    if len(parts) != 2:
        raise ValueError(f"Invalid timestamp format: {timestamp}")
    
    minutes = int(parts[0])
    sec_parts = parts[1].split('.')
    if len(sec_parts) != 2:
        raise ValueError(f"Invalid timestamp format: {timestamp}")
    
    seconds = int(sec_parts[0])
    centiseconds = int(sec_parts[1])
    
    return minutes, seconds, centiseconds


def format_lrc_timestamp(minutes: int, seconds: int, centiseconds: int) -> str:
    """Format time components back to LRC timestamp format [mm:ss.cc]"""
    return f"[{minutes:02d}:{seconds:02d}.{centiseconds:02d}]"


def adjust_timestamp(timestamp: str, seconds_adj: int, centiseconds_adj: int) -> str:
    """
    Adjust a single LRC timestamp by the given seconds and centiseconds
    Returns the adjusted timestamp string
    """
    try:
        minutes, seconds, centiseconds = parse_lrc_timestamp(timestamp)
        
        # Convert everything to centiseconds for easier calculation
        total_centiseconds = (minutes * 60 * 100) + (seconds * 100) + centiseconds
        
        # Apply adjustments
        adjustment_centiseconds = (seconds_adj * 100) + centiseconds_adj
        total_centiseconds += adjustment_centiseconds
        
        # Ensure we don't go negative
        if total_centiseconds < 0:
            total_centiseconds = 0
        
        # Convert back to minutes, seconds, centiseconds
        new_minutes = total_centiseconds // (60 * 100)
        remaining = total_centiseconds % (60 * 100)
        new_seconds = remaining // 100
        new_centiseconds = remaining % 100
        
        return format_lrc_timestamp(new_minutes, new_seconds, new_centiseconds)
        
    except ValueError as e:
        print(f"Error parsing timestamp {timestamp}: {e}")
        return timestamp


def adjust_song_lrc(lrc_content: str, seconds_adj: int, centiseconds_adj: int) -> str:
    """
    Adjust all timestamps in LRC content
    Returns the modified LRC content
    """
    lines = lrc_content.split('\n')
    adjusted_lines = []
    
    for line in lines:
        # Find LRC timestamp pattern [mm:ss.cc]
        timestamp_pattern = r'\[(\d{2}:\d{2}\.\d{2})\]'
        
        def replace_timestamp(match):
            original_timestamp = '[' + match.group(1) + ']'
            return adjust_timestamp(original_timestamp, seconds_adj, centiseconds_adj)
        
        adjusted_line = re.sub(timestamp_pattern, replace_timestamp, line)
        adjusted_lines.append(adjusted_line)
    
    return '\n'.join(adjusted_lines)


def load_export_file(file_path: str) -> Dict:
    """Load and parse the export file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_songs_from_data(data: Dict) -> Dict:
    """Extract songs from the data structure"""
    if 'games' not in data:
        raise ValueError("No games found in export file")
    
    # Get the first game (assuming there's only one as mentioned in requirements)
    game_id = list(data['games'].keys())[0]
    game = data['games'][game_id]
    
    if 'songs' not in game:
        raise ValueError("No songs found in game")
    
    return game['songs'], game.get('name', 'Unknown Game')


def main():
    """Main CLI interface"""
    print("LRC Timing Editor - Command Line Interface")
    print("=" * 50)
    
    # Get input file
    file_path = input("Enter path to export file: ").strip()
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found")
        return
    
    # Load data
    try:
        data = load_export_file(file_path)
        songs, game_name = get_songs_from_data(data)
        print(f"\nLoaded game: {game_name}")
        print(f"Found {len(songs)} songs")
    except Exception as e:
        print(f"Error loading file: {e}")
        return
    
    # Show songs and collect adjustments
    print("\nSongs found:")
    song_adjustments = {}
    
    for song_id, song in songs.items():
        title = song.get('title', 'Unknown')
        category = song.get('category', 'Unknown')
        
        print(f"\n{song_id}. {title} ({category})")
        
        # Show LRC preview if available
        if 'lrc' in song and song['lrc']:
            lrc_lines = song['lrc'].split('\n')
            lyric_lines = [line for line in lrc_lines if re.match(r'\[\d{2}:\d{2}\.\d{2}\]', line)]
            
            if lyric_lines:
                print(f"   LRC lines: {len(lyric_lines)}")
                print(f"   Preview: {lyric_lines[0][:50]}...")
            else:
                print("   No valid LRC timestamps found")
                continue
        else:
            print("   No LRC data found")
            continue
        
        # Get time adjustment
        print(f"   Enter time adjustment for '{title}':")
        try:
            seconds_str = input("   Seconds to add/subtract (can be negative): ").strip()
            centiseconds_str = input("   Centiseconds to add/subtract (can be negative): ").strip()
            
            seconds_adj = int(seconds_str) if seconds_str else 0
            centiseconds_adj = int(centiseconds_str) if centiseconds_str else 0
            
            if seconds_adj != 0 or centiseconds_adj != 0:
                song_adjustments[song_id] = {
                    'seconds': seconds_adj,
                    'centiseconds': centiseconds_adj,
                    'title': title
                }
                print(f"   Will adjust by {seconds_adj}s {centiseconds_adj}cs")
            else:
                print("   No adjustment for this song")
                
        except ValueError:
            print("   Invalid input, skipping this song")
    
    if not song_adjustments:
        print("\nNo adjustments to apply. Exiting.")
        return
    
    # Confirm and apply changes
    print(f"\nReady to apply adjustments to {len(song_adjustments)} songs:")
    for song_id, adj in song_adjustments.items():
        print(f"  {adj['title']}: {adj['seconds']}s {adj['centiseconds']}cs")
    
    confirm = input("\nApply these changes? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("Cancelled.")
        return
    
    # Apply adjustments
    game_id = list(data['games'].keys())[0]
    changes_made = 0
    
    for song_id, adj in song_adjustments.items():
        song = data['games'][game_id]['songs'][song_id]
        if 'lrc' in song and song['lrc']:
            original_lrc = song['lrc']
            adjusted_lrc = adjust_song_lrc(original_lrc, adj['seconds'], adj['centiseconds'])
            data['games'][game_id]['songs'][song_id]['lrc'] = adjusted_lrc
            changes_made += 1
            print(f"  Applied adjustment to: {adj['title']}")
    
    # Save file
    output_path = input(f"\nEnter output file path (default: {file_path.replace('.json', '_adjusted.json')}): ").strip()
    if not output_path:
        output_path = file_path.replace('.json', '_adjusted.json')
    
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\nSuccess! Saved adjusted file to: {output_path}")
        print(f"Applied adjustments to {changes_made} songs.")
        
    except Exception as e:
        print(f"Error saving file: {e}")


if __name__ == "__main__":
    main()