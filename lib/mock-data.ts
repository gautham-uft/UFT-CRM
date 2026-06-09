export const mockLeads = [
  { id: "1", first_name: "James", last_name: "Carter", email: "james.carter@techwave.io", phone: "+1 555-0101", company_name: "TechWave Inc.", source: "n8n_apify", status: "new", created_at: "2026-05-20" },
  { id: "2", first_name: "Priya", last_name: "Nair", email: "priya.nair@cloudbase.com", phone: "+1 555-0102", company_name: "CloudBase Ltd.", source: "manual_ocr", status: "reviewing", created_at: "2026-05-21" },
  { id: "3", first_name: "Marcus", last_name: "Webb", email: "marcus.webb@finsolve.net", phone: "+1 555-0103", company_name: "FinSolve", source: "inbound_web", status: "new", created_at: "2026-05-22" },
  { id: "4", first_name: "Sofia", last_name: "Reyes", email: "sofia.reyes@nexgen.io", phone: "+1 555-0104", company_name: "NexGen AI", source: "n8n_apify", status: "approved", created_at: "2026-05-22" },
  { id: "5", first_name: "Daniel", last_name: "Kim", email: "daniel.kim@vertexdata.co", phone: "+1 555-0105", company_name: "Vertex Data", source: "n8n_apify", status: "new", created_at: "2026-05-23" },
  { id: "6", first_name: "Ananya", last_name: "Gupta", email: "ananya.gupta@innosoft.in", phone: "+91 9800012345", company_name: "InnoSoft India", source: "inbound_web", status: "rejected", created_at: "2026-05-23" },
  { id: "7", first_name: "Liam", last_name: "O'Brien", email: "liam.obrien@saasly.com", phone: "+1 555-0107", company_name: "SaaSly Corp", source: "manual_ocr", status: "new", created_at: "2026-05-24" },
  { id: "8", first_name: "Yuki", last_name: "Tanaka", email: "yuki.tanaka@jptech.jp", phone: "+81 9000112233", company_name: "JPTech", source: "n8n_apify", status: "reviewing", created_at: "2026-05-25" },
];

export const mockAccounts = [
  { id: "1", name: "TechWave Inc.", domain: "techwave.io", industry: "SaaS", website: "https://techwave.io", employee_count: 320, annual_revenue: "$12M", founded_year: 2018, contacts: 4, deals: 2 },
  { id: "2", name: "CloudBase Ltd.", domain: "cloudbase.com", industry: "Cloud Infrastructure", website: "https://cloudbase.com", employee_count: 850, annual_revenue: "$45M", founded_year: 2014, contacts: 7, deals: 3 },
  { id: "3", name: "FinSolve", domain: "finsolve.net", industry: "FinTech", website: "https://finsolve.net", employee_count: 120, annual_revenue: "$8M", founded_year: 2020, contacts: 2, deals: 1 },
  { id: "4", name: "NexGen AI", domain: "nexgen.io", industry: "Artificial Intelligence", website: "https://nexgen.io", employee_count: 60, annual_revenue: "$3M", founded_year: 2022, contacts: 3, deals: 2 },
  { id: "5", name: "Vertex Data", domain: "vertexdata.co", industry: "Data Analytics", website: "https://vertexdata.co", employee_count: 200, annual_revenue: "$18M", founded_year: 2016, contacts: 5, deals: 1 },
];

