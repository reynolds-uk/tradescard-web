// app/components/PageHeader.tsx
export default function PageHeader({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-neutral-400">{subtitle}</p>}
      </div>
      {aside}
    </header>
  );
}