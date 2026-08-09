import { Link } from "react-router-dom";

export function CreatePidPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 md:p-8">
      <header>
        <h1 className="text-3xl font-semibold">Editor P&ID</h1>
      </header>
      <Link className="w-fit text-sm font-medium underline" to="/">
        Voltar ao DCOU
      </Link>
    </main>
  );
}
