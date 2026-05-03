import { Suspense } from 'react';

import ViewerClient from './viewer-client';

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading viewer...</div>}>
      <ViewerClient />
    </Suspense>
  );
}
