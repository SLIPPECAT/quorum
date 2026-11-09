import { Suspense } from "react";
import { WorkspaceHome } from "./workspace-home";

export default function WorkspacePage({ params, searchParams }: PageProps<"/w/[ws]">) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}>
      <Workspace params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Workspace({ params, searchParams }: Pick<PageProps<"/w/[ws]">, "params" | "searchParams">) {
  const { ws } = await params;
  const { name } = await searchParams;
  return <WorkspaceHome ws={ws} name={typeof name === "string" ? name.trim() : ""} />;
}
