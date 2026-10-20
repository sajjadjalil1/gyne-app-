import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type Role } from "@gyne/db";
import { CLINICAL } from "./roles";
import { currentClaims, type TokenClaims } from "./auth";

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (status: number, error: string, extra?: Record<string, unknown>) => NextResponse.json({ error, ...extra }, { status });

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requireAuth(): Promise<TokenClaims> {
  const c = await currentClaims();
  if (!c) throw new HttpError(401, "غير مصرّح");
  return c;
}

export async function requirePatient() {
  const c = await requireAuth();
  if (c.role !== "PATIENT") throw new HttpError(403, "هذه الواجهة للمريضات فقط");
  const patient = await prisma.patient.findUnique({ where: { userId: c.sub } });
  if (!patient) throw new HttpError(404, "لا يوجد ملف مريضة لهذا الحساب");
  return { claims: c, patient };
}

export async function requireStaff(allowed: Role[] = CLINICAL) {
  const c = await requireAuth();
  if (c.role === "PATIENT") throw new HttpError(403, "هذه الواجهة لطاقم العيادة فقط");
  if (!allowed.includes(c.role)) throw new HttpError(403, "صلاحيتك ما تسمح بهذا");
  const user = await prisma.user.findUnique({ where: { id: c.sub } });
  if (!user || !user.totpEnabledAt) throw new HttpError(401, "غير مصرّح");
  return { claims: c, user };
}

export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const body = await req.json().catch(() => null);
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return r.data;
}

export function handle(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      console.error(e);
      return fail(500, "خطأ داخلي");
    }
  };
}
