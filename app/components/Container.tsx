'use client';

import type { ReactNode } from 'react';

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

type Props = {
  children: ReactNode;
  className?: string;
};

export default function Container({ children, className }: Props) {
  return (
    <div className={cx('mx-auto max-w-5xl px-4', className)}>
      {children}
    </div>
  );
}