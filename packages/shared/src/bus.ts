import type { Meeting, ExcalidrawDemoData } from './types';

// Payloads are deeply readonly so cross-app subscribers can't mutate host state by reference;
// chosen over runtime cloning because the project is strict-TS end-to-end and Excalidraw is debounced.
type DeepReadonly<T> =
  T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

type BusEvents = {
  'context:request': {};
  'event:selected':  DeepReadonly<{ meetingId: string; initialData: Meeting }>;
  'drawing:changed': DeepReadonly<{ meetingId: string; excalidrawData: ExcalidrawDemoData }>;
  'diagram:changed': DeepReadonly<{ meetingId: string; mermaidSource: string }>;
};

const bus = ((globalThis as any).frankensteinBus ??= new EventTarget()) as EventTarget;

export function emit<K extends keyof BusEvents>(name: K, payload: BusEvents[K]) {
  bus.dispatchEvent(new CustomEvent(name, { detail: payload }));
}

export function on<K extends keyof BusEvents>(
  name: K,
  handler: (payload: BusEvents[K]) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  bus.addEventListener(name, listener);
  return () => bus.removeEventListener(name, listener);
}
