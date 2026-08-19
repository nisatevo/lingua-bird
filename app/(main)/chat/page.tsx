import { auth } from "@clerk/nextjs/server";

import { FeedWrapper } from "@/components/feed-wrapper";

import { ChatPractice } from "./practice";

const ChatPage = async () => {
  await auth.protect();

  return (
    <FeedWrapper>
      <ChatPractice />
    </FeedWrapper>
  );
};

export default ChatPage;
