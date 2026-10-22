import { describe, it, expect } from "vitest";
import { createSSEParser } from "@/lib/chat/sse";

const evt = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe("createSSEParser", () => {
  it("parses several events delivered in one read", () => {
    const p = createSSEParser();
    const out = p.push(evt("start", { type: "business" }) + evt("chunk", { content: "Hi" }));
    expect(out).toEqual([
      { event: "start", data: { type: "business" } },
      { event: "chunk", data: { content: "Hi" } },
    ]);
  });

  it("keeps an event split between `event:` and `data:` across two reads", () => {
    const p = createSSEParser();
    expect(p.push("event: complete\n")).toEqual([]);
    expect(p.push('data: {"usedOpenAI":true}\n\n')).toEqual([{ event: "complete", data: { usedOpenAI: true } }]);
  });

  it("keeps an event whose JSON payload is split mid-way", () => {
    const p = createSSEParser();
    const whole = evt("done", { type: "business", content: "A long final post" });
    const cut = Math.floor(whole.length / 2);
    expect(p.push(whole.slice(0, cut))).toEqual([]);
    expect(p.push(whole.slice(cut))).toEqual([
      { event: "done", data: { type: "business", content: "A long final post" } },
    ]);
  });

  it("survives byte-by-byte delivery", () => {
    const p = createSSEParser();
    const stream = evt("phase", { phase: "writing" }) + evt("error", { message: "boom" });
    const events = [...stream].flatMap((ch) => p.push(ch));
    expect(events.map((e) => e.event)).toEqual(["phase", "error"]);
  });

  it("accepts CRLF separators", () => {
    const p = createSSEParser();
    expect(p.push('event: chunk\r\ndata: {"content":"x"}\r\n\r\n')).toEqual([
      { event: "chunk", data: { content: "x" } },
    ]);
  });

  it("flush returns a final event that lacks the trailing blank line", () => {
    const p = createSSEParser();
    expect(p.push('event: complete\ndata: {"ok":1}')).toEqual([]);
    expect(p.flush()).toEqual([{ event: "complete", data: { ok: 1 } }]);
    expect(p.flush()).toEqual([]);
  });

  it("does not throw on malformed JSON", () => {
    const p = createSSEParser();
    expect(p.push("event: chunk\ndata: {not json}\n\n")).toEqual([{ event: "chunk", data: "{not json}" }]);
  });
});
