# Next.js Data Fetching Pattern with React 'use' Hook

This document describes the data fetching pattern implemented in PR Cat, using Next.js Server Components and React's `use` hook.

## Overview

The pattern consists of:

1. **Server Components** that fetch data and pass promises to client components
2. **Client Components** that resolve promises using the `use` hook
3. **Service Modules** that contain the data fetching logic

This approach provides several benefits:
- Data is fetched on the server, reducing client-side JavaScript
- Initial rendering is faster with server-side data
- Client components receive data without loading states
- Better error handling through React's Suspense boundaries

## Implementation Steps

### 1. Create Service Modules

Service modules handle the data fetching logic and are placed in `app/api/services/`:

```typescript
// app/api/services/example-data.ts
export async function getData(): Promise<DataType[]> {
  // Logic to fetch data
  return data;
}
```

### 2. Server Component

The server component imports the service and passes promises to client components:

```typescript
// app/some-page/page.tsx
import { getData } from '@/app/api/services/example-data';
import { DataDisplay } from '@/components/data-display';
import { Suspense } from 'react';

export default function Page() {
  // Don't await - pass the promise directly
  const dataPromise = getData();
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DataDisplay dataPromise={dataPromise} />
    </Suspense>
  );
}
```

### 3. Client Component

The client component uses the React `use` hook to resolve the promise:

```typescript
// components/data-display.tsx
"use client";

import { use } from 'react';

interface DataDisplayProps {
  dataPromise: Promise<DataType[]>;
}

export function DataDisplay({ dataPromise }: DataDisplayProps) {
  // Resolve the promise with the 'use' hook
  const data = use(dataPromise);
  
  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

## Real-World Example

A real implementation example can be seen in the settings page:

- `app/dashboard/settings/page.tsx` - Server component that fetches data
- `components/settings-content.tsx` - Client component that resolves the promise

## Considerations

- Always wrap client components that use `use` with Suspense boundaries
- Handle errors appropriately with Error Boundaries
- The `use` hook only works in client components, not in server components

## References

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React `use` Hook](https://react.dev/reference/react/use)
- [React Suspense](https://react.dev/reference/react/Suspense) 