
'use client';

import React from 'react';
import DomainDetailsLayout from '../page';

export default function NameserversLayout({ children }: { children: React.ReactNode }) {
  return <DomainDetailsLayout>{children}</DomainDetailsLayout>;
}
