export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      )}
    </header>
  );
}

/** Emplacement d'une fonctionnalité prévue par une étape ultérieure du brief. */
export function PlaceholderCard({ step }: { step: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-6 text-center">
      <p className="font-medium">قيد الإنجاز</p>
      <p className="mt-1 text-sm text-slate-500">{step}</p>
    </div>
  );
}
