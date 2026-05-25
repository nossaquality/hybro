import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router"; // Adicionado createHashHistory
import { routeTree } from "./routeTree.gen";

// Cria o histórico baseado em Hash de forma manual
const hashHistory = createHashHistory();

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    history: hashHistory, // Força o roteador a usar o modo hash seguro (#/)
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};