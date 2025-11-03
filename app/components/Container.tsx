// app/components/Container.tsx
export default function Container({ children }: { children: React.ReactNode }) {
  // One source of truth for page width & padding
  return <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>;
}