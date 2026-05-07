// TODO: replace with @excalidraw/excalidraw type when M3 lands
type ExcalidrawElement = unknown;

export type ExcalidrawDemoData = {
  elements: ExcalidrawElement[];
  appState?: Partial<{
    viewBackgroundColor: string;
    gridSize: number;
    gridStep: number;
    gridModeEnabled: boolean;
  }>;
};

export type Meeting = {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  excalidrawData?: ExcalidrawDemoData;
  mermaidSource?: string;
  updatedAt: string;
  excalidrawUpdatedAt?: string;
  mermaidUpdatedAt?: string;
};
