import type { DayPlan, RunSession, StrengthSession } from "./store";

export const WEEK_PLAN: DayPlan[] = [
  {
    day: "Mon",
    date: "Monday",
    tasks: [
      { id: "mon-1", type: "run", title: "5 km Easy Run", detail: "Zone 2 pace · conversational", durationMin: 35 },
      { id: "mon-2", type: "mobility", title: "Post-run Stretching", detail: "Hamstrings, calves, hips · 10 min", durationMin: 10 },
    ],
  },
  {
    day: "Tue",
    date: "Tuesday",
    tasks: [
      { id: "tue-1", type: "strength", title: "Upper Body Strength", detail: "Push / pull circuit · 4 rounds", durationMin: 40 },
    ],
  },
  {
    day: "Wed",
    date: "Wednesday",
    tasks: [
      { id: "wed-1", type: "run", title: "Interval Session", detail: "6 × 400 m @ 5K pace, 90s jog", durationMin: 45 },
      { id: "wed-2", type: "mobility", title: "Foam Roll", detail: "Quads, IT band, glutes", durationMin: 10 },
    ],
  },
  {
    day: "Thu",
    date: "Thursday",
    tasks: [
      { id: "thu-1", type: "strength", title: "Lower Body & Core", detail: "Posterior chain focus", durationMin: 45 },
    ],
  },
  {
    day: "Fri",
    date: "Friday",
    tasks: [{ id: "fri-1", type: "rest", title: "Active Recovery", detail: "Walk + breathing · optional yoga", durationMin: 20 }],
  },
  {
    day: "Sat",
    date: "Saturday",
    tasks: [
      { id: "sat-1", type: "run", title: "Long Run · 10 km", detail: "Easy effort, fueling practice", durationMin: 65 },
    ],
  },
  {
    day: "Sun",
    date: "Sunday",
    tasks: [
      { id: "sun-1", type: "strength", title: "Full Body Circuit", detail: "Light load, runner-friendly", durationMin: 35 },
      { id: "sun-2", type: "mobility", title: "Mobility Flow", detail: "Hips, ankles, T-spine", durationMin: 15 },
    ],
  },
];

export const RUNNING_PLAN: RunSession[] = [
  {
    day: "Monday",
    title: "5 km Easy Run",
    warmup: "5 min brisk walk + dynamic leg swings, 4 × 20s strides",
    main: "5 km continuous at conversational pace (Zone 2). Nose breathing if possible.",
    cooldown: "5 min walk + static stretches (calves, hamstrings, hip flexors)",
    notes: "If HR drifts above Zone 2, slow down. Recovery is the goal.",
  },
  {
    day: "Wednesday",
    title: "Intervals · 6 × 400 m",
    warmup: "10 min easy jog + drills (A-skips, high knees) + 4 strides",
    main: "6 × 400 m at 5K pace with 90s slow jog recovery between reps.",
    cooldown: "10 min easy jog + mobility flow",
    notes: "Hit the same split every rep — don't blow the first two.",
  },
  {
    day: "Saturday",
    title: "Long Run · 10 km",
    warmup: "5 min walk → easy jog into pace",
    main: "10 km steady easy effort. Practice mid-run fueling around km 5.",
    cooldown: "Walk 5 min + full lower-body stretch",
    notes: "Hydrate well the day before. Wear your race-day shoes.",
  },
];

export const STRENGTH_PLAN: StrengthSession[] = [
  {
    day: "Tuesday",
    title: "Upper Body Strength",
    focus: "Push / pull balance for posture and arm drive",
    exercises: [
      { name: "Push-ups", sets: 4, reps: "8–12", notes: "Elevate hands if needed" },
      { name: "Dumbbell Row", sets: 4, reps: "10 each side", notes: "Slow eccentric" },
      { name: "Pike Push-up", sets: 3, reps: "6–10", notes: "Shoulder focus" },
      { name: "Band Pull-apart", sets: 3, reps: "15", notes: "Squeeze shoulder blades" },
      { name: "Plank", sets: 3, reps: "45–60s", notes: "Glutes engaged" },
    ],
  },
  {
    day: "Thursday",
    title: "Lower Body & Core",
    focus: "Posterior chain for stronger stride and injury prevention",
    exercises: [
      { name: "Goblet Squat", sets: 4, reps: "8–10", notes: "Knees track over toes" },
      { name: "Romanian Deadlift", sets: 4, reps: "10", notes: "Hinge, flat back" },
      { name: "Reverse Lunge", sets: 3, reps: "10 each side", notes: "Control the descent" },
      { name: "Single-leg Calf Raise", sets: 3, reps: "15 each", notes: "Full range" },
      { name: "Dead Bug", sets: 3, reps: "10 each side", notes: "Low back pressed down" },
    ],
  },
  {
    day: "Sunday",
    title: "Full Body Circuit",
    focus: "Light, runner-friendly conditioning",
    exercises: [
      { name: "Bodyweight Squat", sets: 3, reps: "15", notes: "Smooth tempo" },
      { name: "Push-up", sets: 3, reps: "10", notes: "Steady cadence" },
      { name: "Glute Bridge", sets: 3, reps: "15", notes: "Squeeze at top" },
      { name: "Superman", sets: 3, reps: "12", notes: "Lift chest + thighs" },
      { name: "Side Plank", sets: 2, reps: "30s each", notes: "Hips high" },
    ],
  },
];

export const TODAY_INDEX = 0; // pretend "today" is Monday for demo
