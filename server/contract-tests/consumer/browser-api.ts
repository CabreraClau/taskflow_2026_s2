import { api, setToken } from '../../../client/src/lib/api';

export { api };

// Conserva el cliente real: sólo aporta las APIs del navegador que faltan en Node
// y dirige sus URLs relativas al servidor HTTP de Pact, sin simular respuestas.
export async function withBrowserApi<T>(
  baseUrl: string,
  token: string | null,
  run: () => Promise<T>,
): Promise<T> {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

  const realFetch = globalThis.fetch;
  const transport = jest.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
    realFetch(typeof input === 'string' ? new URL(input, baseUrl) : input, init),
  );

  try {
    if (token) setToken(token);
    return await run();
  } finally {
    transport.mockRestore();
    if (previousStorage) {
      Object.defineProperty(globalThis, 'localStorage', previousStorage);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  }
}
