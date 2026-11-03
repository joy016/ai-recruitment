import { Suspense } from "react";
import InboxPage from "./(components)/InboxPage";

// InboxPage reads ?thread= with useSearchParams, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <InboxPage />
    </Suspense>
  );
}
