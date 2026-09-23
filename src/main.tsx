import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/main.scss';
import { useGameStore } from './store/gameStore';
import { connectTelemetry } from './service/telemetry/runtime';

const disconnectTelemetry = connectTelemetry(useGameStore);
if (import.meta.hot) import.meta.hot.dispose(disconnectTelemetry);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
