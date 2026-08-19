const ChatLoadingPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200" />
      <div className="h-96 w-full animate-pulse rounded-xl bg-slate-100" />
      <div className="h-32 w-full animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
};

export default ChatLoadingPage;
