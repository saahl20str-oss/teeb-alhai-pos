import { and, desc, eq, gte, sql, sum, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertProduct,
  InsertCustomer,
  categories,
  customers,
  notifications,
  products,
  saleItems,
  sales,
  shopSettings,
  staffInvites,
  stockMovements,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  // First user to sign in becomes admin automatically (ownership transfer model)
  const existingUsers = await db.select({ cnt: count() }).from(users);
  const userCount = Number(existingUsers[0]?.cnt ?? 0);

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId || userCount === 0) {
    // Platform owner OR very first user gets admin
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: {
  displayName?: string;
  phone?: string;
  permissions?: string[];
  isActive?: boolean;
  role?: "admin" | "user";
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
}

// ─── Staff Invites ────────────────────────────────────────────────────────────
export async function createStaffInvite(data: {
  email: string;
  displayName?: string;
  permissions: string[];
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { nanoid } = await import("nanoid");
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(staffInvites).values({
    email: data.email,
    displayName: data.displayName,
    permissions: data.permissions,
    token,
    expiresAt,
    createdBy: data.createdBy,
  });
  return { token, expiresAt };
}

export async function getStaffInvites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffInvites).orderBy(desc(staffInvites.createdAt)).limit(50);
}

export async function deleteStaffInvite(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(staffInvites).where(eq(staffInvites.id, id));
}

// ─── Shop Settings ────────────────────────────────────────────────────────────
export async function getShopSettings() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(shopSettings).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateShopSettings(data: Partial<typeof shopSettings.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getShopSettings();
  if (existing) {
    await db.update(shopSettings).set(data).where(eq(shopSettings.id, existing.id));
  } else {
    await db.insert(shopSettings).values(data as typeof shopSettings.$inferInsert);
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.id);
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function getProducts(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(products);
  if (categoryId) {
    return query.where(and(eq(products.categoryId, categoryId), eq(products.isActive, true)));
  }
  return query.where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
}

export async function getProductByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(products).values(data);
  const result = await db.select().from(products).where(eq(products.code, data.code)).limit(1);
  return result[0];
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ isActive: false }).where(eq(products.id, id));
}

export async function getLowStockProducts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        sql`${products.quantity} <= ${products.lowStockThreshold}`
      )
    );
}

// ─── Stock Movements ──────────────────────────────────────────────────────────
export async function addStockMovement(data: {
  productId: number;
  type: "in" | "out" | "adjustment";
  quantity: number;
  note?: string;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const product = await getProductById(data.productId);
  if (!product) throw new Error("Product not found");

  const previousQuantity = product.quantity;
  let newQuantity: number;
  if (data.type === "in") newQuantity = previousQuantity + data.quantity;
  else if (data.type === "out") newQuantity = previousQuantity - data.quantity;
  else newQuantity = data.quantity;

  if (newQuantity < 0) throw new Error("الكمية غير كافية في المخزون");

  await db.update(products).set({ quantity: newQuantity }).where(eq(products.id, data.productId));
  await db.insert(stockMovements).values({
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    previousQuantity,
    newQuantity,
    note: data.note,
    userId: data.userId,
  });

  // Check low stock after movement
  const updatedProduct = await getProductById(data.productId);
  if (updatedProduct && updatedProduct.quantity <= updatedProduct.lowStockThreshold) {
    await createLowStockNotification(updatedProduct);
  }

  return { previousQuantity, newQuantity };
}

export async function getStockMovements(productId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(stockMovements);
  if (productId) {
    return query.where(eq(stockMovements.productId, productId)).orderBy(desc(stockMovements.createdAt)).limit(limit);
  }
  return query.orderBy(desc(stockMovements.createdAt)).limit(limit);
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function getCustomers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).orderBy(desc(customers.totalSpent)).limit(limit).offset(offset);
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertCustomer(data: { name: string; phone: string; email?: string }) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getCustomerByPhone(data.phone);
  if (existing) {
    await db.update(customers)
      .set({ name: data.name, lastVisit: new Date() })
      .where(eq(customers.phone, data.phone));
    return existing;
  }
  await db.insert(customers).values({
    name: data.name,
    phone: data.phone,
    email: data.email,
    lastVisit: new Date(),
  });
  return getCustomerByPhone(data.phone);
}

