import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/globals.css';
import './styles/theme.css';
import './styles/glass.css';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root não encontrado');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
    <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