export const mockContacts = [
  { id: "1", account_id: "1", first_name: "James", last_name: "Carter", email: "james.carter@techwave.io", phone: "+1 555-0101", job_title: "VP of Engineering", account_name: "TechWave Inc." },
  { id: "2", account_id: "1", first_name: "Rachel", last_name: "Thompson", email: "rachel.t@techwave.io", phone: "+1 555-0110", job_title: "Head of Product", account_name: "TechWave Inc." },
  { id: "3", account_id: "2", first_name: "Priya", last_name: "Nair", email: "priya.nair@cloudbase.com", phone: "+1 555-0102", job_title: "CTO", account_name: "CloudBase Ltd." },
  { id: "4", account_id: "3", first_name: "Marcus", last_name: "Webb", email: "marcus.webb@finsolve.net", phone: "+1 555-0103", job_title: "CEO", account_name: "FinSolve" },
  { id: "5", account_id: "4", first_name: "Sofia", last_name: "Reyes", email: "sofia.reyes@nexgen.io", phone: "+1 555-0104", job_title: "COO", account_name: "NexGen AI" },
  { id: "6", account_id: "5", first_name: "Daniel", last_name: "Kim", email: "daniel.kim@vertexdata.co", phone: "+1 555-0105", job_title: "Director of Sales", account_name: "Vertex Data" },
];

export const mockPipelineStages = [
  { id: "1", name: "Discovery", sort_order: 1, win_probability: 10 },
  { id: "2", name: "Demo", sort_order: 2, win_probability: 25 },
  { id: "3", name: "Proposal", sort_order: 3, win_probability: 50 },
  { id: "4", name: "Negotiation", sort_order: 4, win_probability: 75 },
  { id: "5", name: "Closed Won", sort_order: 5, win_probability: 100 },
  { id: "6", name: "Closed Lost", sort_order: 6, win_probability: 0 },
];

export const mockDeals = [
  { id: "1", name: "TechWave — Enterprise Suite", stage_id: "3", owner: "Gautham V.", account_name: "TechWave Inc.", total_amount: 48000, currency: "USD", created_at: "2026-04-10", contact: "James Carter" },
  { id: "2", name: "CloudBase — Pro Plan Upgrade", stage_id: "4", owner: "Arun S.", account_name: "CloudBase Ltd.", total_amount: 120000, currency: "USD", created_at: "2026-04-15", contact: "Priya Nair" },
  { id: "3", name: "FinSolve — Starter Pack", stage_id: "1", owner: "Divya R.", account_name: "FinSolve", total_amount: 12000, currency: "USD", created_at: "2026-05-01", contact: "Marcus Webb" },
  { id: "4", name: "NexGen AI — Custom Integration", stage_id: "2", owner: "Gautham V.", account_name: "NexGen AI", total_amount: 35000, currency: "USD", created_at: "2026-05-08", contact: "Sofia Reyes" },
  { id: "5", name: "Vertex Data — Analytics Bundle", stage_id: "5", owner: "Arun S.", account_name: "Vertex Data", total_amount: 75000, currency: "USD", created_at: "2026-03-20", contact: "Daniel Kim" },
  { id: "6", name: "TechWave — Support Contract", stage_id: "2", owner: "Divya R.", account_name: "TechWave Inc.", total_amount: 18000, currency: "USD", created_at: "2026-05-12", contact: "Rachel Thompson" },
  { id: "7", name: "CloudBase — Security Add-on", stage_id: "1", owner: "Gautham V.", account_name: "CloudBase Ltd.", total_amount: 9500, currency: "USD", created_at: "2026-05-20", contact: "Priya Nair" },
];

