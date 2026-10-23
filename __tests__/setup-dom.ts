import { afterEach, expect } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

const { fetch, Request, Response, Headers } = globalThis;
GlobalRegistrator.register({ url: 'http://localhost:3000' });
Object.assign(globalThis, { fetch, Request, Response, Headers, IS_REACT_ACT_ENVIRONMENT: true });

const { cleanup } = await import('@testing-library/react');
const { default: _default, ...matchers } = await import('@testing-library/jest-dom/matchers');
expect.extend(matchers);
afterEach(cleanup);

declare module 'bun:test' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Merge DOM matchers into Bun's assertions.
  interface Matchers<T> extends TestingLibraryMatchers<void, T> {}
}
