'use client';

import { GraphProvider } from '../../context/GraphContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GraphProvider>
      {children}
    </GraphProvider>
  );
}