export const mockActivities = [
  { id: "1", user: "Gautham V.", entity_type: "deal", entity_name: "TechWave — Enterprise Suite", activity_type: "call_log", description: "45-min discovery call with James Carter. Discussed pain points with current ERP.", created_at: "2026-05-27T10:30:00Z" },
  { id: "2", user: "Arun S.", entity_type: "contact", entity_name: "Priya Nair", activity_type: "email", description: "Sent follow-up proposal PDF. Awaiting review by their legal team.", created_at: "2026-05-27T09:00:00Z" },
  { id: "3", user: "System", entity_type: "deal", entity_name: "Vertex Data — Analytics Bundle", activity_type: "note", description: "Deal moved from Negotiation to Closed Won.", created_at: "2026-05-26T16:45:00Z" },
  { id: "4", user: "Divya R.", entity_type: "account", entity_name: "FinSolve", activity_type: "meeting", description: "Intro meeting with Marcus Webb and CFO. Strong interest in compliance features.", created_at: "2026-05-26T14:00:00Z" },
  { id: "5", user: "Gautham V.", entity_type: "deal", entity_name: "NexGen AI — Custom Integration", activity_type: "note", description: "Sent technical architecture doc. They requested a custom webhook integration.", created_at: "2026-05-25T11:15:00Z" },
  { id: "6", user: "Arun S.", entity_type: "contact", entity_name: "Daniel Kim", activity_type: "call_log", description: "15-min check-in. Contract signed — moving to onboarding.", created_at: "2026-05-25T09:30:00Z" },
  { id: "7", user: "System", entity_type: "lead", entity_name: "Yuki Tanaka", activity_type: "note", description: "Lead enriched via Apollo.io — phone and LinkedIn URL added.", created_at: "2026-05-24T08:00:00Z" },
];

export const mockProducts = [
  { id: "1", sku: "CORE-001", name: "CRM Core Platform", description: "Base CRM license with up to 10 users.", base_price: 2400, billing_type: "recurring", is_active: true },
  { id: "2", sku: "ENT-002", name: "Enterprise Suite", description: "Full RevOps suite — unlimited users, advanced analytics, priority support.", base_price: 12000, billing_type: "recurring", is_active: true },
  { id: "3", sku: "INT-003", name: "n8n Automation Pack", description: "Pre-built n8n workflows for lead enrichment and notifications.", base_price: 1500, billing_type: "one_time", is_active: true },
  { id: "4", sku: "OCR-004", name: "AI Business Card Scanner", description: "Mobile OCR + LLM parsing module.", base_price: 800, billing_type: "one_time", is_active: true },
  { id: "5", sku: "SEC-005", name: "Security & Compliance Add-on", description: "RBAC, audit logs, and SOC2 compliance toolkit.", base_price: 3600, billing_type: "recurring", is_active: true },
  { id: "6", sku: "SUP-006", name: "Premium Support", description: "Dedicated customer success manager + SLA guarantee.", base_price: 1200, billing_type: "recurring", is_active: false },
];

export const mockUsers = [
  { id: "1", first_name: "Gautham", last_name: "V.", email: "gautham.v@uftech.com", role: "Account Executive", is_active: true, last_login: "2026-05-28" },
  { id: "2", first_name: "Arun", last_name: "S.", email: "arun.s@uftech.com", role: "Account Executive", is_active: true, last_login: "2026-05-27" },
  { id: "3", first_name: "Divya", last_name: "R.", email: "divya.r@uftech.com", role: "SDR", is_active: true, last_login: "2026-05-28" },
  { id: "4", first_name: "Keerthi", last_name: "M.", email: "keerthi.m@uftech.com", role: "RevOps Manager", is_active: true, last_login: "2026-05-26" },
  { id: "5", first_name: "Admin", last_name: "User", email: "admin@uftech.com", role: "System Admin", is_active: true, last_login: "2026-05-28" },
];

export const mockRoles = [
  { id: "1", name: "System Admin", description: "Full access to all modules, user management, and API keys." },
  { id: "2", name: "RevOps Manager", description: "Read/write access to analytics, pipeline, and all reports." },
  { id: "3", name: "Account Executive", description: "Full access to deals, contacts, accounts, and activities." },
  { id: "4", name: "SDR", description: "Access to leads queue, contacts, and activity logging." },
];

export const dashboardStats = {
  totalLeads: 128,
  totalContacts: 87,
  totalAccounts: 34,
  openDeals: 12,
  pipelineValue: 432500,
  closedWonMTD: 75000,
  avgDealSize: 36041,
  conversionRate: 28,
};

