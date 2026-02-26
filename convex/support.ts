import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { trackActivity } from "./lib/analytics";

/**
 * Get current authenticated user
 */
async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

/**
 * Create a new support ticket (user-facing)
 */
export const createTicket = mutation({
  args: {
    subject: v.string(),
    description: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    
    const ticketId = await ctx.db.insert("supportTickets", {
      userId: user._id,
      subject: args.subject,
      description: args.description,
      status: "open",
      priority: args.priority ?? "medium",
      createdAt: now,
      updatedAt: now,
    });
    
    // Log activity
    await trackActivity(ctx, user._id, "support_ticket_created", { ticketId, subject: args.subject });
    
    return ticketId;
  },
});

/**
 * Add a message to a support ticket
 */
export const addTicketMessage = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    
    // Check if user is the ticket owner OR an admin
    const isAdmin = user.isAdmin; // Simplify for now
    if (ticket.userId !== user._id && !isAdmin) {
      throw new Error("Unauthorized to add message to this ticket");
    }
    
    const now = Date.now();
    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      senderId: user._id,
      message: args.message,
      isFromAdmin: isAdmin,
      createdAt: now,
    });
    
    // Update ticket's updatedAt and status if needed
    const newStatus = isAdmin ? "waiting_on_user" : "in_progress";
    await ctx.db.patch(args.ticketId, {
      updatedAt: now,
      status: newStatus,
    });
    
    // If admin replied, send notification to user
    if (isAdmin && ticket.userId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: ticket.userId,
        type: "support_reply",
        title: "Support Update",
        body: `You received a reply to your ticket: ${ticket.subject}`,
        data: { ticketId: args.ticketId },
        read: false,
        createdAt: now,
      });
    }
    
    return { success: true };
  },
});

/**
 * Get all tickets for current user
 */
export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
      
    return tickets;
  },
});

/**
 * Get ticket details with messages
 */
export const getTicketDetail = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;
    
    // Check authorization
    if (ticket.userId !== user._id && !user.isAdmin) {
      return null;
    }
    
    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .collect();
      
    // Enrich messages with sender name
    const enrichedMessages = await Promise.all(
      messages.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        return {
          ...m,
          senderName: sender?.name || "Unknown",
          senderAvatar: sender?.avatarUrl,
        };
      })
    );
    
    return {
      ...ticket,
      messages: enrichedMessages,
    };
  },
});

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

/**
 * Get all tickets for admin panel
 */
export const getAdminTickets = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Permission check will be handled by requirePermission in actual admin functions
    // but for now we'll do basic check
    
    let tickets;
    if (args.status) {
      tickets = await ctx.db
        .query("supportTickets")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      tickets = await ctx.db.query("supportTickets").order("desc").collect();
    }
    
    // Enrich with user names
    return await Promise.all(
      tickets.map(async (t) => {
        const u = await ctx.db.get(t.userId);
        return {
          ...t,
          userName: u?.name || "Unknown",
          userEmail: u?.email || "",
        };
      })
    );
  },
});

/**
 * Assign ticket to admin
 */
export const assignTicket = mutation({
  args: { ticketId: v.id("supportTickets"), adminId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.isAdmin) throw new Error("Admin only");
    
    const adminId = args.adminId ?? user._id;
    await ctx.db.patch(args.ticketId, {
      assignedTo: adminId,
      status: "in_progress",
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Update ticket status
 */
export const updateTicketStatus = mutation({
  args: { 
    ticketId: v.id("supportTickets"), 
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("waiting_on_user"), v.literal("resolved"), v.literal("closed")) 
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.isAdmin) throw new Error("Admin only");
    
    await ctx.db.patch(args.ticketId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});
