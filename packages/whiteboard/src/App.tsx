import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import type { ExcalidrawDemoData } from '@frankenstein/shared/types';
import { useEffect, useMemo, useRef } from 'react';
import { debounce } from './debounce';

type Props = {
  initialData: ExcalidrawDemoData | null;
  onChange: (data: ExcalidrawDemoData) => void;
};

const APPSTATE_KEYS = ['viewBackgroundColor', 'gridSize', 'gridStep', 'gridModeEnabled'] as const;

// Excalidraw fires onChange on every render (resize, scroll, select, mount).
// element.version only bumps on real mutations, so this dedups cheap re-renders.
const elementFingerprint = (elements: readonly ExcalidrawElement[]): string =>
  elements.map((e) => `${e.id}:${e.version ?? 0}`).join('|');

export function App({ initialData, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const debounced = useMemo(
    () => debounce((data: ExcalidrawDemoData) => onChangeRef.current(data), 500),
    [],
  );

  const prevFingerprintRef = useRef<string>('');
  const mountedRef = useRef(false);
  if (!mountedRef.current) {
    mountedRef.current = true;
    prevFingerprintRef.current = elementFingerprint(
      (initialData?.elements ?? []) as ExcalidrawElement[],
    );
  }

  // Excalidraw is uncontrolled: `initialData` is consumed only on mount.
  // For meeting switches we drive the canvas via the imperative API.
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  useEffect(() => {
    const els = (initialData?.elements ?? []) as ExcalidrawElement[];
    prevFingerprintRef.current = elementFingerprint(els);
    apiRef.current?.updateScene({
      elements: els,
      appState: initialData?.appState ?? {},
    });
  }, [initialData]);

  const handleChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    _files: BinaryFiles,
  ) => {
    const fp = elementFingerprint(elements);
    if (fp === prevFingerprintRef.current) return;
    prevFingerprintRef.current = fp;
    const trimmed: ExcalidrawDemoData = {
      elements: [...elements] as ExcalidrawElement[],
      appState: Object.fromEntries(
        APPSTATE_KEYS.map((k) => [k, appState[k]]),
      ) as ExcalidrawDemoData['appState'],
    };
    debounced(trimmed);
  };
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Excalidraw
        initialData={initialData ?? undefined}
        onChange={handleChange}
        excalidrawAPI={(api) => (apiRef.current = api)}
      />
    </div>
  );
}
