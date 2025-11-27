import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin para injetar timestamp e version no HTML
const injectBuildInfo = () => {
  // Gera um hash único baseado no timestamp e um número aleatório
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  const buildHash = `${timestamp.toString(36)}-${random}`
  
  return {
    name: 'inject-build-info',
    transformIndexHtml(html: string) {
      // Adiciona meta tags de build info e cache control logo após <head>
      let modifiedHtml = html.replace(
        '<head>',
        `<head>\n    <meta name="build-timestamp" content="${timestamp}" />\n    <meta name="build-hash" content="${buildHash}" />\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n    <meta http-equiv="Pragma" content="no-cache" />\n    <meta http-equiv="Expires" content="0" />`
      )
      
      // Para desenvolvimento: adiciona query string ao script de desenvolvimento
      if (modifiedHtml.includes('/src/main.tsx')) {
        modifiedHtml = modifiedHtml.replace(
          '<script type="module" src="/src/main.tsx"></script>',
          `<script type="module" src="/src/main.tsx?v=${buildHash}"></script>`
        )
      }
      
      return modifiedHtml
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), injectBuildInfo()],
  build: {
    // Limpar o diretório de output antes de cada build
    emptyOutDir: true,
    // Garantir builds determinísticos
    sourcemap: false,
    minify: 'esbuild', // esbuild é mais rápido que terser
    // Target mais específico para melhor otimização
    target: 'es2020',
    cssCodeSplit: true,
    // Otimizações adicionais
    chunkSizeWarningLimit: 500, // Avisar se chunk > 500KB (mais restritivo)
    reportCompressedSize: true, // Reportar tamanho comprimido
    // Minificar CSS em produção
    cssMinify: true
  },
  // Otimização de dependências pré-empacotadas
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'date-fns'
    ],
    // Excluir tesseract.js do pré-empacotamento (carregar apenas quando necessário)
    exclude: ['tesseract.js']
  }
})
