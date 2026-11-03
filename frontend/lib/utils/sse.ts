/**
 * Minimal fetch-based Server-Sent Events reader. Unlike EventSource it can
 * send an Authorization header, so the JWT never goes in the URL.
 */

export class SseHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Event stream request failed with status ${status}.`);
    this.name = "SseHttpError";
    this.status = status;
  }
}

export type SseMessage = { event: string; data: string };

type StreamSseOptions = {
  headers: Record<string, string>;
  signal: AbortSignal;
  /** Called once the server accepted the connection. */
  onOpen?: () => void;
  onMessage: (message: SseMessage) => void;
};

/** Resolves when the server closes the stream; rejects on errors or abort. */
export const streamSse = async (
  url: string,
  { headers, signal, onOpen, onMessage }: StreamSseOptions,
): Promise<void> => {
  const response = await fetch(url, {
    headers: { Accept: "text/event-stream", ...headers },
    cache: "no-store",
    signal,
  });
  if (!response.ok || !response.body) {
    throw new SseHttpError(response.status);
  }
  onOpen?.();

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let event = "message";
  let data: string[] = [];

  const handleLine = (line: string) => {
    if (line === "") {
      if (data.length > 0) onMessage({ event, data: data.join("\n") });
      event = "message";
      data = [];
      return;
    }
    if (line.startsWith(":")) return; // comment / keep-alive
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    const lines = buffer.split(/\r\n|\r|\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
};
