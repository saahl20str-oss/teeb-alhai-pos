import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getAllUsers,
  getCategories,
  getCustomerByPhone,
  getCustomers,
  getDailySalesChart,
  getInventoryValue,
  getLowStockProducts,
  getMonthlySalesChart,
  getNextInvoiceNumber,
  getNotifications,
  getProductByCode,
  getProductById,
  getProducts,
  getSaleById,
  getSaleByInvoiceNumber,
  getSales,
  getSalesStats,
  getShopSettings,
  getStaffInvites,
  getTopProducts,
  getYearlySalesChart,
  addStockMovement,
  createProduct,
  createSale,
  createStaffInvite,
  deleteCustomer,
  deleteNotification,
  deleteProduct,
  deleteStaffInvite,
  deleteUser,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationSentToSupplier,
  snoozeNotification,
  updateCustomer,
  updateProduct,
  updateShopSettings,
  updateUserProfile,
  updateUserRole,
  upsertCustomer,
} from "./db";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "هذه العملية تتطلب صلاحيات المدير" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Shop Settings ──────────────────────────────────────────────────────────
  shop: router({
    getSettings: publicProcedure.query(async () => {
      return getShopSettings();
    }),

    updateSettings: adminProcedure
      .input(
        z.object({
          shopName: z.string().optional(),
          shopNameEn: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          logoUrl: z.string().optional(),
          stampText: z.string().optional(),
          taxNumber: z.string().optional(),
          currencyCode: z.string().optional(),
          currencySymbol: z.string().optional(),
          supplierEmail: z.string().optional(),
          supplierWhatsapp: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await updateShopSettings(input);
        return { success: true };
      }),

    uploadLogo: adminProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string() }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `logos/shop-logo-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateShopSettings({ logoUrl: url });
        return { url };
      }),
  }),

  // ─── Users ──────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(async () => {
      return getAllUsers();
    }),

    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["admin", "user"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    updateProfile: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          displayName: z.string().optional(),
          phone: z.string().optional(),
          permissions: z.array(z.string()).optional(),
          isActive: z.boolean().optional(),
          role: z.enum(["admin", "user"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        await updateUserProfile(userId, data);
        return { success: true };
      }),

    deactivate: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك تعطيل حسابك الخاص" });
        }
        await deleteUser(input.userId);
        return { success: true };
      }),

    // Staff invites
    createInvite: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          displayName: z.string().optional(),
          permissions: z.array(z.string()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createStaffInvite({
          email: input.email,
          displayName: input.displayName,
          permissions: input.permissions,
          createdBy: ctx.user.id,
        });
        return result;
      }),

    listInvites: adminProcedure.query(async () => {
      return getStaffInvites();
    }),

    deleteInvite: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteStaffInvite(input.id);
        return { success: true };
      }),
  }),

  // ─── Categories ─────────────────────────────────────────────────────────────
  categories: router({
    list: publicProcedure.query(async () => {
      return getCategories();
    }),
  }),

  // ─── Products ───────────────────────────────────────────────────────────────
  products: router({
    list: protectedProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const prods = await getProducts(input?.categoryId);
        const cats = await getCategories();
        return prods.map((p) => ({
          ...p,
          categoryName: cats.find((c) => c.id === p.categoryId)?.name ?? null,
        }));
      }),

    getByCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return getProductByCode(input.code);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getProductById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          nameEn: z.string().optional(),
          categoryId: z.number(),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
          costPrice: z.number().min(0),
          sellingPrice: z.number().min(0),
          quantity: z.number().min(0).default(0),
          lowStockThreshold: z.number().min(0).default(5),
          supplier: z.string().optional(),
          supplierPhone: z.string().optional(),
          unit: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const product = await createProduct({
          ...input,
          costPrice: String(input.costPrice),
          sellingPrice: String(input.sellingPrice),
        });
        if (input.quantity > 0) {
          await addStockMovement({
            productId: product.id,
            type: "in",
            quantity: input.quantity,
            note: "إضافة مخزون أولي",
            userId: ctx.user.id,
          });
        }
        return product;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          nameEn: z.string().optional(),
          categoryId: z.number().optional(),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
          costPrice: z.number().optional(),
          sellingPrice: z.number().optional(),
          lowStockThreshold: z.number().optional(),
          supplier: z.string().optional(),
          supplierPhone: z.string().optional(),
          unit: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, costPrice, sellingPrice, ...rest } = input;
        await updateProduct(id, {
          ...rest,
          ...(costPrice !== undefined ? { costPrice: String(costPrice) } : {}),
          ...(sellingPrice !== undefined ? { sellingPrice: String(sellingPrice) } : {}),
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProduct(input.id);
        return { success: true };
      }),

    getLowStock: protectedProcedure.query(async () => {
      return getLowStockProducts();
    }),

    addStock: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number().min(1),
          type: z.enum(["in", "out"]).default("in"),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return addStockMovement({
          productId: input.productId,
          type: input.type,
          quantity: input.quantity,
          note: input.note,
          userId: ctx.user.id,
        });
      }),

    adjustStock: adminProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number().min(0),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return addStockMovement({
          productId: input.productId,
          type: "adjustment",
          quantity: input.quantity,
          note: input.note ?? "تعديل مخزون",
          userId: ctx.user.id,
        });
      }),
  }),

  // ─── Customers ──────────────────────────────────────────────────────────────
  customers: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getCustomers(input?.limit ?? 100, input?.offset ?? 0);
      }),

    getByPhone: protectedProcedure
      .input(z.object({ phone: z.string() }))
      .query(async ({ input }) => {
        return getCustomerByPhone(input.phone);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCustomer(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCustomer(input.id);
        return { success: true };
      }),
  }),

  // ─── Sales / POS ────────────────────────────────────────────────────────────
  sales: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getSales(input?.limit ?? 50, input?.offset ?? 0);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSaleById(input.id);
      }),

    getByInvoiceNumber: protectedProcedure
      .input(z.object({ invoiceNumber: z.string() }))
      .query(async ({ input }) => {
        return getSaleByInvoiceNumber(input.invoiceNumber);
      }),

    create: protectedProcedure
      .input(
        z.object({
          staffName: z.string().optional(),
          customerName: z.string().optional(),
          customerPhone: z.string().optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number().min(1),
              unitPrice: z.number().min(0),
            })
          ).min(1),
          discountType: z.enum(["percentage", "fixed"]).optional(),
          discountValue: z.number().optional(),
          paymentMethod: z.enum(["cash", "card", "transfer"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return createSale({ ...input, userId: ctx.user.id });
      }),

    getNextInvoiceNumber: protectedProcedure.query(async () => {
      return getNextInvoiceNumber();
    }),
  }),

  // ─── Analytics ──────────────────────────────────────────────────────────────
  analytics: router({
    stats: protectedProcedure
      .input(z.object({ period: z.enum(["day", "month", "year"]) }))
      .query(async ({ input }) => {
        return getSalesStats(input.period);
      }),

    dailyChart: protectedProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getDailySalesChart(input?.days ?? 30);
      }),

    monthlyChart: protectedProcedure
      .input(z.object({ months: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getMonthlySalesChart(input?.months ?? 12);
      }),

    yearlyChart: protectedProcedure
      .input(z.object({ years: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getYearlySalesChart(input?.years ?? 3);
      }),

    topProducts: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getTopProducts(input?.limit ?? 10);
      }),

    inventoryValue: protectedProcedure.query(async () => {
      return getInventoryValue();
    }),
  }),

  // ─── Notifications ──────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return getNotifications(input?.unreadOnly ?? false);
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationRead(input.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async () => {
      await markAllNotificationsRead();
      return { success: true };
    }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNotification(input.id);
        return { success: true };
      }),

    snooze: protectedProcedure
      .input(z.object({ id: z.number(), hours: z.number().min(1).max(72) }))
      .mutation(async ({ input }) => {
        await snoozeNotification(input.id, input.hours);
        return { success: true };
      }),

    markSentToSupplier: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationSentToSupplier(input.id);
        return { success: true };
      }),

    // Get supplier contact info for sending alerts
    getSupplierContact: adminProcedure.query(async () => {
      const settings = await getShopSettings();
      return {
        email: settings?.supplierEmail ?? null,
        whatsapp: settings?.supplierWhatsapp ?? null,
      };
    }),
  }),

  // ─── AI Advisor ─────────────────────────────────────────────────────────────
  ai: router({
    chat: protectedProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        // Gather comprehensive real data for context
        const [stats, statsMonth, statsYear, topProducts, lowStock, inventoryVal, monthlySales, settings, customers] = await Promise.all([
          getSalesStats("day"),
          getSalesStats("month"),
          getSalesStats("year"),
          getTopProducts(10),
          getLowStockProducts(),
          getInventoryValue(),
          getMonthlySalesChart(6),
          getShopSettings(),
          getCustomers(5),
        ]);

        const currency = settings?.currencySymbol ?? "ريال";
        const shopName = settings?.shopName ?? "طيب الحي للعود والأدهان";

        const systemPrompt = `أنت مستشار أعمال ذكي ومتخصص في محلات العطور والعود والأدهان في السوق العربي والخليجي.
اسم المحل: ${shopName}

📊 بيانات المحل الحالية والدقيقة:

مبيعات اليوم: ${stats.totalRevenue.toFixed(2)} ${currency} (${stats.totalSales} فاتورة)
مبيعات هذا الشهر: ${statsMonth.totalRevenue.toFixed(2)} ${currency} (${statsMonth.totalSales} فاتورة)
مبيعات هذا العام: ${statsYear.totalRevenue.toFixed(2)} ${currency} (${statsYear.totalSales} فاتورة)

قيمة المخزون بسعر التكلفة: ${inventoryVal.costValue.toFixed(2)} ${currency}
قيمة المخزون بسعر البيع: ${inventoryVal.sellingValue.toFixed(2)} ${currency}
هامش الربح المحتمل: ${(inventoryVal.sellingValue - inventoryVal.costValue).toFixed(2)} ${currency}
إجمالي القطع في المخزون: ${inventoryVal.totalItems}
المنتجات منخفضة المخزون: ${lowStock.length} منتج${lowStock.length > 0 ? ` (${lowStock.map(p => p.name).join("، ")})` : ""}

أكثر المنتجات مبيعاً:
${topProducts.map((p, i) => `${i + 1}. ${p.productName}: ${p.totalQty} وحدة - إيراد ${p.totalRevenue.toFixed(2)} ${currency}`).join("\n")}

مبيعات الأشهر الأخيرة:
${monthlySales.map((m) => `${m.month}: ${Number(m.revenue).toFixed(0)} ${currency} (${m.count} فاتورة)`).join("\n")}

عدد العملاء المسجلين: ${customers.length}+

تعليمات:
- قدم تحليلاً دقيقاً وعملياً بناءً على هذه البيانات الحقيقية
- اقترح استراتيجيات تسويقية مناسبة للسوق الخليجي والعربي
- نبّه على المنتجات التي تحتاج إعادة تخزين
- قدم نصائح لزيادة الإيرادات وتحسين هامش الربح
- اقترح عروض وخصومات مناسبة للمواسم والمناسبات
- أجب دائماً باللغة العربية بأسلوب احترافي وودود`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...input.messages,
          ],
        });

        return {
          content: response.choices[0]?.message?.content ?? "عذراً، لم أتمكن من معالجة طلبك.",
        };
      }),

    // Quick insights without full chat
    getInsights: protectedProcedure.query(async () => {
      const [statsDay, statsMonth, lowStock, topProducts, inventoryVal] = await Promise.all([
        getSalesStats("day"),
        getSalesStats("month"),
        getLowStockProducts(),
        getTopProducts(3),
        getInventoryValue(),
      ]);

      const insights = [];

      if (lowStock.length > 0) {
        insights.push({
          type: "warning" as const,
          title: "مخزون منخفض",
          message: `${lowStock.length} منتج يحتاج إعادة تخزين: ${lowStock.slice(0, 3).map(p => p.name).join("، ")}`,
        });
      }

      if (statsDay.totalRevenue > 0) {
        insights.push({
          type: "info" as const,
          title: "مبيعات اليوم",
          message: `تم تحقيق ${statsDay.totalRevenue.toFixed(0)} في ${statsDay.totalSales} فاتورة اليوم`,
        });
      }

      const profitMargin = inventoryVal.sellingValue > 0
        ? ((inventoryVal.sellingValue - inventoryVal.costValue) / inventoryVal.sellingValue * 100)
        : 0;

      insights.push({
        type: "success" as const,
        title: "هامش الربح المتوقع",
        message: `هامش ربح المخزون الحالي ${profitMargin.toFixed(1)}%`,
      });

      if (topProducts.length > 0) {
        insights.push({
          type: "info" as const,
          title: "أكثر المنتجات مبيعاً",
          message: `${topProducts[0].productName} هو الأكثر مبيعاً بـ ${topProducts[0].totalQty} وحدة`,
        });
      }

      return insights;
    }),
  }),
});

export type AppRouter = typeof appRouter;
