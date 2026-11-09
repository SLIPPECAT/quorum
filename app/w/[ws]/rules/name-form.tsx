import Form from "next/form";

export function NameForm({ ws }: { ws: string }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Form action={`/w/${ws}/rules`} className="card flex w-full max-w-sm flex-col gap-4 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">c0mpiled Ops</p>
          <h1 className="font-display mt-1 text-2xl font-semibold">Open the rule map</h1>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Your name
          <input
            name="name"
            required
            autoFocus
            className="rounded-lg border border-line px-3 py-2 font-normal outline-none focus:border-blue"
          />
        </label>
        <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Open rule map
        </button>
        <p className="text-xs text-muted">
          Use the name you use in sessions. Only a rule&apos;s owner can confirm or retire it.
        </p>
      </Form>
    </main>
  );
}
