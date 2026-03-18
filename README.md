# Teaching LLM Platform

A comprehensive Learning Management System (LMS) built with **Next.js 14**, **React 18**, **TypeScript**, and **Prisma ORM**. The platform features a neumorphic UI design with Nunito typography, role-based access control with three tiers (Manager, Admin, Student), real-time community chat, integrated support ticketing, live chat support, and a full notification system.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture & Technology Stack](#2-architecture--technology-stack)
3. [Role Hierarchy & Permissions](#3-role-hierarchy--permissions)
4. [Getting Started](#4-getting-started)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [Authentication & Security](#7-authentication--security)
8. [Platform Workflow Guide](#8-platform-workflow-guide)
9. [Dashboard Sections & Features](#9-dashboard-sections--features)
10. [API Reference](#10-api-reference)
11. [Content Hierarchy & Management](#11-content-hierarchy--management)
12. [Support System](#12-support-system)
13. [Community & Notifications](#13-community--notifications)
14. [Security Analysis & Risks](#14-security-analysis--risks)
15. [Recommended Improvements](#15-recommended-improvements)

---

## 1. System Overview

Teaching LLM is a self-hosted learning management platform designed for educational institutions and coaching organizations. It provides:

- **Subject-based class organization** with nested topics and lecture content
- **Three-tier role hierarchy**: Manager → Admin → Student
- **Enrollment-based access control**: Admins and Students only see classes they are enrolled in; Managers see everything
- **Live class scheduling** with meeting link integration
- **Recorded lecture library** with YouTube embed and direct video support
- **Downloadable study materials** (PDF, PPTX, DOC, etc.)
- **Support ticket system** with threaded conversations
- **Real-time live chat** between students and support staff
- **Per-class community group chat**
- **Platform-wide announcements** with automatic notification fan-out
- **Calendar event management** for scheduling
- **Profile management** with avatar upload and password changes
- **Account termination and restoration** for student management

### Content Hierarchy

```
📚 Class (Subject)
├── 📖 Topics (organized sections within a subject)
│   └── 🎥 Content (individual lectures — video, PPT, notes)
├── 📄 Materials (downloadable files linked to the class)
├── 🔴 Live Sessions (scheduled video conferences)
├── 💬 Community Chat (class-specific group discussion)
└── 🎫 Support Tickets (per-subject or general support)
```

Each **Class** represents a subject (e.g., "Data Structures & Algorithms"). Within a class, **Topics** are ordered sections (e.g., "Arrays", "Trees"). Each topic contains **Content** items (individual lectures with video URLs, presentation URLs, and descriptions). Classes also have independent **Materials**, **Live Sessions**, and **Community Chat**.

---

## 2. Architecture & Technology Stack

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Backend** | Next.js API Routes (serverless functions) |
| **Database** | SQLite via Prisma ORM |
| **Authentication** | JWT tokens (7-day expiry) + bcryptjs password hashing |
| **UI Design** | Custom neumorphic design system, Nunito font (Google Fonts) |
| **Icons** | Lucide React |
| **Video** | YouTube embed, direct video URL support |
| **Real-time** | Polling-based (3–4s for chats, 15s for notifications) |
| **File Hosting** | External URL-based (Google Drive, Dropbox, etc.) |
| **Date Handling** | date-fns |
| **Unique IDs** | cuid (Prisma default), UUID package |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                     Browser (Client)                │
│   ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│   │  React   │  │  Sidebar  │  │   Header +      │  │
│   │  Pages   │  │  Nav      │  │   Notifications │  │
│   └────┬─────┘  └──────────┘  └─────────────────┘  │
│        │  HTTP (fetch)                              │
├────────┼────────────────────────────────────────────┤
│        ▼                                            │
│   ┌──────────────────────────────────────────────┐  │
│   │        Next.js API Routes (/api/*)           │  │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │  │
│   │  │  Auth    │ │  CRUD    │ │  Support     │ │  │
│   │  │  Layer   │ │  Routes  │ │  System      │ │  │
│   │  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │  │
│   │       └─────────────┼──────────────┘         │  │
│   │                     ▼                        │  │
│   │            ┌──────────────┐                  │  │
│   │            │  Prisma ORM  │                  │  │
│   │            └──────┬───────┘                  │  │
│   │                   ▼                          │  │
│   │            ┌──────────────┐                  │  │
│   │            │   SQLite DB  │                  │  │
│   │            └──────────────┘                  │  │
│   └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Authentication Flow

```
Login Page  ──POST /api/auth/login──→  Validate credentials
                                          │
                                          ▼
                                   Hash compare (bcrypt)
                                          │
                                          ▼
                                   Check isTerminated
                                          │
                                   ┌──────┴──────┐
                                   │ terminated?  │
                                   ├── Yes → 403  │
                                   └── No ────────┘
                                          │
                                          ▼
                                   Sign JWT token
                                   (userId, email, role, name)
                                          │
                                          ▼
                                   Set HttpOnly cookie
                                   "teaching_llm_token"
                                   (7-day expiry)
                                          │
                                          ▼
                                   Redirect → /dashboard
```

---

## 3. Role Hierarchy & Permissions

The platform implements a three-tier role system: **MANAGER**, **ADMIN**, and **STUDENT**.

### Role Overview

| Aspect | MANAGER | ADMIN | STUDENT |
|---|---|---|---|
| **Account creation** | Can create all roles | Can create STUDENT accounts only | Cannot create accounts |
| **User management** | Full CRUD, terminate/restore | View + edit students in own enrolled classes | None |
| **Class creation** | Yes (sees all classes) | Yes (auto-enrolled on creation, sees only enrolled classes) | No |
| **Class deletion** | Yes | No | No |
| **Content management** | Full CRUD on all content | Full CRUD on enrolled classes only | View only (enrolled classes) |
| **Live session scheduling** | Yes (all classes) | Yes (enrolled classes only) | View + Join only (enrolled classes) |
| **Material upload** | Yes (all classes) | Yes (enrolled classes only) | View + Download only |
| **Announcement posting** | Yes | Yes | View only |
| **Calendar events** | Create + Manage (all) | Create + Manage (enrolled classes only) | View only (enrolled classes + unlinked events) |
| **Support tickets** | View all, assign, change status | View tickets for enrolled classes + assigned tickets | Create own, reply to own |
| **Live chat support** | Join + respond to chats | Join + respond to chats | Start chat sessions |
| **FAQ management** | Full CRUD | View only | View only |
| **Chat history** | View + delete all history | No access | No access |
| **Community chat** | Post + view all classes with security numbers | Post + view enrolled classes only | Post + view enrolled classes only |
| **View security numbers** | Yes | No | No |
| **Profile management** | Own profile | Own profile | Own profile |
| **Enrollment scope** | Sees all classes (no enrollment filter) | Sees only enrolled classes | Sees only enrolled classes |

### Detailed Role Permissions Table

| Action | STUDENT | ADMIN | MANAGER |
|---|:---:|:---:|:---:|
| View subjects / topics / lectures | ✅ | ✅ | ✅ |
| Create subjects (classes) | ❌ | ✅ | ✅ |
| Edit class content (topics, lectures) | ❌ | ✅ | ✅ |
| Delete classes | ❌ | ❌ | ✅ |
| Manage user accounts | ❌ | ✅ (students in own classes) | ✅ (all) |
| Upload study materials | ❌ | ✅ | ✅ |
| Schedule live sessions | ❌ | ✅ | ✅ |
| Create announcements | ❌ | ✅ | ✅ |
| Raise support tickets | ✅ | ✅ | ✅ |
| Reply to tickets | ✅ (own) | ✅ (assigned) | ✅ (all) |
| Change ticket status | ❌ | ✅ | ✅ |
| Assign tickets | ❌ | ❌ | ✅ |
| Start live chat | ✅ | ❌ | ❌ |
| Join / respond to live chat | ❌ | ✅ | ✅ |
| Manage FAQs | ❌ | ❌ | ✅ |
| View chat history | ❌ | ❌ | ✅ |
| Post in community chat | ✅ | ✅ | ✅ |
| See student security numbers | ❌ | ❌ | ✅ |
| Receive notifications | ✅ | ✅ | ✅ |
| Terminate / restore students | ❌ | ❌ | ✅ |
| See only enrolled classes | ✅ | ✅ | ❌ (sees all) |

### How Permissions Are Enforced

1. **Middleware (Edge Runtime)**: The Next.js middleware (`src/middleware.ts`) intercepts every request. It checks for the `teaching_llm_token` cookie. If missing, the user is redirected to `/login`. The JWT payload is decoded (without signature verification at the edge) to enforce route-level access:
   - `/admin` routes → only `MANAGER`
   - `/manage` routes → `ADMIN` or `MANAGER` (not `STUDENT`)

2. **API Route Guards**: Every API route calls `getSession()` to verify the JWT with full signature validation. Role checks are performed using helper functions (`isManager()`, `isAdminOrManager()`). Unauthorized requests receive `401` (no session) or `403` (insufficient role).

3. **Enrollment-Based Access Control**: The `getAccessibleClassIds()` function in `src/lib/auth.ts` determines which classes a user can access:
   - **MANAGER**: Returns `null` (meaning no filtering — access to all classes)
   - **ADMIN / STUDENT**: Returns an array of `classId` values from their `Enrollment` records
   
   This function is used across nearly all API routes (classes, live sessions, events, stats, community, tickets, user management) to filter data so that non-Manager users only see content for their enrolled classes.

4. **Admin Scoped User Management**: Admins can now view and manage users through the API:
   - `GET /api/users`: Admins see only STUDENT accounts enrolled in classes the Admin is also enrolled in
   - `POST /api/users`: Admins can only create STUDENT accounts and can only assign classes they themselves have access to
   - `PUT /api/users/[id]`: Admins can only edit STUDENT accounts and cannot change role or termination status
   - Managers retain full unrestricted access to all users and operations

5. **Frontend Conditional Rendering**: Sidebar navigation items are hidden based on the user's role. Pages like `/admin` and `/manage` are only visible to permitted roles. Buttons for editing, deleting, and managing content are conditionally rendered.

---

## 4. Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** (or yarn/pnpm)
- A terminal / command line

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Tushaaaaarrrrrr/Teaching-llm.git
cd Teaching-llm

# 2. Install dependencies
npm install

# 3. Create environment file
#    DATABASE_URL — path to the SQLite database file
#    JWT_SECRET  — secret key for signing JWT tokens (use a strong random value)
echo 'DATABASE_URL="file:./dev.db"' > .env
echo 'JWT_SECRET="your-secure-random-secret-change-this-in-production"' >> .env

# 4. Push the database schema (creates SQLite database)
npm run db:push

# 5. Seed the database with sample data (optional but recommended for first run)
npm run db:seed

# 6. Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Default Seed Accounts

After running `npm run db:seed`, the following test accounts are available:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@teacherai.com` | `admin123` |
| **Student** | `student@teacherai.com` | `student123` |
| **Student** | `priya@teacherai.com` | `student123` |
| **Student** | `amit@teacherai.com` | `student123` |

The seed also creates 6 sample classes (DSA, Machine Learning, Web Development, Database Systems, Operating Systems, Computer Networks) with multiple lectures each.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run db:push` | Push Prisma schema changes to the database |
| `npm run db:seed` | Seed database with sample data (clears existing data first) |
| `npm run db:studio` | Open Prisma Studio (visual database browser) |

### Quick Access Buttons

The login page features **Quick Access** buttons for demo purposes. Click "Admin" or "Student" to auto-fill the corresponding test credentials and log in instantly.

---

## 5. Project Structure

```
Teaching-llm/
├── prisma/
│   ├── schema.prisma          # Database schema — all models & relations
│   └── seed.ts                # Database seeder — creates test data
├── public/
│   └── uploads/
│       └── avatars/           # User-uploaded avatar images
├── src/
│   ├── middleware.ts           # Edge middleware — auth guard & route protection
│   ├── app/
│   │   ├── globals.css         # Global styles & neumorphic design tokens
│   │   ├── layout.tsx          # Root layout — HTML shell, Nunito font
│   │   ├── login/
│   │   │   └── page.tsx        # Login page — email/password + quick access
│   │   ├── terminated/
│   │   │   └── page.tsx        # Termination notice page for blocked accounts
│   │   ├── (dashboard)/        # Authenticated route group
│   │   │   ├── layout.tsx      # Dashboard layout — sidebar + header + auth guard
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx    # Home — stats, live sessions, lectures, announcements
│   │   │   ├── classes/
│   │   │   │   ├── page.tsx    # Class list — search + browse all subjects
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Class detail — topics + video modal
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx  # Class editor — manage topics + content
│   │   │   ├── live/
│   │   │   │   └── page.tsx    # Live classes — timeline view
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx    # Calendar — monthly grid + event list
│   │   │   ├── recordings/
│   │   │   │   └── page.tsx    # Recordings — browse/watch lecture videos
│   │   │   ├── materials/
│   │   │   │   └── page.tsx    # Materials — browse/download study files
│   │   │   ├── community/
│   │   │   │   └── page.tsx    # Community — per-class group chat
│   │   │   ├── support/
│   │   │   │   └── page.tsx    # Support — FAQ + tickets + live chat + history
│   │   │   ├── manage/
│   │   │   │   └── page.tsx    # Content management — CRUD for all content
│   │   │   ├── admin/
│   │   │   │   └── page.tsx    # User admin — CRUD users, terminate/restore
│   │   │   └── settings/
│   │   │       └── page.tsx    # Profile — name, password, avatar
│   │   └── api/                # API Routes (see Section 10)
│   │       ├── auth/           # Login, logout, session
│   │       ├── classes/        # Class CRUD + topics
│   │       ├── lectures/       # Lecture CRUD
│   │       ├── materials/      # Material CRUD
│   │       ├── live-sessions/  # Live session CRUD
│   │       ├── events/         # Calendar event CRUD
│   │       ├── announcements/  # Announcement CRUD + notification fan-out
│   │       ├── notifications/  # Notification read/list
│   │       ├── profile/        # Profile, avatar, password
│   │       ├── support/        # Tickets, live chats, FAQ, chat history
│   │       ├── community/      # Per-class community messages
│   │       ├── topics/         # Topic CRUD
│   │       ├── content/        # Content CRUD (lectures within topics)
│   │       ├── stats/          # Dashboard statistics
│   │       └── users/          # User management (Manager only)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx      # Top bar — page title, notifications, user menu
│   │   │   └── Sidebar.tsx     # Left nav — role-based menu items
│   │   └── ui/                 # Reusable UI components
│   ├── lib/
│   │   ├── auth.ts             # JWT sign/verify, bcrypt, session helpers
│   │   └── db.ts               # Prisma client singleton
│   └── styles/                 # Additional style files
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
└── next-env.d.ts               # Next.js TypeScript declarations
```

### Key Directories Explained

| Directory | Purpose |
|---|---|
| `prisma/` | Database schema definition and seed script |
| `src/app/(dashboard)/` | All authenticated pages (grouped route without URL prefix) |
| `src/app/api/` | All REST API endpoints as Next.js route handlers |
| `src/components/layout/` | Persistent layout components (Header, Sidebar) |
| `src/lib/` | Shared utility functions (auth, database) |
| `public/uploads/avatars/` | Server-side storage for uploaded avatar images |

---

## 6. Database Schema

The platform uses **SQLite** via **Prisma ORM**. All models are defined in `prisma/schema.prisma`.

### Entity Relationship Overview

```
User ──────┬──── creates ────→ Class
           │                     │
           │                     ├── has many → Topic → Content
           │                     ├── has many → Lecture
           │                     ├── has many → Material
           │                     ├── has many → LiveSession
           │                     ├── has many → CalendarEvent
           │                     ├── has many → CommunityMessage
           │                     ├── has many → SupportTicket
           │                     └── has many → Enrollment ←── User
           │
           ├──── uploads ────→ Lecture, Material
           ├──── creates ────→ LiveSession, CalendarEvent
           ├──── submits ────→ SupportTicket (as student)
           ├──── assigned ───→ SupportTicket (as agent)
           ├──── replies ────→ TicketReply
           ├──── starts ─────→ ChatSession (as student)
           ├──── joins ──────→ ChatSession (as agent)
           ├──── sends ──────→ ChatMessage, CommunityMessage
           └──── receives ───→ Notification
```

### Model Descriptions

#### Core Models

| Model | Purpose | Key Fields |
|---|---|---|
| **User** | Stores all platform accounts | `id`, `name`, `email`, `passwordHash`, `role` (MANAGER/ADMIN/STUDENT), `avatar`, `securityNumber`, `isTerminated` |
| **Class** | Top-level subject containers | `id`, `name`, `description`, `subject`, `color`, `icon`, `createdById` |
| **Topic** | Ordered sections within a class | `id`, `classId`, `title`, `order` |
| **Content** | Individual lectures within topics | `id`, `topicId`, `title`, `description`, `videoUrl`, `pptUrl`, `order` |
| **Lecture** | Direct class-level lecture entries | `id`, `classId`, `title`, `videoUrl`, `notesUrl`, `duration`, `thumbnail`, `uploadedById` |
| **Material** | Downloadable files for a class | `id`, `classId`, `title`, `fileUrl`, `fileType`, `fileSize`, `uploadedById` |
| **LiveSession** | Scheduled video conferences | `id`, `classId`, `title`, `meetingLink`, `instructor`, `date`, `time`, `status`, `createdById` |
| **CalendarEvent** | Schedule entries | `id`, `title`, `date`, `time`, `type`, `classId`, `createdById` |
| **Enrollment** | Many-to-many: User ↔ Class | `id`, `userId`, `classId` (unique pair) |

#### Support & Communication Models

| Model | Purpose | Key Fields |
|---|---|---|
| **SupportTicket** | Issue tickets raised by students | `id`, `title`, `description`, `type` (GENERAL/SUBJECT), `status` (OPEN/IN_PROGRESS/RESOLVED/CLOSED), `priority` (LOW/MEDIUM/HIGH), `studentId`, `classId`, `assignedToId` |
| **TicketReply** | Threaded replies within a ticket | `id`, `ticketId`, `senderId`, `content` |
| **ChatSession** | Live chat between student and staff | `id`, `studentId`, `agentId`, `status` (WAITING/ACTIVE/CLOSED), `expiresAt` |
| **ChatMessage** | Messages within a live chat | `id`, `chatId`, `senderId`, `content` |
| **CommunityMessage** | Per-class group chat messages | `id`, `classId`, `senderId`, `content` |

#### System Models

| Model | Purpose | Key Fields |
|---|---|---|
| **Announcement** | Platform-wide announcements | `id`, `title`, `content`, `type` (info/success/warning/error) |
| **Notification** | Per-user notification entries | `id`, `userId`, `title`, `content`, `type`, `isRead`, `announcementId` |
| **Faq** | Frequently asked questions | `id`, `question`, `answer`, `order` |

### Security Number

Every user is assigned a unique, immutable **Security Number** on account creation:
- **Format**: `SEC` + 7 random alphanumeric characters (e.g., `SEC58A0U8F`)
- **Generated**: Automatically during user creation
- **Immutable**: Cannot be changed after assignment
- **Unique**: Enforced at the database level (`@unique` constraint)
- **Visibility**: Only visible to **Managers** in the Community chat (shown as a yellow badge next to sender names)

---

## 7. Authentication & Security

### How Authentication Works

1. **Login**: User submits email + password to `POST /api/auth/login`.
2. **Validation**: The API looks up the user by email, compares the password hash using bcrypt.
3. **Termination Check**: If `isTerminated === true`, the login is rejected with a 403 error.
4. **JWT Signing**: A JWT token is created with the payload `{ userId, email, role, name }`, signed with `JWT_SECRET`, and set to expire in 7 days.
5. **Cookie Storage**: The token is stored in an `HttpOnly`, `SameSite=lax` cookie named `teaching_llm_token`, with `secure: true` in production.
6. **Session Retrieval**: Subsequent requests call `getSession()` which reads the cookie and verifies the JWT signature.
7. **Logout**: `POST /api/auth/logout` deletes the auth cookie.

### Middleware Protection

The middleware (`src/middleware.ts`) runs on the Edge Runtime for every non-static request:

- **Public Paths** (no auth required): `/login`, `/api/auth/login`, `/terminated`
- **Root `/`**: Redirects to `/dashboard` if authenticated, `/login` if not
- **Protected Paths**: Requires a valid `teaching_llm_token` cookie
- **Role-Based Routing**:
  - `/admin/*` → Only `MANAGER` role
  - `/manage/*` → Only `ADMIN` or `MANAGER` roles (not `STUDENT`)
- **Fallback**: Invalid or expired tokens redirect to `/login` and clear the cookie

### Password Security

- Passwords are hashed with **bcryptjs** using a salt round of **12**
- Password changes require current password verification
- New passwords must be at least 6 characters
- Raw passwords are never stored or logged

### Cookie Configuration

```javascript
{
  httpOnly: true,              // Not accessible from JavaScript
  secure: true,                // HTTPS only (in production)
  sameSite: 'lax',             // CSRF protection
  maxAge: 60 * 60 * 24 * 7,   // 7-day expiry
  path: '/',                   // Available across all routes
}
```

---

## 8. Platform Workflow Guide

This section describes the end-to-end workflows for operating the platform. Follow these step-by-step instructions to understand how each process works.

### 8.1 Account Creation (Manager and Admin)

**Who can do this**: `MANAGER` (can create any role) or `ADMIN` (can create STUDENT accounts only).

**Where**: Managers → **User Admin** (`/admin`) from the sidebar. Admins → **User Admin** access via `/api/users` API.

**Steps**:
1. Click the **"+ Create User"** button in the top-right corner.
2. Fill in the creation form:
   - **Name** (required): Full name of the user
   - **Email** (required): Must be unique across the platform
   - **Password** (required): Initial login password
   - **Role** (required): Select `MANAGER`, `ADMIN`, or `STUDENT` (Admins can only select `STUDENT`)
   - **Class Enrollment** (optional): Assign the user to one or more classes at creation time
3. Click **"Create"** to save.
4. The system automatically generates a unique **Security Number** (e.g., `SEC58A0U8F`) for the new account.
5. If class IDs were provided, the user is automatically enrolled in those classes via the `Enrollment` table.
6. The new user can now log in at `/login` with their email and password.

**Admin Restrictions**:
- Admins can only create `STUDENT` accounts (attempting to create ADMIN or MANAGER returns 403)
- Admins can only assign classes they themselves are enrolled in
- Admins cannot change a user's role or termination status

**Example**: To enroll a new student named "Rohan Gupta" into specific classes:
```json
{
  "name": "Rohan Gupta",
  "email": "rohan@example.com",
  "password": "securepassword",
  "role": "STUDENT",
  "classIds": ["class_id_1", "class_id_2"]
}
```

### 8.2 Subject (Class) Creation

**Who can do this**: `MANAGER` or `ADMIN` roles.

**Where**: Navigate to **Manage** (`/manage`) from the sidebar → **Classes** tab.

**Steps**:
1. Click **"+ Create"** button.
2. Fill in the form:
   - **Name** (required): Subject title (e.g., "Data Structures & Algorithms")
   - **Description**: Course overview text
   - **Subject**: Academic category (e.g., "Computer Science")
   - **Color**: Select a visual theme color from the palette
   - **Icon**: Select a subject icon (BookOpen, Brain, Globe, Database, Monitor, Wifi)
3. Click **"Create"** to save.
4. The new class is created.
5. **If created by an ADMIN**: The creating Admin is automatically enrolled in the new class (so they have immediate access to manage it).
6. **If created by a MANAGER**: No enrollment is created (Managers see all classes regardless of enrollment).
7. The class is visible to all enrolled users, and to all Managers.

### 8.3 Adding Topics and Content to a Class

**Who can do this**: `MANAGER` or `ADMIN` roles.

**Where**: Navigate to a specific class → Click **"Manage Subject"** button → Opens the class editor (`/classes/[id]/edit`).

**Step 1 — Add a Topic**:
1. Click the **"Add Topic"** button.
2. Enter the topic title (e.g., "Arrays and Complexity Analysis").
3. Save — the topic appears as a collapsible section.
4. Repeat for additional topics. Topics can be reordered using up/down buttons.

**Step 2 — Add Content (Lectures) Within a Topic**:
1. Expand a topic section.
2. Click **"Add Content"** within that topic.
3. Fill in the content form:
   - **Title** (required): Lecture name
   - **Description**: Detailed explanation
   - **Video URL**: YouTube link or direct video file URL
   - **PPT URL**: Link to presentation or downloadable file
4. Save — the content item appears under the topic.

**Example Topic Structure**:
```
📖 Topic: "Arrays and Complexity Analysis"
   🎥 Content: "Introduction to Arrays" — Video: youtube.com/watch?v=...
   🎥 Content: "Big-O Notation Explained" — Video: youtube.com/watch?v=...
   📄 Content: "Practice Problems" — PPT: drive.google.com/file/...

📖 Topic: "Linked Lists"
   🎥 Content: "Singly Linked Lists" — Video: youtube.com/watch?v=...
   🎥 Content: "Doubly & Circular Lists" — Video: youtube.com/watch?v=...
```

### 8.4 Uploading Materials

**Who can do this**: `MANAGER` or `ADMIN` roles.

**Where**: **Manage** (`/manage`) → **Materials** tab.

**Steps**:
1. Click **"+ Create"** button.
2. Select the class and topic this material belongs to.
3. Enter title, description, and the file URL.
4. Optionally add a video URL.
5. Save — the material appears in the Materials library for students.

**Supported File Types**: PDF, PPTX, PPT, DOC, DOCX, XLS, XLSX, ZIP, PNG, JPG.

> **Note**: The current implementation uses **URL-based linking**. Upload files to cloud storage (Google Drive, Dropbox, etc.) and paste the public/shareable URL into the form.

### 8.5 Scheduling Live Sessions

**Who can do this**: `MANAGER` or `ADMIN` roles.

**Where**: **Manage** (`/manage`) → **Live Sessions** tab.

**Steps**:
1. Click **"+ Create"** button.
2. Fill in the form:
   - **Class**: Select the subject this session belongs to
   - **Title**: Session name (e.g., "Doubt Clearing Session — Trees")
   - **Instructor**: Name of the person conducting the session
   - **Meeting Link**: URL for the video conference (Jitsi Meet, Zoom, Google Meet, etc.)
   - **Date**: Session date
   - **Time**: Session time
   - **Status**: `scheduled`, `live`, `completed`, `cancelled`, `rescheduled`
3. Save — the session appears on the Live Classes page and Dashboard.

**Live Session Status Lifecycle**:
```
scheduled → live → completed
              └──→ cancelled
              └──→ rescheduled
```

### 8.6 Posting Announcements

**Who can do this**: `MANAGER` or `ADMIN` roles.

**Where**: **Manage** (`/manage`) → **Announcements** tab.

**Steps**:
1. Click **"+ Create"** button.
2. Enter the announcement:
   - **Title**: Headline of the announcement
   - **Content**: Full announcement text
   - **Type**: `info` (blue), `success` (green), `warning` (yellow), `error` (red)
3. Save — the announcement:
   - Appears on the Dashboard announcements section
   - **Automatically creates a Notification** for every user in the system
   - Users see the notification badge update in real-time (within 15 seconds)

### 8.7 Student and Admin Enrollment Workflow

The platform uses **enrollment-based access control** through the `Enrollment` model. Students and Admins can only see and interact with classes they are enrolled in. Managers bypass enrollment and see all classes.

**How Enrollment Works**:
- When a Manager or Admin **creates a user** with `classIds`, the user is automatically enrolled in those classes.
- When an Admin **creates a class**, they are auto-enrolled in it.
- Managers can **update a user's enrollments** at any time by sending a `PUT /api/users/[id]` request with a new `classIds` array (replaces all existing enrollments).
- The `getAccessibleClassIds()` utility function in `src/lib/auth.ts` returns enrolled class IDs for Admins/Students, or `null` for Managers (meaning unrestricted access).

**What Enrollment Filters**:
| Resource | Manager | Admin/Student |
|---|---|---|
| Classes list | All classes | Only enrolled classes |
| Live sessions | All sessions | Only sessions for enrolled classes |
| Calendar events | All events | Unlinked events + events for enrolled classes |
| Community chat | All class chats | Only enrolled class chats |
| Support tickets | All tickets | Tickets for enrolled classes (Admin) / own tickets (Student) |
| Dashboard stats | Platform-wide counts | Counts scoped to enrolled classes |
| Materials/recordings | All | Scoped to enrolled classes |

**How Students Access Content**:
1. Go to **Classes** (`/classes`) → Browse subject cards (only enrolled classes are shown).
2. Click a class card → Opens the class detail page with topics and content.
3. Expand a topic → See individual lectures.
4. Click **"Watch"** on a lecture → Opens a full-screen video modal.
5. Click **"Download"** → Downloads linked PPT/notes files.

### 8.8 Support Ticket Handling

**Step 1 — Student Creates a Ticket**:
1. Navigate to **Support** (`/support`).
2. Click **"+ New Ticket"**.
3. Choose type: **General Support** or **Subject Related**.
4. If subject-related, select the relevant class from the dropdown.
5. Enter title, description, and priority (LOW / MEDIUM / HIGH).
6. Submit.

**Step 2 — Staff Responds**:
1. Admin/Manager goes to **Support** → **Tickets** tab.
2. Click a ticket to open the conversation panel.
3. Type a reply → Status automatically changes to `IN_PROGRESS`.
4. Change status as needed (OPEN → IN_PROGRESS → RESOLVED → CLOSED).

**Step 3 — Student Reviews Reply**:
1. Student opens their ticket from the Support page.
2. Sees the staff reply in the threaded conversation.
3. Can reply back for follow-up.

**Ticket Visibility by Role**:

| Role | What They See |
|---|---|
| Student | Only their own tickets |
| Admin | General tickets + tickets for classes they created |
| Manager | All tickets across all subjects |

### 8.9 User Termination and Restoration

**Who can do this**: Only `MANAGER` role.

**Where**: **User Admin** (`/admin`).

**To Terminate a Student**:
1. Find the student in the user list.
2. Click the **"Terminate"** button (only available for STUDENT accounts).
3. Confirm the action.
4. The student's `isTerminated` flag is set to `true`.
5. Next time the student tries to access any page, they are redirected to the `/terminated` page with the message: *"Your ID has been terminated. Please contact the Admin for further details."*
6. The student cannot log in again (login returns 403).

**To Restore a Student**:
1. Find the terminated student (shown with a "Terminated" badge).
2. Click **"Revert"** to restore their account.
3. The student can log in and access the platform again.

> **Note**: Termination only applies to STUDENT accounts. Manager and Admin accounts cannot be terminated through this flow.

### 8.10 Managing Calendar Events

**Who can do this**: `MANAGER` or `ADMIN` roles.

**Steps**:
1. Navigate to **Calendar** (`/calendar`).
2. Events are displayed on a monthly grid view.
3. To create an event, use the Manage page or API.
4. Event types include: `class`, `exam`, `assignment`, `event`, `holiday`.
5. Each event shows date, time, title, and an optional class association.

---

## 9. Dashboard Sections & Features

### 9.1 Home Dashboard (`/dashboard`)

The main landing page after login. Displays:

- **Stats Grid**: Total Classes, Total Lectures, Upcoming Sessions (and Students Enrolled for Managers)
- **Active Now**: Live sessions carousel with animated slide transitions, green pulsing badge, and "Join" buttons linking to the meeting URL
- **Up Next**: The next 2 scheduled sessions
- **Recent Lectures**: Grid of the 3 most recent lecture recordings with colored icons, class badges, and Watch/Download buttons
- **Announcements**: Chronological list of platform announcements with type-colored left borders (blue, green, yellow, red)

### 9.2 Classes (`/classes`)

- **Search Bar**: Filter classes by name or subject
- **Class Cards** (3-column grid): Each card shows a gradient banner with decorative circles, the class icon, name, subject badge, description, instructor name, and stats (lecture count, material count, live session count)
- **Click a Card**: Opens the class detail page

### 9.3 Class Detail (`/classes/[id]`)

- **Header Banner**: Class name, description, subject, topic/lecture counts, and a "Manage Subject" button (Admin/Manager only)
- **Topics List**: Expandable/collapsible sections numbered sequentially
- **Content Items**: Within each topic — lecture icon, title, description, Watch button (opens video modal), Download PPT button
- **Video Modal**: Full-screen overlay with YouTube iframe embed or direct video player

### 9.4 Class Editor (`/classes/[id]/edit`) — Admin/Manager Only

- **Topic Management**: Add, edit title, delete, and reorder topics
- **Content Management**: Add/edit/delete lecture content within topics with modal forms for title, description, video URL, and PPT URL

### 9.5 Live Classes (`/live`)

- **Timeline Visualization**: Vertical timeline with animated status indicators
- **Session Cards**: Show time, class name, title, instructor, status badge, and action button
- **Status Indicators**: Green pulse (live), gray ring (scheduled), gray fill (completed), red (cancelled), orange (rescheduled)
- **Join Button**: Active for live sessions, links to the meeting URL

### 9.6 Calendar (`/calendar`)

- **Monthly Grid**: 7-column day grid with month navigation (Today, Previous, Next)
- **Event Dots**: Colored indicators on days with events (max 3 shown, "+X more" for overflow)
- **Events List**: All events for the current month with date badges, type labels (Class, Exam, Assignment, Event, Holiday), time, and description
- **Today Highlight**: Current day highlighted in purple

### 9.7 Recordings (`/recordings`)

- **Search Bar**: Filter by title, class, or topic
- **Subject Filter Chips**: "All Subjects" + per-class colored buttons
- **Lecture List**: Play icon badge, title, class badge, topic, upload date, Watch button (opens video modal), Download link
- **Video Modal**: Same as class detail page

### 9.8 Study Materials (`/materials`)

- **Search Bar**: Filter by name
- **Material List**: File type badge (PDF, PPTX, DOC, etc. — color-coded), title, class badge, topic, date, download button
- **File Type Detection**: Automatically reads URL extension and displays the appropriate badge

### 9.9 Community (`/community`)

- **Split Layout**: Left sidebar with class list pills (click to switch) + right chat panel
- **Chat Features**: Message bubbles (own = blue, others = light, admin = purple), sender name, role badge for staff, timestamps, auto-scroll to newest
- **Security Numbers**: Only visible to Managers (yellow badge next to sender name)
- **Polling**: Messages refresh every 4 seconds
- **Input**: Text field + send button (enabled only with text)

### 9.10 Support (`/support`)

Multi-modal support system with several views:

- **Home View**:
  - **FAQ Section**: Collapsible accordion items, with Add/Edit/Remove buttons (Manager only)
  - **Live Chat Card**: "Start Live Chat Support" (Students) or "Manage Live Chats" (Staff)
  - **Chat History Button**: View past conversations (Manager only)

- **All Tickets View**: Ticket list with status icons, priority badges, class badges, threaded conversation panel, reply input, status controls (Admin/Manager), assignment dropdown (Manager)

- **Live Chat View**: Active chat sessions, message thread, Join/Close actions, message input

- **Chat History View** (Manager only): Previous chat transcripts with View/Delete actions

### 9.11 Manage (`/manage`) — Admin/Manager Only

Tabbed interface for bulk content management:

| Tab | Features |
|---|---|
| **Classes** | Create/edit/delete subjects with color picker and icon selector |
| **Lectures** | Create/edit/delete lectures — class + topic selectors, video/PPT URLs |
| **Live Sessions** | Create/edit/delete sessions — meeting link, date, time, status |
| **Materials** | Create/edit/delete materials — class + topic selectors, file URL, type |
| **Announcements** | Create/edit/delete announcements — title, content, type (auto-notifies all users) |

### 9.12 User Admin (`/admin`) — Manager Only (UI) / Admin via API

- **Stats Cards**: Clickable filters showing count of All Users, Managers, Admins, Students
- **User List**: Avatar, name, email, role badge (color-coded), join date, action buttons
- **Create User Modal**: Name, email, password, role dropdown, class enrollment selection
- **Edit User Modal**: Same form with optional password update and enrollment management
- **Terminate/Revert**: Toggle student account termination status (Manager only)
- **Delete User**: Permanently remove an account — Manager only (prevents self-deletion)

**Admin Access via API**:
- Admins can call `GET /api/users` to see STUDENT accounts enrolled in the same classes
- Admins can call `POST /api/users` to create STUDENT accounts with class enrollment
- Admins can call `PUT /api/users/[id]` to update student name, email, password, and enrollments
- Admins **cannot**: change roles, terminate/restore accounts, or delete users

### 9.13 Settings (`/settings`)

- **Profile Card**: Large clickable avatar (upload on click), name, email, role badge, security number, join date
- **Personal Information**: Editable name field, read-only email (contact admin to change)
- **Change Password**: Current password + new password + confirm password, toggle visibility, min 6 character validation
- **Account Details**: Read-only info — Account ID, Security Number, Role, Member Since

---

## 10. API Reference

All endpoints are under `/api/`. Authentication is via the `teaching_llm_token` HttpOnly cookie.

### Authentication

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/api/auth/login` | No | Any | Authenticate with email + password, returns JWT cookie |
| POST | `/api/auth/logout` | Yes | Any | Clear authentication cookie |
| GET | `/api/auth/me` | Yes | Any | Get current session user profile |

### User Management

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/users` | Yes | Admin/Manager | Manager=all users; Admin=students enrolled in admin's classes. Includes enrollment data. |
| POST | `/api/users` | Yes | Admin/Manager | Create user + optional class enrollment. Admin: STUDENT role only, enrolled classes only. |
| PUT | `/api/users/[id]` | Yes | Admin/Manager | Update user + optional enrollment update. Admin: students only, no role/termination changes. |
| DELETE | `/api/users/[id]` | Yes | Manager | Delete user (prevents self-deletion) |

### Classes

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/classes` | Yes | Any | List classes filtered by enrollment (Manager=all, others=enrolled only) |
| POST | `/api/classes` | Yes | Admin/Manager | Create new class (Admin is auto-enrolled in the new class) |
| GET | `/api/classes/[id]` | Yes | Any | Get single class with all lectures, materials, sessions, events |
| PUT | `/api/classes/[id]` | Yes | Admin/Manager | Update class details |
| DELETE | `/api/classes/[id]` | Yes | Manager | Delete class |
| GET | `/api/classes/[id]/topics` | Yes | Any | Get topics for a class (with content, ordered) |
| POST | `/api/classes/[id]/topics` | Yes | Admin/Manager | Create topic (auto-assigns order) |

### Topics & Content

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| PUT | `/api/topics/[id]` | Yes | Admin/Manager | Update topic (title, order) |
| DELETE | `/api/topics/[id]` | Yes | Admin/Manager | Delete topic (cascades to content) |
| POST | `/api/topics/[id]/content` | Yes | Admin/Manager | Create content item within topic |
| GET | `/api/content` | Yes | Any | Search content (query: classId, topicId, hasVideo, hasPpt) |
| PUT | `/api/content/[id]` | Yes | Admin/Manager | Update content item |
| DELETE | `/api/content/[id]` | Yes | Admin/Manager | Delete content item |

### Lectures

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/lectures` | Yes | Any | List lectures (optional `classId` filter) |
| POST | `/api/lectures` | Yes | Admin/Manager | Create lecture |
| GET | `/api/lectures/[id]` | Yes | Any | Get single lecture |
| PUT | `/api/lectures/[id]` | Yes | Admin/Manager | Update lecture |
| DELETE | `/api/lectures/[id]` | Yes | Admin/Manager | Delete lecture |

### Materials

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/materials` | Yes | Any | List materials (optional `classId` filter) |
| POST | `/api/materials` | Yes | Admin/Manager | Create material |
| PUT | `/api/materials/[id]` | Yes | Admin/Manager | Update material |
| DELETE | `/api/materials/[id]` | Yes | Admin/Manager | Delete material |

### Live Sessions

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/live-sessions` | Yes | Any | List sessions filtered by enrollment (optional `status` filter) |
| POST | `/api/live-sessions` | Yes | Admin/Manager | Create live session (Admin must be enrolled in target class) |
| GET | `/api/live-sessions/[id]` | Yes | Any | Get single session |
| PUT | `/api/live-sessions/[id]` | Yes | Admin/Manager | Update session |
| DELETE | `/api/live-sessions/[id]` | Yes | Admin/Manager | Delete session |

### Calendar Events

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/events` | Yes | Any | List events filtered by enrollment (unlinked events visible to all; optional `month` filter) |
| POST | `/api/events` | Yes | Admin/Manager | Create event (Admin must be enrolled in target class if classId is provided) |
| PUT | `/api/events/[id]` | Yes | Admin/Manager | Update event |
| DELETE | `/api/events/[id]` | Yes | Admin/Manager | Delete event |

### Announcements

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/announcements` | Yes | Any | List all announcements |
| POST | `/api/announcements` | Yes | Admin/Manager | Create announcement + fan-out notification to all users |

### Notifications

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/notifications` | Yes | Any | Get current user's notifications (latest 30) |
| PUT | `/api/notifications/[id]` | Yes | Any | Mark single notification as read |
| POST | `/api/notifications/[id]` | Yes | Any | Mark all notifications as read (action: read-all) |

### Profile

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/profile` | Yes | Any | Get current user profile details |
| PUT | `/api/profile` | Yes | Any | Update profile name |
| POST | `/api/profile/avatar` | Yes | Any | Upload avatar image (JPEG, PNG, GIF, WebP; max 5MB) |
| PUT | `/api/profile/password` | Yes | Any | Change password (requires current password) |

### Support — Tickets

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/support/tickets` | Yes | Role-based | Student=own, Admin=assigned+enrolled class tickets, Manager=all |
| POST | `/api/support/tickets` | Yes | Any | Create support ticket |
| PUT | `/api/support/tickets/[id]` | Yes | Any* | Update ticket status or assignment (*status changes: Admin/Manager) |
| DELETE | `/api/support/tickets/[id]` | Yes | Manager | Delete ticket |
| GET | `/api/support/tickets/[id]/replies` | Yes | Any | Get ticket replies |
| POST | `/api/support/tickets/[id]/replies` | Yes | Any | Add reply (auto-updates status to IN_PROGRESS for staff) |

### Support — Live Chat

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/support/live-chats` | Yes | Role-based | Student=own chats, Staff=all active chats. Auto-expires 24h |
| POST | `/api/support/live-chats` | Yes | Student | Start new live chat session (24h expiry) |
| PUT | `/api/support/live-chats/[id]` | Yes | Admin/Manager | Join (action: join) or close (action: close) chat |
| GET | `/api/support/live-chats/[id]/messages` | Yes | Any | Get chat messages |
| POST | `/api/support/live-chats/[id]/messages` | Yes | Any | Send message in chat |

### Support — FAQ

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/support/faq` | No | Any | List all FAQs (public, no auth required) |
| POST | `/api/support/faq` | Yes | Manager | Create FAQ entry |
| PUT | `/api/support/faq/[id]` | Yes | Manager | Update FAQ |
| DELETE | `/api/support/faq/[id]` | Yes | Manager | Delete FAQ |

### Support — Chat History

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/support/chat-history` | Yes | Manager | List all closed chat sessions with message counts |
| GET | `/api/support/chat-history/[id]` | Yes | Manager | View full chat transcript |
| DELETE | `/api/support/chat-history/[id]` | Yes | Manager | Delete chat history (cascades messages) |

### Community

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/community/[classId]/messages` | Yes | Any (enrolled) | Get latest 100 messages for a class (must be enrolled or Manager) |
| POST | `/api/community/[classId]/messages` | Yes | Any (enrolled) | Post message to class community (must be enrolled or Manager) |

> **Note**: Security numbers are stripped from the response for non-Manager users.

### Statistics

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/stats` | Yes | Any | Get platform stats scoped by enrollment (Manager=platform-wide, others=enrolled classes only) |

---

## 11. Content Hierarchy & Management

### Two Content Systems

The platform has two parallel content structures:

1. **Structured Content** (Topic → Content): Used in the class detail/editor pages. Topics are ordered sections, and Content items are ordered within topics. This is the primary teaching structure visible to students on class pages.

2. **Direct Lectures**: Independent lecture entries linked directly to a class (without topic nesting). These appear in the Manage page, Dashboard, and Recordings page.

### Video Integration

- **YouTube Support**: Paste any YouTube URL (`youtube.com/watch?v=...` or `youtu.be/...`). The system automatically converts it to an embed URL and renders it in an iframe modal.
- **Direct Video**: Paste a direct video file URL (e.g., `.mp4`). The system renders it using a native `<video>` tag.
- **Player Features**: Full-screen modal overlay, close button, embedded controls.

### File Upload Method

The current implementation uses **URL-based external hosting**:
1. Upload files to cloud storage (Google Drive, Dropbox, S3, etc.)
2. Get the public/shareable URL
3. Paste the URL into the appropriate form field

The only exception is **avatar images**, which are uploaded directly to the server and stored in `public/uploads/avatars/`.

---

## 12. Support System

### 12.1 Support Tickets

A threaded ticket system for students to get help from staff.

**Ticket Fields**:

| Field | Required | Description |
|---|---|---|
| Title | Yes | Short summary of the issue |
| Description | Yes | Detailed explanation |
| Type | Yes | `GENERAL` (no subject) or `SUBJECT` (linked to a class) |
| Class | If type = SUBJECT | Which class the issue relates to |
| Priority | Optional | `LOW`, `MEDIUM` (default), or `HIGH` |

**Status Lifecycle**:
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
```
- Auto-updates to `IN_PROGRESS` when staff sends the first reply
- Staff can manually change status via button controls
- Students cannot change ticket status

**Reply Thread**: Each ticket has a conversation panel with chat-style bubbles showing sender name, role badge, and timestamp. Both the student and staff can reply.

### 12.2 Live Chat

Real-time direct messaging between a student and available support staff.

**Flow**:
1. Student clicks **"Start Chat"** → Session created in `WAITING` status with 24-hour expiry
2. Any Admin or Manager sees the waiting chat in their panel
3. Staff clicks **"Join Chat"** → Status becomes `ACTIVE`
4. Both sides exchange messages (polled every 3 seconds)
5. Either side can close the chat → Status becomes `CLOSED`

**Constraints**:
- Students can only have **one active chat** at a time
- Chat sessions auto-expire after **24 hours**
- Messages persist for audit/reference

### 12.3 FAQ Management

Managers can create, edit, reorder, and delete FAQ entries. FAQs are publicly readable (no authentication required) and displayed in an accordion format on the Support page.

### 12.4 Chat History (Manager Only)

Managers can view all closed/expired chat sessions with full message transcripts. They can also delete chat history records.

---

## 13. Community & Notifications

### Community Chat

Every class has an automatic group chat accessible from the **Community** page:

- **Left Sidebar**: Lists all classes as colored pill buttons — click to switch
- **Right Panel**: Chat messages with input field at the bottom
- **Message Styling**: Own messages (blue, right-aligned), others (light, left-aligned), admin (light purple)
- **Polling**: Messages refresh every 4 seconds
- **Privacy**: Security numbers are only visible to Managers (yellow badge)

### Notification System

**How It Works**:
1. When a Manager or Admin creates an announcement, the system automatically creates a **Notification** for every user in the platform.
2. Each user sees the notification in their personal notification inbox (bell icon in the header).

**Notification Bell Behavior**:
- **Unread Count Badge**: Red circle showing number of unread notifications (shows `9+` if > 9)
- **Click to Open**: Dropdown panel with up to 15 recent notifications
- **Per-Notification Info**: Title, content preview (truncated), timestamp, color-coded dot
- **Mark as Read**: Click individual notification or "Mark all read" button
- **Auto-Poll**: Checks for new notifications every **15 seconds**

**Notification Types**:

| Type | Color | Use Case |
|---|---|---|
| `INFO` | Blue | General information |
| `SUCCESS` | Green | Positive updates |
| `WARNING` | Yellow | Important alerts |
| `ERROR` | Red | Critical notices |

---

## 14. Security Analysis & Risks

### Current Security Measures

| Measure | Implementation |
|---|---|
| Password hashing | bcryptjs with 12 salt rounds |
| JWT authentication | Signed tokens with configurable secret |
| HttpOnly cookies | Token inaccessible from client-side JavaScript |
| SameSite cookie | Lax mode for basic CSRF protection |
| Secure cookies | Enabled in production (HTTPS only) |
| Role-based access control | Enforced at middleware, API, and UI levels |
| Input validation | Server-side checks for required fields |
| Account termination | Prevents login and redirects terminated users |
| Self-deletion prevention | Managers cannot delete their own account |
| Security numbers | Immutable, unique, only visible to Managers |

### Identified Risks & Vulnerabilities

#### 1. JWT Secret — Hardcoded Fallback

**Risk**: The JWT secret has a hardcoded fallback value in `src/lib/auth.ts`. If the `JWT_SECRET` environment variable is not set, anyone who reads the source code can forge valid tokens.

**Mitigation**:
- Always set `JWT_SECRET` in production with a strong, random value (e.g., `openssl rand -hex 64`)
- Add a startup check that refuses to boot without `JWT_SECRET` set
- Never commit `.env` files to version control

#### 2. Middleware JWT Verification — No Signature Check

**Risk**: The Edge middleware decodes the JWT payload using `atob()` without verifying the signature. An attacker could craft a token with an elevated role (e.g., `MANAGER`) and bypass route-level protection.

**Mitigation**:
- This is a known architectural tradeoff — Next.js Edge Runtime has limited crypto support
- Full signature verification happens at the API route level via `getSession()`
- The middleware provides defense-in-depth, not primary security
- Consider using a lightweight edge-compatible JWT library

#### 3. No CSRF Tokens

**Risk**: While `SameSite=lax` cookies provide basic protection, the platform doesn't implement explicit CSRF tokens. State-changing POST/PUT/DELETE requests could potentially be triggered by cross-origin forms.

**Mitigation**:
- Implement anti-CSRF tokens for all state-changing operations
- Upgrade to `SameSite=strict` where possible
- Validate the `Origin` or `Referer` header on API routes

#### 4. No Rate Limiting

**Risk**: The login endpoint and other API routes have no rate limiting. This makes the platform vulnerable to brute-force password attacks, denial-of-service, and API abuse.

**Mitigation**:
- Implement rate limiting on `/api/auth/login` (e.g., 5 attempts per minute per IP)
- Add rate limiting to chat/message endpoints to prevent spam
- Use a reverse proxy (Nginx, Cloudflare) with built-in rate limiting

#### 5. SQL Injection — Low Risk

**Risk**: Prisma ORM uses parameterized queries, which largely prevents SQL injection. However, raw queries (if added later) could introduce vulnerabilities.

**Mitigation**:
- Continue using Prisma's query builder exclusively
- Never use `prisma.$queryRaw` with string interpolation
- Validate and sanitize all user inputs at the API boundary

#### 6. XSS — Content Rendering

**Risk**: User-generated content (community messages, ticket replies, announcements, FAQ answers) is rendered in the UI. If rendered with `dangerouslySetInnerHTML` or without proper escaping, it could enable XSS attacks.

**Mitigation**:
- React's default JSX rendering escapes content (protection is built-in)
- Never use `dangerouslySetInnerHTML` with user-generated content
- Sanitize HTML content server-side if rich text is ever added

#### 7. File Upload — Avatar Security

**Risk**: Avatar uploads are stored directly on the server filesystem (`public/uploads/avatars/`). Malicious files disguised as images could pose risks.

**Mitigation**:
- File type validation is implemented (JPEG, PNG, GIF, WebP only)
- File size limit is enforced (5MB)
- Consider adding magic byte validation (not just extension/MIME type)
- Consider storing uploads outside the `public/` directory and serving through an API route

#### 8. Insecure Direct Object References (IDOR)

**Risk**: Some API endpoints accept resource IDs (ticket IDs, chat IDs) without verifying that the requesting user has permission to access that specific resource. For example, a student could potentially view another student's ticket replies by guessing the ticket ID.

**Mitigation**:
- Add ownership checks on all resource-specific endpoints
- Verify that the requesting user is either the owner or has an appropriate role
- Use UUIDs (CUIDs) which are harder to guess than sequential IDs

#### 9. No Input Length Validation

**Risk**: Message content, ticket descriptions, and announcement text have no maximum length limits. An attacker could submit extremely large payloads to consume storage or cause rendering issues.

**Mitigation**:
- Add maximum length validation on all text fields (e.g., 10,000 characters for descriptions, 5,000 for messages)
- Implement request body size limits

#### 10. Security Number Predictability

**Risk**: Security numbers are generated using `Math.random()`, which is not cryptographically secure. While the attack surface is low (numbers are only visible to Managers), they could theoretically be predicted.

**Mitigation**:
- Use `crypto.randomUUID()` or `crypto.getRandomValues()` for security number generation
- Since security numbers are informational (not used for authentication), this is a low-priority concern

---

## 15. Recommended Improvements

### Security Improvements

| Priority | Improvement | Description |
|---|---|---|
| **Critical** | Remove JWT secret fallback | Require `JWT_SECRET` env variable; abort startup if missing |
| **Critical** | Add rate limiting | Implement rate limiting on login and message endpoints |
| **High** | CSRF protection | Add anti-CSRF tokens for state-changing API operations |
| **High** | IDOR prevention | Add ownership verification on all resource-specific API endpoints |
| **High** | Input length validation | Add max-length constraints on all text fields |
| **Medium** | Edge JWT verification | Use edge-compatible JWT library for signature verification in middleware |
| **Medium** | Avatar upload hardening | Add magic byte validation, store outside `public/`, serve via API route |
| **Low** | Cryptographic security numbers | Use `crypto.getRandomValues()` instead of `Math.random()` |

### Feature Improvements

| Category | Improvement | Description |
|---|---|---|
| **Real-time** | WebSocket/SSE integration | Replace polling with WebSockets or Server-Sent Events for instant delivery |
| **Search** | Full-text search | Add search across lectures, materials, topics, and announcements |
| ~~Enrollment~~ | ~~Subject-based access control~~ | ✅ **Already implemented** — Admins and Students only see enrolled classes |
| **Progress** | Lecture completion tracking | Track which lectures a student has watched, show progress bars |
| **Analytics** | Student analytics dashboard | Engagement metrics, completion rates, active time |
| **Assessments** | Quiz and assignment system | Add quizzes within topics, auto-grading, assignment submission |
| **File Upload** | Direct file upload | Implement S3/local upload instead of URL-based linking |
| **Notifications** | Email notifications | Email digests for announcements, ticket replies, session reminders |
| **Mobile** | Responsive design | Optimize the neumorphic layout for mobile and tablet viewports |
| **Accessibility** | ARIA and keyboard nav | Add ARIA labels, keyboard navigation, screen reader support |
| **Backup** | Database backup system | Automated SQLite database backups with rotation |
| **Audit log** | Activity logging | Log user actions for audit purposes |

### UI/UX Improvements

| Improvement | Description |
|---|---|
| **Dark mode** | Add a dark theme toggle for the neumorphic design system |
| **Breadcrumb navigation** | Show navigation path on nested pages (e.g., Classes → DSA → Topic) |
| **Drag-and-drop** | Implement drag-and-drop reordering for topics and content items |
| **Rich text editor** | Add a Markdown or WYSIWYG editor for announcements and ticket descriptions |
| **Skeleton loading** | Replace spinner-based loading with animated skeleton placeholders |
| **Toast notifications** | Add a global toast notification system for success/error messages |
| **Pagination** | Add pagination for large lists (users, tickets, lectures, messages) |
| **Image preview** | Add lightbox image preview for materials and chat attachments |

### Scalability Improvements

| Improvement | Description |
|---|---|
| **PostgreSQL migration** | Move from SQLite to PostgreSQL for production-grade concurrency |
| **Redis caching** | Cache frequently accessed data (stats, class lists, FAQ) with Redis |
| **CDN for assets** | Serve static assets and uploaded files via a CDN |
| **API pagination** | Implement cursor-based pagination on all list endpoints |
| **Background jobs** | Use a job queue (Bull, BullMQ) for notification fan-out and email sending |
| **Horizontal scaling** | Deploy behind a load balancer with session-compatible JWT auth |
| **Monitoring** | Add APM and error tracking (e.g., Sentry) |

### System Automation

| Improvement | Description |
|---|---|
| **Auto-enrollment** | Automatically enroll students in classes when their accounts are created |
| **Session reminders** | Send automatic reminders before live sessions |
| **Ticket auto-assignment** | Route tickets to admins based on class ownership or workload |
| **Stale ticket cleanup** | Auto-close tickets that have been resolved but not closed after N days |
| **Chat bot first response** | Add an AI chat bot for initial support triage before connecting to staff |

---

## License

ISC

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

*Built with Next.js 14, React 18, TypeScript, Prisma ORM, and a custom neumorphic UI design system.*
