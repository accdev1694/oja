# OJA ADMIN DASHBOARD - USER GUIDE

## 📑 TABLE OF CONTENTS
1. [Introduction](#1-introduction)
2. [Security & Access](#2-security--access)
3. [Dashboard Overview](#3-dashboard-overview)
4. [User Management](#4-user-management)
5. [Receipt Moderation](#5-receipt-moderation)
6. [Analytics & Growth](#6-analytics--growth)
7. [System Monitoring](#7-system-monitoring)
8. [Automation & Webhooks](#8-automation--webhooks)

---

## 1. INTRODUCTION
The Oja Admin Dashboard is a centralized command center for managing the Oja grocery savings platform. It provides real-time insights into user behavior, financial health, and system performance.

## 2. SECURITY & ACCESS
Access to the dashboard is strictly controlled via Role-Based Access Control (RBAC).
- **MFA Required:** All admins must have Multi-Factor Authentication (MFA) enabled.
- **Session Timeout:** Sessions automatically expire after 8 hours of inactivity.
- **IP Whitelisting:** Access can be restricted to specific IP addresses for sensitive roles.
- **Audit Logs:** Every administrative action is logged and searchable.

## 3. DASHBOARD OVERVIEW
The **Overview Tab** provides a high-level summary of the platform:
- **System Health:** Real-time status of receipt processing and API latency.
- **Key Metrics:** Total users, new signups, active users, and gross volume.
- **Revenue:** MRR (Monthly Recurring Revenue) and ARR (Annual) tracking.

## 4. USER MANAGEMENT
Manage user accounts and subscriptions from the **Users Tab**:
- **Search:** Find users by name or email.
- **Details:** View a user's lists, receipt history, and activity timeline.
- **Actions:** Suspend accounts, extend trial periods, or grant complimentary premium access.
- **Impersonation:** Safely view the app as a specific user to troubleshoot issues.

## 5. RECEIPT MODERATION
The **Receipts Tab** is used to verify and correct scan data:
- **Moderation Queue:** Visually inspect flagged receipts with original images.
- **Edit:** Correct store names, totals, or purchase dates inline.
- **Price Anomalies:** Review and remove outlier price points detected by the system.

## 6. ANALYTICS & GROWTH
The **Analytics Tab** offers deep insights into platform growth:
- **Cohort Retention:** Track how many users remain active over 7, 30, and 90-day periods.
- **User Segments:** Identify power users, at-risk users, and churned accounts.
- **Funnel Tracking:** Monitor conversion rates from signup to premium subscription.

## 7. SYSTEM MONITORING
Monitor infrastructure health from the **Monitoring Tab**:
- **Real-time Alerts:** Automated notifications for high latency or receipt failure spikes.
- **SLA Tracking:** Ensure system performance meets defined service level agreements.
- **Active Sessions:** View and force-logout active administrative sessions.

## 8. AUTOMATION & WEBHOOKS
Configure external integrations and automated tasks:
- **Webhooks:** Send real-time events (e.g., `receipt.completed`) to external systems.
- **Experiments:** Manage A/B tests for pricing, features, and onboarding flows.
- **Announcements:** Send broadcast notifications to all platform users.
