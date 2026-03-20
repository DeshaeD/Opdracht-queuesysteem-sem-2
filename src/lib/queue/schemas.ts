import { z } from "zod";

export const queueIdSchema = z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/);
export const studentIdSchema = z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/);

export const openQueueSchema = z.object({
  queueId: queueIdSchema,
  context: z.string().trim().min(3).max(120),
  teacherName: z.string().trim().min(2).max(60),
});

export const joinQueueSchema = z.object({
  studentId: studentIdSchema,
});

export const callNextSchema = z.object({
  finishedStatus: z.enum(["served", "skipped"]).default("served"),
});

export const breakSchema = z.object({
  mode: z.enum(["active", "break"]),
});
