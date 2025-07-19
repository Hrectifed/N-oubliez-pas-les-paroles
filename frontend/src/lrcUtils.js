// Parse LRC file content into array of { time, text }
export function parseLRC(lrc) {
  const lines = lrc.split('\n');
  const result = [];
  const timeExp = /\[(\d+):(\d+)(?:\.(\d+))?\]/;
  for (const line of lines) {
    const match = line.match(timeExp);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = min * 60 * 1000 + sec * 1000 + ms;
      const text = line.replace(timeExp, '').trim();
      result.push({ time, text });
    }
  }
  return result;
}