export const dealsByStage = [
  { stage: "Discovery", count: 4, value: 45000 },
  { stage: "Demo", count: 3, value: 62000 },
  { stage: "Proposal", count: 2, value: 83000 },
  { stage: "Negotiation", count: 2, value: 168000 },
  { stage: "Closed Won", count: 5, value: 274500 },
];

export const revenueOverTime = [
  { month: "Jan", revenue: 18000 },
  { month: "Feb", revenue: 24000 },
  { month: "Mar", revenue: 31000 },
  { month: "Apr", revenue: 28000 },
  { month: "May", revenue: 45000 },
  { month: "Jun", revenue: 52000 },
];

export type CalendarEventType = "meeting" | "task" | "call" | "deadline";

// A person attending a meeting. `is_external` marks someone from the lead's
// side (client) vs. an internal UFT team member.
export type MeetingAttendee = {
  name:         string;
  email?:       string;
  is_external?: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: CalendarEventType;
  assignee?: string;
  related_to?: string;
  done?: boolean;
  // ── Meeting tracking (Feature 2) ──
  meeting_mode?:     "online" | "offline";
  meeting_platform?: string;            // online: Google Meet / Zoom / Teams / …
  meeting_link?:     string;            // online: join URL
  location?:         string;            // offline: place / address
  attendees?:        MeetingAttendee[]; // everyone in the meeting
  recording_url?:    string;            // link to the meeting recording
  lead_id?:          string;            // links the meeting to a lead
};

export const mockCalendarEvents: CalendarEvent[] = [
  { id: "ce1",  title: "Demo call — TechWave",               date: "2026-05-30", time: "10:00", type: "call",     assignee: "Gautham V.", related_to: "TechWave Inc." },
  { id: "ce2",  title: "Send proposal to CloudBase",          date: "2026-05-30", time: "14:00", type: "task",     assignee: "Arun S.",    done: false },
  { id: "ce3",  title: "Follow up with FinSolve",             date: "2026-05-30", time: "16:30", type: "task",     assignee: "Divya R.",   related_to: "FinSolve", done: true },
  { id: "ce4",  title: "NexGen AI — Architecture Review",     date: "2026-05-31", time: "11:00", type: "meeting",  assignee: "Gautham V.", related_to: "NexGen AI — Custom Integration" },
  { id: "ce5",  title: "Q2 Pipeline Review",                  date: "2026-05-31", time: "15:00", type: "meeting",  assignee: "All" },
  { id: "ce6",  title: "Outreach — Vertex Data",              date: "2026-05-29", time: "09:30", type: "call",     assignee: "Arun S.",    done: true },
  { id: "ce7",  title: "Qualify new inbound leads",           date: "2026-05-29", time: "11:00", type: "task",     assignee: "Divya R.",   done: false },
  { id: "ce8",  title: "Proposal send deadline",              date: "2026-06-01",               type: "deadline",  related_to: "TechWave — Enterprise Suite" },
  { id: "ce9",  title: "Review new lead batch",               date: "2026-06-02",               type: "task",     assignee: "Gautham V.", done: false },
  { id: "ce10", title: "CloudBase contract deadline",         date: "2026-06-03", time: "EOD",  type: "deadline",  related_to: "CloudBase — Pro Plan Upgrade" },
  { id: "ce11", title: "Onboarding call — Vertex Data",       date: "2026-06-05", time: "10:00", type: "meeting",  assignee: "Arun S.",    related_to: "Vertex Data" },
  { id: "ce12", title: "Monthly revenue sync",                date: "2026-06-05", time: "15:30", type: "meeting",  assignee: "Keerthi M." },
  { id: "ce13", title: "Update CRM pipeline stages",          date: "2026-06-10",               type: "task",     assignee: "Gautham V.", done: false },
  { id: "ce14", title: "Q2 close call — NexGen",              date: "2026-06-12", time: "13:00", type: "call",     assignee: "Gautham V.", related_to: "NexGen AI — Custom Integration" },
];
