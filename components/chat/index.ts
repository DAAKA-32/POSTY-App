/**
 * Modern Chat Components - Central exports
 *
 * These components provide a clean, ChatGPT-like experience with:
 * - No borders/blocks around AI responses
 * - Plan-aware mode display (Free: none, Pro: selector, Max: dual)
 * - Optimized action buttons (removed Copy, kept Publish/Schedule)
 * - Premium, professional UX
 */

// Modern response display components
export { default as ModernResponseCard } from "./ModernResponseCard";
export { default as ModernAIResponsePair } from "./ModernAIResponsePair";

// Style selector for PRO plan
export { default as ModernStyleSelector } from "./ModernStyleSelector";

// Legacy components (kept for backwards compatibility if needed)
export { default as AIResponsePair } from "./AIResponsePair";
export { ResponseCard } from "./AIResponsePair";
export type { ResponseData } from "./AIResponsePair";

// Other chat components
export { default as ChatMessage } from "./ChatMessage";
export { TypingIndicator } from "./ChatMessage";
export { default as UniversalChatInput } from "./UniversalChatInput";
export { default as NewResponseIndicator } from "./NewResponseIndicator";
