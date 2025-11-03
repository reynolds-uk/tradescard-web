type Props = { title: string; subtitle?: string; aside?: React.ReactNode };
export default function PageHeader({ title, subtitle, aside }: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-neutral-400">{subtitle}</p>}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}