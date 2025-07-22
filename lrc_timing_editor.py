#!/usr/bin/env python3
"""
LRC Timing Editor Tool

A standalone tool to edit timing in exported JSON files from N'oubliez pas les paroles.
Allows adjusting LRC timestamps by adding or removing seconds and centiseconds for each song.

Falls back to CLI mode if GUI is not available.
"""

import json
import re
import os
from typing import Dict, List, Tuple

# Try to import Tkinter, fall back to CLI if not available
try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False


class LRCTimingEditor:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("LRC Timing Editor")
        self.root.geometry("800x600")
        
        self.data = None
        self.song_adjustments = {}
        self.output_file = None
        
        self.setup_ui()
    
    def setup_ui(self):
        """Setup the main UI"""
        # File selection frame
        file_frame = ttk.Frame(self.root, padding="10")
        file_frame.pack(fill=tk.X)
        
        ttk.Label(file_frame, text="Export File:").pack(side=tk.LEFT)
        self.file_label = ttk.Label(file_frame, text="No file selected", foreground="gray")
        self.file_label.pack(side=tk.LEFT, padx=(10, 0))
        
        ttk.Button(file_frame, text="Browse", command=self.browse_file).pack(side=tk.RIGHT)
        
        # Main content frame with scrollbar
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Canvas and scrollbar for scrollable content
        self.canvas = tk.Canvas(self.main_frame)
        self.scrollbar = ttk.Scrollbar(self.main_frame, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)
        
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")
        
        # Button frame
        button_frame = ttk.Frame(self.root, padding="10")
        button_frame.pack(fill=tk.X)
        
        ttk.Button(button_frame, text="Apply Changes", command=self.apply_changes).pack(side=tk.LEFT)
        ttk.Button(button_frame, text="Save As...", command=self.save_file).pack(side=tk.LEFT, padx=(10, 0))
        
    def browse_file(self):
        """Browse for an export file"""
        file_path = filedialog.askopenfilename(
            title="Select Export File",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if file_path:
            self.load_file(file_path)
    
    def load_file(self, file_path: str):
        """Load and parse the export file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            
            self.file_label.config(text=os.path.basename(file_path), foreground="black")
            self.create_song_controls()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load file: {str(e)}")
    
    def create_song_controls(self):
        """Create timing adjustment controls for each song"""
        # Clear existing controls
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        
        self.song_adjustments = {}
        
        if not self.data or 'games' not in self.data:
            ttk.Label(self.scrollable_frame, text="No valid game data found").pack()
            return
        
        # Find the first game (assuming there's only one as mentioned in requirements)
        game_id = list(self.data['games'].keys())[0]
        game = self.data['games'][game_id]
        
        ttk.Label(self.scrollable_frame, text=f"Game: {game.get('name', 'Unknown')}", 
                 font=('TkDefaultFont', 12, 'bold')).pack(pady=(0, 10))
        
        if 'songs' not in game:
            ttk.Label(self.scrollable_frame, text="No songs found").pack()
            return
        
        # Create controls for each song
        for song_id, song in game['songs'].items():
            self.create_song_control(song_id, song)
    
    def create_song_control(self, song_id: str, song: Dict):
        """Create timing adjustment controls for a single song"""
        # Song frame
        song_frame = ttk.LabelFrame(self.scrollable_frame, text=f"Song: {song.get('title', 'Unknown')}", padding="10")
        song_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Show category if available
        if 'category' in song:
            ttk.Label(song_frame, text=f"Category: {song['category']}", foreground="gray").pack(anchor=tk.W)
        
        # Show LRC preview (first few lines)
        if 'lrc' in song and song['lrc']:
            lrc_lines = song['lrc'].split('\n')
            timestamp_lines = [line for line in lrc_lines if line.startswith('[') and ']' in line and line.count(':') >= 1]
            if timestamp_lines:
                preview = '\n'.join(timestamp_lines[:3])
                if len(timestamp_lines) > 3:
                    preview += f"\n... and {len(timestamp_lines) - 3} more lines"
                ttk.Label(song_frame, text=f"LRC Preview:\n{preview}", foreground="blue", justify=tk.LEFT).pack(anchor=tk.W, pady=(5, 10))
        
        # Timing adjustment controls
        adjust_frame = ttk.Frame(song_frame)
        adjust_frame.pack(fill=tk.X)
        
        ttk.Label(adjust_frame, text="Time adjustment:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        
        # Seconds adjustment
        ttk.Label(adjust_frame, text="Seconds:").grid(row=0, column=1, padx=(0, 5))
        seconds_var = tk.StringVar(value="0")
        seconds_entry = ttk.Entry(adjust_frame, textvariable=seconds_var, width=10)
        seconds_entry.grid(row=0, column=2, padx=(0, 10))
        
        # Centiseconds adjustment
        ttk.Label(adjust_frame, text="Centiseconds:").grid(row=0, column=3, padx=(0, 5))
        centiseconds_var = tk.StringVar(value="0")
        centiseconds_entry = ttk.Entry(adjust_frame, textvariable=centiseconds_var, width=10)
        centiseconds_entry.grid(row=0, column=4, padx=(0, 10))
        
        # Help text
        ttk.Label(adjust_frame, text="(Use negative values to subtract time)", foreground="gray").grid(row=1, column=1, columnspan=4, sticky=tk.W, pady=(5, 0))
        
        # Store references for later use
        self.song_adjustments[song_id] = {
            'seconds': seconds_var,
            'centiseconds': centiseconds_var,
            'song_data': song
        }
    
    def parse_lrc_timestamp(self, timestamp: str) -> Tuple[int, int, int]:
        """
        Parse LRC timestamp like [01:23.45] into minutes, seconds, centiseconds
        Returns (minutes, seconds, centiseconds)
        """
        # Remove brackets and split
        timestamp = timestamp.strip('[]')
        
        # Split by colon to get minutes and seconds.centiseconds
        parts = timestamp.split(':')
        if len(parts) != 2:
            raise ValueError(f"Invalid timestamp format: {timestamp}")
        
        minutes = int(parts[0])
        
        # Split seconds and centiseconds by dot
        sec_parts = parts[1].split('.')
        if len(sec_parts) != 2:
            raise ValueError(f"Invalid timestamp format: {timestamp}")
        
        seconds = int(sec_parts[0])
        centiseconds = int(sec_parts[1])
        
        return minutes, seconds, centiseconds
    
    def format_lrc_timestamp(self, minutes: int, seconds: int, centiseconds: int) -> str:
        """Format time components back to LRC timestamp format [mm:ss.cc]"""
        return f"[{minutes:02d}:{seconds:02d}.{centiseconds:02d}]"
    
    def adjust_timestamp(self, timestamp: str, seconds_adj: int, centiseconds_adj: int) -> str:
        """
        Adjust a single LRC timestamp by the given seconds and centiseconds
        Returns the adjusted timestamp string
        """
        try:
            minutes, seconds, centiseconds = self.parse_lrc_timestamp(timestamp)
            
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
            
            return self.format_lrc_timestamp(new_minutes, new_seconds, new_centiseconds)
            
        except ValueError as e:
            print(f"Error parsing timestamp {timestamp}: {e}")
            return timestamp  # Return original if parsing fails
    
    def adjust_song_lrc(self, lrc_content: str, seconds_adj: int, centiseconds_adj: int) -> str:
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
                return self.adjust_timestamp(original_timestamp, seconds_adj, centiseconds_adj)
            
            adjusted_line = re.sub(timestamp_pattern, replace_timestamp, line)
            adjusted_lines.append(adjusted_line)
        
        return '\n'.join(adjusted_lines)
    
    def apply_changes(self):
        """Apply timing adjustments to all songs"""
        if not self.data:
            messagebox.showerror("Error", "No file loaded")
            return
        
        try:
            # Get the first game
            game_id = list(self.data['games'].keys())[0]
            
            changes_made = 0
            
            for song_id, adjustment_data in self.song_adjustments.items():
                try:
                    seconds_adj = int(adjustment_data['seconds'].get() or "0")
                    centiseconds_adj = int(adjustment_data['centiseconds'].get() or "0")
                    
                    # Skip if no adjustment
                    if seconds_adj == 0 and centiseconds_adj == 0:
                        continue
                    
                    # Get the song from the data
                    song = self.data['games'][game_id]['songs'][song_id]
                    
                    if 'lrc' in song and song['lrc']:
                        # Adjust the LRC content
                        original_lrc = song['lrc']
                        adjusted_lrc = self.adjust_song_lrc(original_lrc, seconds_adj, centiseconds_adj)
                        
                        # Update the song data
                        self.data['games'][game_id]['songs'][song_id]['lrc'] = adjusted_lrc
                        changes_made += 1
                        
                except ValueError:
                    messagebox.showerror("Error", f"Invalid time values for song: {adjustment_data['song_data'].get('title', 'Unknown')}")
                    return
            
            if changes_made > 0:
                messagebox.showinfo("Success", f"Applied timing adjustments to {changes_made} song(s)")
            else:
                messagebox.showinfo("Info", "No changes to apply (all adjustments are zero)")
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to apply changes: {str(e)}")
    
    def save_file(self):
        """Save the modified data to a new file"""
        if not self.data:
            messagebox.showerror("Error", "No data to save")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="Save Modified File",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(self.data, f, indent=2, ensure_ascii=False)
                
                messagebox.showinfo("Success", f"File saved successfully to:\n{file_path}")
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save file: {str(e)}")
    
    def run(self):
        """Run the application"""
        self.root.mainloop()


def main():
    """Main entry point"""
    if GUI_AVAILABLE:
        try:
            app = LRCTimingEditor()
            app.run()
        except Exception as e:
            print(f"GUI failed to start: {e}")
            print("Falling back to CLI mode...")
            print("Please use lrc_timing_editor_cli.py for command-line interface")
    else:
        print("GUI not available (Tkinter not found)")
        print("Please use lrc_timing_editor_cli.py for command-line interface")


if __name__ == "__main__":
    main()