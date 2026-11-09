import { Suspense } from "react";
import { JoinForm } from "./join-form";
import { SessionRoom } from "./session-room";

export default function SessionPage({ params, searchParams }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}>
      <Session params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Session({
  params,
  searchParams,
}: Pick<PageProps<"/s/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { name } = await searchParams;
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return <JoinForm id={id} />;
  return <SessionRoom roomId={id} name={trimmed} />;
}
