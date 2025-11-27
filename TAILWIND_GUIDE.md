# Guia de Uso do Tailwind CSS

## Instalação Concluída ✅

O Tailwind CSS foi instalado e configurado com sucesso no seu projeto RealTrack!

## Arquivos de Configuração

- `tailwind.config.js` - Configuração principal do Tailwind
- `postcss.config.js` - Configuração do PostCSS
- `src/index.css` - Diretivas do Tailwind importadas

## Como Usar

### 1. Classes Utilitárias

Use classes do Tailwind diretamente nos seus componentes:

```tsx
<div className="bg-blue-500 text-white p-4 rounded-lg">
  <h1 className="text-2xl font-bold">Título</h1>
  <p className="text-blue-100">Conteúdo</p>
</div>
```

### 2. Sistema de Cores

O Tailwind oferece um sistema de cores completo:

- `bg-blue-500` - Background azul
- `text-gray-900` - Texto cinza escuro
- `border-red-300` - Borda vermelha
- `hover:bg-gray-100` - Background no hover

### 3. Espaçamento

Use classes de espaçamento consistentes:

- `p-4` - Padding de 1rem (16px)
- `m-2` - Margin de 0.5rem (8px)
- `space-y-4` - Espaçamento vertical entre elementos filhos

### 4. Grid e Flexbox

Sistemas de layout modernos:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<div className="flex items-center justify-between">
  <div>Esquerda</div>
  <div>Direita</div>
</div>
```

### 5. Responsividade

Use prefixos para breakpoints:

- `sm:` - 640px e acima
- `md:` - 768px e acima
- `lg:` - 1024px e acima
- `xl:` - 1280px e acima

```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  Responsivo!
</div>
```

## Integração com Sistema Existente

### Mantendo Variáveis CSS

Você pode continuar usando suas variáveis CSS existentes junto com Tailwind:

```css
/* Seu CSS existente */
:root {
  --bank-color: #10b981;
  --surface: #ffffff;
}
```

```tsx
<!-- No JSX com Tailwind -->
<div 
  className="p-4 rounded-lg shadow-md"
  style={{ 
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--bank-color)' 
  }}
>
  Conteúdo
</div>
```

### Dark Mode

O Tailwind suporta dark mode automaticamente:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Adapta ao tema!
</div>
```

## Componentes Criados

### StatCardTailwind
Versão aprimorada do StatCard usando Tailwind:
```tsx
import StatCardTailwind from './components/StatCardTailwind';

<StatCardTailwind
  title="Receita"
  value="R$ 12.450"
  helper="Este mês"
  color="emerald"
  icon={<DollarIcon />}
/>
```

### TailwindExample
Componente completo demonstrando vários recursos:
```tsx
import TailwindExample from './components/TailwindExample';

<TailwindExample />
```

## Boas Práticas

### 1. Componentes Reutilizáveis
Crie componentes para padrões repetitivos:

```tsx
const Button = ({ variant = 'primary', children, ...props }) => (
  <button
    className={`
      px-4 py-2 rounded-lg font-medium transition-colors
      ${variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
      ${variant === 'secondary' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : ''}
    `}
    {...props}
  >
    {children}
  </button>
);
```

### 2. Organização de Classes
Use a lógica para agrupar classes relacionadas:

```tsx
// ✅ Bom - agrupado por função
<div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800">

// ❌ Evitar - classes misturadas sem lógica
<div className="p-4 flex bg-white items-center justify-between dark:bg-gray-800">
```

### 3. Consistência
Use um sistema consistente de espaçamento e cores:

```tsx
// Use múltiplos de 4 para espaçamento
p-4, m-8, gap-12, space-y-16

// Use a mesma escala de cores
bg-blue-50, text-blue-600, border-blue-200
```

## Recursos Avançados

### 1. Transições e Animações
```tsx
<div className="transition-all duration-200 hover:scale-105">
  Animação suave
</div>
```

### 2. Estados
```tsx
<button className="hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
  Estados interativos
</button>
```

### 3. Customização
Edite `tailwind.config.js` para personalizar:

```js
export default {
  theme: {
    extend: {
      colors: {
        'bank-primary': '#10b981',
        'bank-secondary': '#8a2be2',
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  }
}
```

## Dicas de Produtividade

### 1. VS Code Extensions
- **Tailwind CSS IntelliSense** - Autocomplete e hover states
- **Tailwind Docs** - Documentação integrada

### 2. Debugging
Use `@apply` no CSS para debug:

```css
.custom-component {
  @apply bg-white p-4 rounded-lg shadow-md;
}
```

### 3. Performance
O Tailwind CSS remove automaticamente classes não usadas no build de produção.

## Próximos Passos

1. **Explore os componentes criados** - Veja `StatCardTailwind.tsx` e `TailwindExample.tsx`
2. **Comece pequeno** - Use Tailwind em novos componentes primeiro
3. **Migre gradualmente** - Converta componentes existentes aos poucos
4. **Customize** - Adapte o tema às suas cores do sistema

## Suporte

- [Documentação Oficial](https://tailwindcss.com/docs)
- [Componentes UI](https://tailwindui.com/)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

---

**Parabéns!** Seu projeto agora está com Tailwind CSS configurado e pronto para usar. 🎉
