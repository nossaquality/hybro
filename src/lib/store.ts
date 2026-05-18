export type Level = "beginner" | "intermediate" | "advanced";
export type Goal = "endurance" | "speed" | "weight_loss" | "injury_prevention";
export type Equipment = "bodyweight" | "dumbbells" | "bands" | "kettlebell" | "pullup_bar";

export interface OnboardingData {
  name: string;
  level: Level;
  daysPerWeek: number;
  goal: Goal;
  equipment: Equipment[];
  completedAt: string;
}

export type TaskType = "run" | "strength" | "mobility" | "rest";

export interface DailyTask {
  id: string;
  type: TaskType;
  title: string;
  detail: string;
  durationMin?: number;
}

export interface DayPlan {
  day: string; // Mon, Tue...
  date: string; // display
  tasks: DailyTask[];
}

export interface RunSession {
  day: string;
  title: string;
  warmup: string;
  main: string;
  cooldown: string;
  notes: string;
}

export interface StrengthExercise {
  name: string;
  sets: number;
  reps: string;
  notes: string;
}

export interface StrengthSession {
  day: string;
  title: string;
  focus: string;
  exercises: StrengthExercise[];
}

const STORAGE_KEY = "stride-onboarding";
const TASKS_KEY = "stride-task-log";

export function loadOnboarding(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : null;
  } catch {
    return null;
  }
}

export function saveOnboarding(data: OnboardingData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TASKS_KEY);
}

export type TaskStatus = {
  done: boolean;
  effort?: "easy" | "medium" | "hard";
};

export function loadTaskLog(): Record<string, TaskStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTaskLog(log: Record<string, TaskStatus>) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(log));
}