export async function updateCustomerStats(phone: string, saleTotal: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers)
    .set({
      totalPurchases: sql`totalPurchases + 1`,
      totalSpent: sql`totalSpent + ${saleTotal}`,
      lastVisit: new Date(),
    })
    .where(eq(customers.phone, phone));
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customers).where(eq(customers.id, id));
}

// ─── Sales ────────────────────────────────────────────────────────────────────
export async function getNextInvoiceNumber() {
  const db = await getDb();
  if (!db) return "INV-0001";
  const result = await db.select({ cnt: count() }).from(sales);
  const num = (result[0]?.cnt ?? 0) + 1;
  return `INV-${String(num).padStart(4, "0")}`;
}

export async function createSale(data: {
  userId?: number;
  staffName?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{ productId: number; quantity: number; unitPrice: number }>;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  paymentMethod?: "cash" | "card" | "transfer";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const invoiceNumber = await getNextInvoiceNumber();
  let subtotal = 0;
  const itemsWithDetails = [];

  for (const item of data.items) {
    const product = await getProductById(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    if (product.quantity < item.quantity) throw new Error(`الكمية غير كافية للمنتج: ${product.name}`);
    const itemTotal = item.unitPrice * item.quantity;
    subtotal += itemTotal;
    itemsWithDetails.push({ product, item, itemTotal });
  }

  let discountAmount = 0;
  if (data.discountType === "percentage" && data.discountValue) {
    discountAmount = (subtotal * data.discountValue) / 100;
  } else if (data.discountType === "fixed" && data.discountValue) {
    discountAmount = data.discountValue;
  }
  const total = subtotal - discountAmount;

  // Upsert customer if phone provided
  let customerId: number | undefined;
  if (data.customerPhone && data.customerName) {
    const customer = await upsertCustomer({ name: data.customerName, phone: data.customerPhone });
    if (customer) {
      customerId = customer.id;
      await updateCustomerStats(data.customerPhone, total);
    }
  }

  await db.insert(sales).values({
    invoiceNumber,
    userId: data.userId,
    staffName: data.staffName,
    customerId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    subtotal: String(subtotal),
    discountType: data.discountType,
    discountValue: data.discountValue ? String(data.discountValue) : "0",
    discountAmount: String(discountAmount),
    total: String(total),
    paymentMethod: data.paymentMethod ?? "cash",
    notes: data.notes,
    status: "completed",
  });

  const saleResult = await db.select().from(sales).where(eq(sales.invoiceNumber, invoiceNumber)).limit(1);
  const sale = saleResult[0];

  for (const { product, item, itemTotal } of itemsWithDetails) {
    await db.insert(saleItems).values({
      saleId: sale.id,
      productId: item.productId,
      productName: product.name,
      productCode: product.code,
      unit: product.unit ?? "قطعة",
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      total: String(itemTotal),
    });
    await addStockMovement({
      productId: item.productId,
      type: "out",
      quantity: item.quantity,
      note: `بيع - فاتورة ${invoiceNumber}`,
      userId: data.userId,
    });
  }

  return sale;
}

export async function getSales(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit).offset(offset);
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const saleResult = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  if (!saleResult.length) return null;
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  return { ...saleResult[0], items };
}

export async function getSaleByInvoiceNumber(invoiceNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const saleResult = await db.select().from(sales).where(eq(sales.invoiceNumber, invoiceNumber)).limit(1);
  if (!saleResult.length) return null;
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleResult[0].id));
  return { ...saleResult[0], items };
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getSalesStats(period: "day" | "month" | "year") {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalSales: 0 };

  const now = new Date();
  let startDate: Date;
  if (period === "day") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const result = await db
    .select({ total: sum(sales.total), cnt: count() })
    .from(sales)
    .where(and(gte(sales.createdAt, startDate), eq(sales.status, "completed")));

  return {
    totalRevenue: Number(result[0]?.total ?? 0),
    totalSales: Number(result[0]?.cnt ?? 0),
  };
}

