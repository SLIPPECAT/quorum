import { Suspense } from "react";
import { NameForm } from "./name-form";
import { RulesRoom } from "./rules-room";

export default function RulesPage({ params, searchParams }: PageProps<"/w/[ws]/rules">) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}>
      <Rules params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Rules({
  params,
  searchParams,
}: Pick<PageProps<"/w/[ws]/rules">, "params" | "searchParams">) {
  const { ws } = await params;
  const { name } = await searchParams;
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return <NameForm ws={ws} />;
  return <RulesRoom ws={ws} name={trimmed} />;
}
