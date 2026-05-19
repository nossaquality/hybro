import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import './index.css'

// 1. Criamos a instância do QueryClient que o roteador exige
const queryClient = new QueryClient()

// 2. Passamos o queryClient dentro do objeto context
const router = createRouter({ 
  routeTree,
  context: {
    queryClient,
  },
})

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}