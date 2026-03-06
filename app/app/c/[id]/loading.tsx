/**
 * Conversation route loading state.
 * Renders an invisible placeholder instead of a spinner to prevent
 * "Loading conversation..." from flashing during navigation.
 * The conversation page handles its own loading via the conversation cache.
 */
export default function ConversationLoading() {
  return (
    <div className="min-h-screen bg-background" />
  );
}
