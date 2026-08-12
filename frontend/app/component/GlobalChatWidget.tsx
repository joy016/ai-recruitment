"use client";

import ChatBox from "@/app/component/ChatBox";

export default function GlobalChatWidget() {
  return (
    <ChatBox
      defaultOpen={false}
      initialMessages={[
        {
          id: "assistant-welcome",
          role: "assistant",
          content:
            "Hi, I am your recruiting assistant. Ask me to summarize candidates, draft questions, or improve job descriptions.",
        },
      ]}
      onSendMessage={async (prompt) => {
        return `Received: ${prompt}\n\nConnect this callback to your AI API route when ready.`;
      }}
    />
  );
}
