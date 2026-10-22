/**
 * Incremental Server-Sent Events parser for the /api/generate stream.
 *
 * The previous parser split the buffer on single "\n" and read the `data:`
 * line as "the next line after `event:`". When a network read ended between
 * those two lines (or inside the `data:` line), the event was silently
 * dropped — including `done` / `complete` / `error`, which left the UI
 * "generating" forever. This parser only emits an event once its whole block
 * (terminated by a blank line) has arrived, exactly like the Strategist's.
 */

export interface SSEEvent {
  event: string;
  data: unknown;
}

export interface SSEParser {
  /** Feed a decoded chunk; returns every event completed by it, in order. */
  push(chunk: string): SSEEvent[];
  /** Call once the stream ends: returns a final event if the server omitted the trailing blank line. */
  flush(): SSEEvent[];
}

function parseBlock(block: string): SSEEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  const raw = dataLines.join("\n");
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    // A malformed payload must not kill the stream: surface it as-is.
    return { event, data: raw };
  }
}

export function createSSEParser(): SSEParser {
  let buffer = "";

  const drain = (): SSEEvent[] => {
    const events: SSEEvent[] = [];
    // Normalize CRLF so "\r\n\r\n" separators are found too.
    buffer = buffer.replace(/\r\n/g, "\n");
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const evt = parseBlock(block);
      if (evt) events.push(evt);
      sep = buffer.indexOf("\n\n");
    }
    return events;
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      return drain();
    },
    flush() {
      const rest = buffer.trim();
      buffer = "";
      if (!rest) return [];
      const evt = parseBlock(rest);
      return evt ? [evt] : [];
    },
  };
}
