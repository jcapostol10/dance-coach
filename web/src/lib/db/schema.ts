import {
  pgTable,
  text,
  timestamp,
  real,
  integer,
  jsonb,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull().unique(), // Clerk user ID
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  style: text("style"), // hip-hop, salsa, contemporary, etc.
  difficulty: text("difficulty"), // beginner, intermediate, advanced
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: real("duration").notNull(), // seconds
  bpm: real("bpm"),
  beats: jsonb("beats").$type<number[]>(),
  isCurated: boolean("is_curated").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const steps = pgTable("steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonId: uuid("lesson_id")
    .references(() => lessons.id, { onDelete: "cascade" })
    .notNull(),
  stepNumber: integer("step_number").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startBeat: integer("start_beat").notNull(),
  endBeat: integer("end_beat").notNull(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  keyframes: jsonb("keyframes").$type<
    Array<{
      time: number;
      landmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
    }>
  >(),
});

export const practiceScores = pgTable("practice_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  lessonId: uuid("lesson_id")
    .references(() => lessons.id, { onDelete: "cascade" })
    .notNull(),
  overallScore: real("overall_score").notNull(),
  stepScores: jsonb("step_scores").$type<
    Array<{
      stepId: string;
      score: number;
      timingScore: number;
      formScore: number;
      feedback: string;
      problemJoints: string[];
    }>
  >(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
