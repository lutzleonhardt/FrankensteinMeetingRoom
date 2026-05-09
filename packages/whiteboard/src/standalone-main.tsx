import { createRoot } from 'react-dom/client';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawDemoData } from '@frankenstein/shared/types';
import { App } from './App';

const initialData: ExcalidrawDemoData | null = null;
const onChange = (data: ExcalidrawDemoData) => {
  console.log('[standalone] drawing:changed', data);
};

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');
createRoot(root).render(<App initialData={initialData} onChange={onChange} />);
