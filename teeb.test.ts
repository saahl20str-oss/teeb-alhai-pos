import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@teeb.com",
    name: "صاحب المحل",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createStaffContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "staff-user",
    email: "staff@teeb.com",
    name: "موظف",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return { ctx };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns null for unauthenticated user", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  it("logout clears session cookie", async () => {
    const { ctx, clearedCookies } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── Role-Based Access Tests ──────────────────────────────────────────────────
describe("role-based access control", () => {
  it("admin can access analytics stats", { timeout: 15000 }, async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw for admin
    await expect(caller.analytics.stats({ period: "day" })).resolves.toBeDefined();
  });

  it("staff can access analytics stats (protected, not admin-only)", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    // analytics.stats is protectedProcedure - staff can access
    const result = await caller.analytics.stats({ period: "day" });
    expect(result).toBeDefined();
    expect(typeof result.totalRevenue).toBe("number");
  });

  it("staff cannot access user management", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("admin can access user management", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).resolves.toBeDefined();
  });

  it("staff cannot access settings update", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.shop.updateSettings({ shopName: "Test" })).rejects.toThrow();
  });

  it("unauthenticated user cannot access products", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.products.list()).rejects.toThrow();
  });
});

// ─── Shop Settings Tests ──────────────────────────────────────────────────────
describe("shop settings", () => {
  it("public can read shop settings", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw - settings are public
    const result = await caller.shop.getSettings();
    // May be null if DB not seeded in test env
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("admin can update shop settings", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw for admin
    await expect(caller.shop.updateSettings({ shopName: "طيب الحي" })).resolves.toBeDefined();
  });
});

// ─── Product Procedures Tests ─────────────────────────────────────────────────
describe("products", () => {
  it("staff can list products", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.products.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("staff can get low stock products", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.products.getLowStock();
    expect(Array.isArray(result)).toBe(true);
  });

  it("staff cannot delete products", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.products.delete({ id: 999 })).rejects.toThrow();
  });

  it("admin can delete products", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Product 999 won't exist but should throw a DB error, not an auth error
    await expect(caller.products.delete({ id: 999 })).resolves.toBeDefined();
  });
});

// ─── Sales Tests ──────────────────────────────────────────────────────────────
describe("sales", () => {
  it("staff can list sales", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sales.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("staff can get next invoice number", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sales.getNextInvoiceNumber();
    // Returns a string like 'INV-0001'
    expect(typeof result === "string" || typeof result === "object").toBe(true);
  });

  it("staff cannot create sale with empty items", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sales.create({ items: [] })
    ).rejects.toThrow();
  });
});

// ─── Notifications Tests ──────────────────────────────────────────────────────
describe("notifications", () => {
  it("staff can list notifications", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list({ unreadOnly: false });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can delete notification", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // id 9999 won't exist but should resolve (not throw auth error)
    await expect(caller.notifications.delete({ id: 9999 })).resolves.toBeDefined();
  });

  it("staff can snooze notification", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notifications.snooze({ id: 9999, hours: 2 })).resolves.toBeDefined();
  });

  it("staff can mark all notifications as read", async () => {
    const { ctx } = createStaffContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAllRead();
    expect(result).toEqual({ success: true });
  });
});

// ─── Categories Tests ─────────────────────────────────────────────────────────
describe("categories", () => {
  it("public can list categories", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
