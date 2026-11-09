import { NewSessionButton } from "./new-session-button";
import { TryDemo } from "./try-demo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-display text-5xl font-semibold tracking-tight">Quorum</h1>
      <p className="max-w-xl text-center text-zinc-600">A planning agent your whole team steers together, live. When people&apos;s rules collide, it asks the owners instead of guessing.</p>
      <NewSessionButton />
      <TryDemo />
    </main>
  );
}
