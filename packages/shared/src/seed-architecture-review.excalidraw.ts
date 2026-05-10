import type { ExcalidrawDemoData } from './types';

// Hand-built sketch for the Architecture Review seed: three framework boxes
// (Angular host / React whiteboard / Svelte mermaid) arrow-pointing to a
// central frankensteinBus node. Chip-border colors mirror the brand palette
// the host chrome will use in T13 (#DD0031 / #61DAFB / #FF3E00).
//
// Layout (canvas ~800×520):
//   ┌───────────────────────────┐
//   │      Angular Host         │  (top, centered)
//   └────────────┬──────────────┘
//                ↓
//   ┌───────────────────────────┐
//   │     frankensteinBus       │  (center)
//   └────┬─────────────────┬────┘
//        ↑                 ↑
//   ┌────────┐         ┌────────┐
//   │ React  │         │ Svelte │
//   │Whitebd │         │Mermaid │
//   └────────┘         └────────┘
//
// ExcalidrawElement is typed as `unknown` in @frankenstein/shared/types, so
// this literal goes through without strict-shape pressure. Excalidraw's
// `restoreElements` fills in defaults for any field omitted here.

const NOW = 1747000000000;

export const architectureReviewExcalidraw: ExcalidrawDemoData = {
  elements: [
    {
      id: 'rect-angular',
      type: 'rectangle',
      x: 320, y: 60, width: 200, height: 80,
      angle: 0,
      strokeColor: '#DD0031', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: { type: 3 },
      seed: 11111, version: 1, versionNonce: 100001,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
    },
    {
      id: 'text-angular',
      type: 'text',
      x: 340, y: 88, width: 160, height: 25,
      angle: 0,
      strokeColor: '#DD0031', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: null,
      seed: 11112, version: 1, versionNonce: 100002,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
      text: 'Angular Host', fontSize: 20, fontFamily: 1,
      textAlign: 'center', verticalAlign: 'middle',
      containerId: null, originalText: 'Angular Host',
      autoResize: true, lineHeight: 1.25,
    },
    {
      id: 'rect-bus',
      type: 'rectangle',
      x: 320, y: 240, width: 200, height: 80,
      angle: 0,
      strokeColor: '#1e1e1e', backgroundColor: '#fff3bf',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: { type: 3 },
      seed: 22221, version: 1, versionNonce: 200001,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
    },
    {
      id: 'text-bus',
      type: 'text',
      x: 340, y: 268, width: 160, height: 25,
      angle: 0,
      strokeColor: '#1e1e1e', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: null,
      seed: 22222, version: 1, versionNonce: 200002,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
      text: 'frankensteinBus', fontSize: 20, fontFamily: 1,
      textAlign: 'center', verticalAlign: 'middle',
      containerId: null, originalText: 'frankensteinBus',
      autoResize: true, lineHeight: 1.25,
    },
    {
      id: 'rect-react',
      type: 'rectangle',
      x: 80, y: 420, width: 200, height: 80,
      angle: 0,
      strokeColor: '#61DAFB', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: { type: 3 },
      seed: 33331, version: 1, versionNonce: 300001,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
    },
    {
      id: 'text-react',
      type: 'text',
      x: 100, y: 448, width: 160, height: 25,
      angle: 0,
      strokeColor: '#61DAFB', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: null,
      seed: 33332, version: 1, versionNonce: 300002,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
      text: 'React Whiteboard', fontSize: 20, fontFamily: 1,
      textAlign: 'center', verticalAlign: 'middle',
      containerId: null, originalText: 'React Whiteboard',
      autoResize: true, lineHeight: 1.25,
    },
    {
      id: 'rect-svelte',
      type: 'rectangle',
      x: 560, y: 420, width: 200, height: 80,
      angle: 0,
      strokeColor: '#FF3E00', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: { type: 3 },
      seed: 44441, version: 1, versionNonce: 400001,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
    },
    {
      id: 'text-svelte',
      type: 'text',
      x: 580, y: 448, width: 160, height: 25,
      angle: 0,
      strokeColor: '#FF3E00', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: null,
      seed: 44442, version: 1, versionNonce: 400002,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
      text: 'Svelte Mermaid', fontSize: 20, fontFamily: 1,
      textAlign: 'center', verticalAlign: 'middle',
      containerId: null, originalText: 'Svelte Mermaid',
      autoResize: true, lineHeight: 1.25,
    },
    {
      id: 'arrow-angular-bus',
      type: 'arrow',
      x: 420, y: 140, width: 0, height: 100,
      angle: 0,
      strokeColor: '#1e1e1e', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: { type: 2 },
      seed: 55551, version: 1, versionNonce: 500001,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
      points: [[0, 0], [0, 100]],
      lastCommittedPoint: null,
      startBinding: null, endBinding: null,
      startArrowhead: null, endArrowhead: 'arrow',
      elbowed: false,
    },
    {
      id: 'arrow-react-bus',
      type: 'arrow',
      x: 180, y: 420, width: 200, height: 100,
      angle: 0,
      strokeColor: '#1e1e1e', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: { type: 2 },
      seed: 66661, version: 1, versionNonce: 600001,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
      points: [[0, 0], [200, -100]],
      lastCommittedPoint: null,
      startBinding: null, endBinding: null,
      startArrowhead: null, endArrowhead: 'arrow',
      elbowed: false,
    },
    {
      id: 'arrow-svelte-bus',
      type: 'arrow',
      x: 660, y: 420, width: 200, height: 100,
      angle: 0,
      strokeColor: '#1e1e1e', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 1, opacity: 100,
      groupIds: [], frameId: null, roundness: { type: 2 },
      seed: 77771, version: 1, versionNonce: 700001,
      isDeleted: false, boundElements: null, updated: NOW,
      link: null, locked: false,
      points: [[0, 0], [-200, -100]],
      lastCommittedPoint: null,
      startBinding: null, endBinding: null,
      startArrowhead: null, endArrowhead: 'arrow',
      elbowed: false,
    },
  ],
  appState: {
    viewBackgroundColor: '#ffffff',
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
  },
};
