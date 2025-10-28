import { WorkflowBuilder } from "@/components/workflow-builder";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100 px-4 py-16 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-slate-900 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl space-y-12">
        <WorkflowBuilder />
      </div>
    </div>
  );
}
