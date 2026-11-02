import React from 'react';
import { IslandAppLayout } from '@/components/IslandAppLayout';

export default function MainRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <IslandAppLayout>{children}</IslandAppLayout>;
}
