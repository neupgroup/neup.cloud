'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import NProgress from 'nprogress';

export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    const handleStart = () => NProgress.start();
    const handleStop = () => NProgress.done();

    handleStop(); // Stop progress on initial load

    return () => {
      handleStop(); // Ensure progress stops on component unmount
    };
  }, []);

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  // This is a component that will not render anything
  return null;
}
