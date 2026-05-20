// Shared shape for AI-generated training plans (PT-BR domain).
export type TipoTarefa = "corrida" | "musculacao" | "mobilidade" | "descanso";

export interface Tarefa {
  id: string;
  tipo: TipoTarefa;
  titulo: string;
  detalhe: string;
  duracao_min?: number;
}

export interface DiaSemana {
  dia: string; // Seg, Ter...
  data: string; // Segunda-feira, etc.
  tarefas: Tarefa[];
}

export interface SessaoCorrida {
  dia: string;
  titulo: string;
  aquecimento: string;
  principal: string;
  desaquecimento: string;
  notas: string;
}

export interface ExercicioMusculacao {
  nome: string;
  series: number;
  repeticoes: string;
  notas: string;
}

export interface SessaoMusculacao {
  dia: string;
  titulo: string;
  foco: string;
  exercicios: ExercicioMusculacao[];
}

export interface PlanoTreino {
  semana: DiaSemana[];
  corrida: SessaoCorrida[];
  musculacao: SessaoMusculacao[];
}

export interface RespostasOnboarding {
  name: string;
  nivel_corrida: "iniciante" | "intermediario" | "avancado";
  dias_disponiveis: number;
  objetivo_principal: "resistencia" | "velocidade" | "perda_peso" | "prevencao_lesoes";
  equipamentos_casa: string[];
}
