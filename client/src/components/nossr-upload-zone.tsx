// NoSsrUploadZone.tsx
import React, { useEffect, useState, Suspense } from "react";

// Lazy-load the actual UploadZone
const LazyUploadZone = React.lazy(() => import("./upload-zone"));

/**
 * This wrapper ensures the code only runs in the browser:
 * 1) It does nothing when "typeof window === 'undefined'" (server).
 * 2) Waits until after mount to load the real component.
 */
export default function NoSsrUploadZone(props: any) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // On the server or before client hydration, render nothing (or a fallback)
    return null;
  }

  // On the browser, render the lazy component
  return (
    <Suspense fallback={<div>Loading dropzone...</div>}>
      <LazyUploadZone {...props} />
    </Suspense>
  );
}