export async function getDailySalesChart(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db
    .select({
      date: sql<string>`DATE(${sales.createdAt})`,
      revenue: sum(sales.total),
      cnt: count(),
    })
    .from(sales)
    .where(and(gte(sales.createdAt, startDate), eq(sales.status, "completed")))
    .groupBy(sql`DATE(${sales.createdAt})`)
    .orderBy(sql`DATE(${sales.createdAt})`);

  return result.map((r) => ({
    date: r.date,
    revenue: Number(r.revenue ?? 0),
    count: Number(r.cnt ?? 0),
  }));
}

export async function getMonthlySalesChart(months = 12) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const result = await db
    .select({
      month: sql<string>`DATE_FORMAT(${sales.createdAt}, '%Y-%m')`,
      revenue: sum(sales.total),
      cnt: count(),
    })
    .from(sales)
    .where(and(gte(sales.createdAt, startDate), eq(sales.status, "completed")))
    .groupBy(sql`DATE_FORMAT(${sales.createdAt}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${sales.createdAt}, '%Y-%m')`);

  return result.map((r) => ({
    month: r.month,
    revenue: Number(r.revenue ?? 0),
    count: Number(r.cnt ?? 0),
  }));
}

export async function getYearlySalesChart(years = 3) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);

  const result = await db
    .select({
      year: sql<string>`YEAR(${sales.createdAt})`,
      revenue: sum(sales.total),
      cnt: count(),
    })
    .from(sales)
    .where(and(gte(sales.createdAt, startDate), eq(sales.status, "completed")))
    .groupBy(sql`YEAR(${sales.createdAt})`)
    .orderBy(sql`YEAR(${sales.createdAt})`);

  return result.map((r) => ({
    year: r.year,
    revenue: Number(r.revenue ?? 0),
    count: Number(r.cnt ?? 0),
  }));
}

export async function getTopProducts(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      productId: saleItems.productId,
      productName: saleItems.productName,
      totalQty: sum(saleItems.quantity),
      totalRevenue: sum(saleItems.total),
    })
    .from(saleItems)
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(desc(sum(saleItems.quantity)))
    .limit(limit);

  return result.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    totalQty: Number(r.totalQty ?? 0),
    totalRevenue: Number(r.totalRevenue ?? 0),
  }));
}

export async function getInventoryValue() {
  const db = await getDb();
  if (!db) return { costValue: 0, sellingValue: 0, totalItems: 0 };
  const result = await db
    .select({
      costValue: sum(sql`${products.costPrice} * ${products.quantity}`),
      sellingValue: sum(sql`${products.sellingPrice} * ${products.quantity}`),
      totalItems: sum(products.quantity),
    })
    .from(products)
    .where(eq(products.isActive, true));

  return {
    costValue: Number(result[0]?.costValue ?? 0),
    sellingValue: Number(result[0]?.sellingValue ?? 0),
    totalItems: Number(result[0]?.totalItems ?? 0),
  };
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createLowStockNotification(product: { id: number; name: string; quantity: number; lowStockThreshold: number }) {
  const db = await getDb();
  if (!db) return;
  // Avoid duplicate notifications for same product within 1 hour
  const recentCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const existing = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.productId, product.id),
        eq(notifications.type, "low_stock"),
        gte(notifications.createdAt, recentCutoff)
      )
    )
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(notifications).values({
    type: "low_stock",
    title: `تنبيه: مخزون منخفض`,
    message: `المنتج "${product.name}" وصل إلى ${product.quantity} ${product.quantity === 1 ? "قطعة" : "قطع"} (الحد الأدنى: ${product.lowStockThreshold})`,
    productId: product.id,
    isRead: false,
  });
}

export async function getNotifications(unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  if (unreadOnly) {
    return db.select().from(notifications)
      .where(
        and(
          eq(notifications.isRead, false),
          sql`(${notifications.snoozedUntil} IS NULL OR ${notifications.snoozedUntil} <= ${now})`
        )
      )
      .orderBy(desc(notifications.createdAt)).limit(20);
  }
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead() {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
}

export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.id, id));
}

export async function snoozeNotification(id: number, hours: number) {
  const db = await getDb();
  if (!db) return;
  const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  await db.update(notifications).set({ snoozedUntil }).where(eq(notifications.id, id));
}

export async function markNotificationSentToSupplier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ sentToSupplier: true, isRead: true }).where(eq(notifications.id, id));
}
