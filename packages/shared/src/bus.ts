import type { Meeting, ExcalidrawDemoData } from './types';

// Payloads are deeply readonly so cross-app subscribers can't mutate host state by reference;
// chosen over runtime cloning because the project is strict-TS end-to-end and Excalidraw is debounced.
type DeepReadonly<T> =
  T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

// Single source of truth for the bus event-name set. `BusEventName` is derived
// from this tuple so subscribers can iterate it at runtime; the
// `_busEventsExhaustive` assertion below keeps the tuple and the payload map
// in lockstep at compile time.
export const ALL_BUS_EVENTS = [
  'context:request',
  'event:selected',
  'drawing:changed',
  'diagram:changed',
] as const;

export type BusEventName = (typeof ALL_BUS_EVENTS)[number];

export type BusEvents = {
  'context:request': {};
  'event:selected':  DeepReadonly<{ meetingId: string; initialData: Meeting }>;
  'drawing:changed': DeepReadonly<{ meetingId: string; excalidrawData: ExcalidrawDemoData }>;
  'diagram:changed': DeepReadonly<{ meetingId: string; mermaidSource: string }>;
};

// Drift guard: if a name is added to ALL_BUS_EVENTS without a payload entry in
// BusEvents (or vice-versa), one of the Exclude<> aliases becomes a non-never
// union and the assertion `true` no longer assignable.
type _MissingFromMap   = Exclude<BusEventName, keyof BusEvents>;
type _MissingFromTuple = Exclude<keyof BusEvents, BusEventName>;
type _ExhaustivenessAssertion =
  [_MissingFromMap, _MissingFromTuple] extends [never, never]
    ? true
    : ['BUS_EVENTS_OUT_OF_SYNC', _MissingFromMap, _MissingFromTuple];
const _busEventsExhaustive: _ExhaustivenessAssertion = true;
void _busEventsExhaustive;

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
