import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import { castAgentMessage } from "../test-helpers/agent-message-fixtures.js";
import { dropThinkingBlocks, isAssistantMessageWithContent } from "./thinking.js";

describe("isAssistantMessageWithContent", () => {
  it("accepts assistant messages with array content and rejects others", () => {
    const assistant = castAgentMessage({
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
    });
    const user = castAgentMessage({ role: "user", content: "hi" });
    const malformed = castAgentMessage({ role: "assistant", content: "not-array" });

    expect(isAssistantMessageWithContent(assistant)).toBe(true);
    expect(isAssistantMessageWithContent(user)).toBe(false);
    expect(isAssistantMessageWithContent(malformed)).toBe(false);
  });
});

describe("dropThinkingBlocks", () => {
  it("returns the original reference when no thinking blocks are present", () => {
    const messages: AgentMessage[] = [
      castAgentMessage({ role: "user", content: "hello" }),
      castAgentMessage({ role: "assistant", content: [{ type: "text", text: "world" }] }),
    ];

    const result = dropThinkingBlocks(messages);
    expect(result).toBe(messages);
  });

  it("drops thinking blocks while preserving non-thinking assistant content", () => {
    const messages: AgentMessage[] = [
      castAgentMessage({
        role: "assistant",
        content: [
          { type: "thinking", thinking: "internal" },
          { type: "text", text: "final" },
        ],
      }),
    ];

    const result = dropThinkingBlocks(messages);
    const assistant = result[0] as Extract<AgentMessage, { role: "assistant" }>;
    expect(result).not.toBe(messages);
    expect(assistant.content).toEqual([{ type: "text", text: "final" }]);
  });

  it("keeps assistant turn structure when all content blocks were thinking", () => {
    const messages: AgentMessage[] = [
      castAgentMessage({
        role: "assistant",
        content: [{ type: "thinking", thinking: "internal-only" }],
      }),
    ];

    const result = dropThinkingBlocks(messages);
    const assistant = result[0] as Extract<AgentMessage, { role: "assistant" }>;
    expect(assistant.content).toEqual([{ type: "text", text: "" }]);
  });

  it("drops redacted_thinking blocks while preserving non-thinking content", () => {
    const messages: AgentMessage[] = [
      castAgentMessage({
        role: "assistant",
        content: [
          { type: "redacted_thinking", data: "AQID" },
          { type: "text", text: "response" },
        ],
      }),
    ];

    const result = dropThinkingBlocks(messages);
    const assistant = result[0] as Extract<AgentMessage, { role: "assistant" }>;
    expect(result).not.toBe(messages);
    expect(assistant.content).toEqual([{ type: "text", text: "response" }]);
  });

  it("drops both thinking and redacted_thinking blocks in the same message", () => {
    const messages: AgentMessage[] = [
      castAgentMessage({
        role: "assistant",
        content: [
          { type: "thinking", thinking: "visible thinking" },
          { type: "redacted_thinking", data: "AQID" },
          { type: "text", text: "final answer" },
        ],
      }),
    ];

    const result = dropThinkingBlocks(messages);
    const assistant = result[0] as Extract<AgentMessage, { role: "assistant" }>;
    expect(assistant.content).toEqual([{ type: "text", text: "final answer" }]);
  });

  it("keeps assistant turn structure when all blocks are redacted_thinking", () => {
    const messages: AgentMessage[] = [
      castAgentMessage({
        role: "assistant",
        content: [{ type: "redacted_thinking", data: "AQID" }],
      }),
    ];

    const result = dropThinkingBlocks(messages);
    const assistant = result[0] as Extract<AgentMessage, { role: "assistant" }>;
    expect(assistant.content).toEqual([{ type: "text", text: "" }]);
  });

  it("returns the original reference when only non-thinking blocks are present", () => {
    const messages: AgentMessage[] = [
      castAgentMessage({
        role: "assistant",
        content: [
          { type: "text", text: "no thinking here" },
          { type: "toolUse", id: "tu_1", name: "read", input: {} },
        ],
      }),
    ];

    const result = dropThinkingBlocks(messages);
    expect(result).toBe(messages);
  });
});
