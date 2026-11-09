import { NewSessionButton } from "./new-session-button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-display text-5xl font-semibold tracking-tight">Quorum</h1>
      <NewSessionButton />
    </main>
  );
}
