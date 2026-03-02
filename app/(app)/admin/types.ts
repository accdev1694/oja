export type AdminTab = "overview" | "users" | "analytics" | "support" | "monitoring" | "receipts" | "catalog" | "settings" | "webhooks" | "points";

export interface AnalyticsData {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsersThisWeek: number;
  totalLists: number;
  completedLists: number;
  totalReceipts: number;
  receiptsThisWeek: number;
  receiptsThisMonth: number;
  totalGMV: number;
  gmvThisWeek: number;
  gmvThisMonth: number;
  gmvThisYear: number;
  computedAt: number;
  isPrecomputed: boolean;
}

export interface RevenueReport {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlySubscribers: number;
  annualSubscribers: number;
  trialsActive: number;
  mrr: number;
  arr: number;
}

export interface FinancialData {
  grossRevenue: number;
  estimatedTax: number;
  estimatedCOGS: number;
  netRevenue: number;
  margin: number;
}

export interface HealthData {
  status: "healthy" | "degraded" | "down";
  receiptProcessing: {
    total: number;
    failed: number;
    processing: number;
    successRate: number;
  };
  timestamp: number;
}

export interface AuditLog {
  _id: string;
  adminUserId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  createdAt: number;
}

export interface TimelineEvent {
  _id: string;
  userId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  suspended?: boolean;
  mfaEnabled?: boolean;
  churnRiskScore?: number;
  createdAt: number;
  lastActiveAt?: number;
  receiptCount?: number;
  listCount?: number;
  totalSpent?: number;
  subscription?: {
    plan: string;
    status: string;
  };
}

export interface Receipt {
  _id: string;
  userId: string;
  userName?: string;
  storeName: string;
  total: number;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  purchaseDate: number;
  createdAt: number;
  imageStorageId?: string;
  items?: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export interface PriceAnomaly {
  _id: string;
  itemName: string;
  storeName: string;
  unitPrice: number;
  average: number;
  averagePrice?: number;
  deviation?: number;
  deviationPercent: number;
}

export interface PermissionData {
  role: string;
  displayName: string;
  permissions: string[];
}

export interface CohortMetric {
  _id: string;
  cohortMonth: string;
  totalUsers: number;
  retentionDay7: number;
  retentionDay14: number;
  retentionDay30: number;
  retentionDay60: number;
  retentionDay90: number;
  computedAt: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
}

export interface ChurnMetric {
  _id: string;
  month: string;
  totalActiveStart: number;
  totalActiveEnd: number;
  churnedUsers: number;
  churnRate: number;
  reactivatedUsers: number;
  atRiskCount: number;
}

export interface LTVMetric {
  _id: string;
  cohortMonth: string;
  avgLTV: number;
  avgRevenuePerUser: number;
  totalRevenue: number;
  paidUsers: number;
  conversionRate: number;
}

export interface UserSegment {
  name: string;
  count: number;
  percentage: number;
}

export interface FeatureFlag {
  _id: string;
  key: string;
  value: boolean;
  description?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: number;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "promo";
  active: boolean;
  startsAt?: number;
  endsAt?: number;
  createdBy: string;
  createdAt: number;
}

export interface PricingConfig {
  _id: string;
  planId: string;
  displayName: string;
  priceAmount: number;
  currency: string;
  region?: string;
  isActive: boolean;
  updatedAt: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface DuplicateStoreGroup {
  variants: string[];
  suggested: string;
}

export interface AdminSession {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  loginAt: number;
  lastSeenAt: number;
  status: "active" | "logged_out" | "expired";
}

export interface Workflow {
  _id: string;
  name: string;
  trigger: string;
  isEnabled: boolean;
  actions: Record<string, unknown>[];
}

export interface TicketMessage {
  _id: string;
  senderId: string;
  senderName: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: number;
}

export interface SupportSummary {
  open: number;
  unassigned: number;
  inProgress: number;
  resolved: number;
}

export interface SupportTicket {
  _id: string;
  userId: string;
  userName: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  createdAt: number;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: TicketMessage[];
}

export interface Experiment {
  _id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "completed" | "archived";
  goalEvent: string;
  variants: {
    name: string;
    allocationPercent: number;
  }[];
  createdAt: number;
}

export interface MonitoringSummary {
  alertCount: number;
  alerts: {
    _id: string;
    alertType: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "active" | "resolved";
    createdAt: number;
  }[];
  slaStatus: "pass" | "warn" | "fail";
  recentSLA: {
    _id: string;
    metric: string;
    target: number;
    actual: number;
    status: "pass" | "warn" | "fail";
  }[];
}

export interface Webhook {
  _id: string;
  url: string;
  secret: string;
  description?: string;
  events: string[];
  isEnabled: boolean;
  lastTriggeredAt?: number;
  lastResponseStatus?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AdminDashboardPreferences {
  overviewWidgets: {
    id: string;
    visible: boolean;
    order: number;
  }[];
}

