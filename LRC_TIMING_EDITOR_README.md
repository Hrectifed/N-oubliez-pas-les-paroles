# LRC Timing Editor

A tool to adjust timing in LRC (lyrics) data from exported JSON files from N'oubliez pas les paroles.

## Files

- `lrc_timing_editor.py` - GUI version (requires Tkinter)
- `lrc_timing_editor_cli.py` - Command-line version

## Features

- Parse exported JSON files from the game
- Display all songs with their LRC timing data
- Allow adjusting timestamps by adding or subtracting seconds and centiseconds
- Support both positive and negative time adjustments
- Prevent timestamps from going negative
- **Automatically updates both LRC strings and parsed lyrics timing data**
- Save modified files with corrected timing

## Usage

### GUI Version

```bash
python3 lrc_timing_editor.py
```

The GUI will open with:
1. File browser to select an export file
2. Scrollable list of songs with timing adjustment inputs
3. Buttons to apply changes and save the modified file

### CLI Version

```bash
python3 lrc_timing_editor_cli.py
```

The CLI will prompt you for:
1. Path to the export file
2. Time adjustments for each song (seconds and centiseconds)
3. Output file path

### Time Adjustment Format

- **Seconds**: Integer value (can be negative)
- **Centiseconds**: Integer value (can be negative)
- Example: +2 seconds and +50 centiseconds = +2s +50cs = +2.50 seconds total
- Example: -1 second and -25 centiseconds = -1s -25cs = -1.25 seconds total

## Data Format

The tool works with exported JSON files containing game data. For each song, the tool updates both:

1. **LRC field** (`lrc`): Raw LRC format string with timestamps like `[mm:ss.cc]`
2. **Lyrics field** (`lyrics`): Parsed array of timing objects with millisecond precision

This ensures compatibility with the game's backend that uses both formats.

## LRC Format

The tool works with LRC format timestamps: `[mm:ss.cc]`
- `mm`: minutes (00-99)
- `ss`: seconds (00-59)  
- `cc`: centiseconds (00-99)

Example:
```
[00:09.05]Allons enfant de la patrie
[00:12.56]Le jour de gloire est arrivé
```

## Requirements

- Python 3.6+
- For GUI version: tkinter (usually included with Python)

## Example

Original timing:
```
[00:09.05]First line
[00:12.56]Second line
```

After adjusting by +2 seconds +30 centiseconds:
```
[00:11.35]First line
[00:14.86]Second line
```