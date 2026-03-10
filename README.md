# Teaching LLM Platform

A comprehensive Learning Management System built with Next.js, featuring a neumorphic UI design with Nunito typography, real-time community chat, integrated support ticketing, and a full notification system.

## **System Overview & Content Hierarchy**

The platform uses a **three-tier content structure**:

```
📚 Class (Subject)
├── 📖 Topics (organized sections)
│   └── 🎥 Content (individual lectures)
├── 📄 Materials (downloadable files)
├── 🔴 Live Sessions (video conferences)
├── 💬 Community Chat (class group chat)
└── 🎫 Support Tickets (per-subject or general)
```

---

## **Contact & Support System**

### **Support Tickets (`/support` → Tickets tab)**

Students can raise support tickets to get help from Admins and Managers.

**Creating a Ticket**:
1. Click **"+ New Ticket"** on the Support page
2. Choose issue type:
   - **General Support** — not tied to any subject
   - **Subject Related** — pick one of the available classes
3. Enter a title, description, and priority (LOW / MEDIUM / HIGH)
4. Submit — ticket appears in the system immediately

**Ticket Fields**:
| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Short summary of the issue |
| Description | Yes | Detailed explanation |
| Type | Yes | `GENERAL` or `SUBJECT` |
| Subject (Class) | If type = SUBJECT | Which class the issue relates to |
| Priority | Optional | `LOW`, `MEDIUM`, or `HIGH` (defaults to MEDIUM) |

**Two-Way Reply Thread**:
- Clicking a ticket opens a **side-by-side conversation panel** with chat-style bubbles
- Both the student and staff can reply within the ticket
- Each reply shows sender name, role badge, and timestamp
- Full conversation history is preserved permanently

**Ticket Status Lifecycle**:
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
```
- Status auto-updates to `IN_PROGRESS` when staff sends the first reply
- Admins/Managers can manually change status via pill buttons in the thread header
- Students cannot change ticket status

**Who Can See What**:
| Role | Visibility |
|------|------------|
| **Student** | Only their own tickets |
| **Admin** | General tickets + tickets for classes they created |
| **Manager** | All tickets across all subjects |

### **Live Chat (`/support` → Live Chat tab)**

Real-time direct chat between students and support staff.

**How It Works**:
1. Student clicks **"Start Chat"** — a chat session is created in `WAITING` state
2. Any available Admin or Manager sees the waiting chat in their left sidebar panel
3. Staff clicks **"Join Chat"** to accept the session — status becomes `ACTIVE`
4. Both sides type messages — messages poll every **3 seconds** for near-real-time updates
5. Either side can close the chat when resolved

**Key Behaviors**:
- Students can only have **one active chat** at a time
- The system automatically shows any available Admin or Manager without the student needing to select anything
- Chat messages persist in the database for audit/reference

---

## **Community System**

### **Class Group Chat (`/community`)**

Every class has an automatic community group chat where students can ask questions, discuss topics, and interact with classmates.

**Layout**:
- **Left sidebar**: Lists all classes as coloured pill buttons — click to switch community
- **Right panel**: Chat messages for the selected class with a message input at the bottom

**How Messages Work**:
- Type a message and press Enter or click the send button
- Messages poll every **4 seconds** for new content
- Each message shows the sender's name, a coloured avatar, and a timestamp
- Messages use chat-bubble styling (own messages on the right in blue, others on the left)

**Privacy & Security**:
| Role | What They See |
|------|---------------|
| **Student** | Sender's name and message only — no personal data exposed |
| **Admin** | Same as student |
| **Manager** | Name, message, role badge, **plus the unique Security Number** for each student |

### **Student Security Number**

Every user is assigned a **unique, immutable Security Number** on account creation.

- **Format**: `SEC` followed by 7 random alphanumeric characters (e.g. `SEC58A0U8F`)
- **Generated**: Automatically when user is created — stored as `securityNumber` in the database
- **Immutable**: Cannot be changed after assignment
- **Unique**: Enforced at the database level with a unique constraint
- **Visibility**: Only visible to **Managers** in the Community chat (shown as a yellow pill badge next to the sender name)

This allows Managers to internally track or identify students without exposing personal data to other students.

---

## **Notification System**

### **How Notifications Work**

Announcements are integrated with the notification panel. When a Manager or Admin creates an announcement via **Manage → Announcements**, the system automatically:

1. Creates the announcement record
2. **Fan-outs a Notification** to every user in the platform
3. Each user sees the notification in their personal notification inbox

### **Notification Bell (Header)**

The bell icon in the header bar is fully functional:

- **Unread count badge**: Red circle showing number of unread notifications (shows `9+` if more than 9)
- **Click to open**: Dropdown panel lists up to 15 most recent notifications
- **Per-notification**: Shows title, content preview (truncated to 60 chars), timestamp, and a colour-coded dot matching the announcement type (INFO=blue, SUCCESS=green, WARNING=yellow, ERROR=red)
- **Mark as read**: Click any notification to mark it read; or use **"Mark all read"** button
- **Auto-poll**: Checks for new notifications every **15 seconds** in the background

### **Notification Types**

Notifications inherit the announcement type:
| Type | Colour | Use Case |
|------|--------|----------|
| `INFO` | Blue | General information |
| `SUCCESS` | Green | Positive updates |
| `WARNING` | Yellow | Important alerts |
| `ERROR` | Red | Critical notices |

---

## **Admin/Manager Content Creation Workflow**

### **Step 1: Create a New Subject (Class)**
**Location**: `/manage` page → Classes tab

**Required Fields**:
- **Name**: Subject title
- **Description**: Course overview
- **Subject**: Academic category
- **Color**: Visual theme (predefined palette)
- **Icon**: Subject identifier

**Access**: Only **ADMIN** and **MANAGER** roles can create subjects.

### **Step 2: Add Topics Within Subject**
**Location**: `/classes/[id]/edit` page (advanced editor)

**Process**:
1. Navigate to specific class
2. Click "Add Topic" button
3. Enter topic name and description
4. Topics can be **drag-and-dropped** to reorder
5. Each topic acts as a **collapsible section**

### **Step 3: Add Lecture Content Within Topics**
**Content Creation Form Fields**:
- **Title** (required): Lecture name
- **Description**: Detailed explanation
- **Video URL**: YouTube link or direct video file URL
- **PPT URL**: Link to presentation files
- **Duration**: Manual time entry
- **Notes URL**: Additional resources

---

## **Supported Content Types & File Formats**

### **File Types Supported**:
- **Documents**: PDF, PPTX, PPT, DOC, DOCX
- **Spreadsheets**: XLS, XLSX
- **Archives**: ZIP
- **Images**: PNG, JPG
- **Videos**: YouTube URLs, direct video file links

### **Video Integration**:
- **YouTube Support**: Automatic embed generation from `youtu.be` or `youtube.com/watch` URLs
- **Direct Video**: MP4 or other video file URLs
- **Player Features**: Full-screen modal, auto-play, embedded controls

### **File Upload Method**:
**Current Implementation**: URL-based linking (files must be hosted externally)
- Upload files to cloud storage (Google Drive, Dropbox, etc.)
- Copy public URL and paste into content forms

---

## **Role-Based Access Control**

| Action | STUDENT | ADMIN | MANAGER |
|--------|---------|-------|---------|
| **View Subjects/Topics/Lectures** | ✅ | ✅ | ✅ |
| **Create Subjects** | ❌ | ✅ | ✅ |
| **Edit Content** | ❌ | ✅ | ✅ |
| **Delete Content** | ❌ | ✅ | ✅ |
| **Manage Users** | ❌ | ❌ | ✅ |
| **Upload Materials** | ❌ | ✅ | ✅ |
| **Schedule Live Sessions** | ❌ | ✅ | ✅ |
| **Raise Support Tickets** | ✅ | ❌ | ❌ |
| **Reply to Tickets** | ✅ (own) | ✅ (assigned) | ✅ (all) |
| **Change Ticket Status** | ❌ | ✅ | ✅ |
| **Start Live Chat** | ✅ | ❌ | ❌ |
| **Join/Respond to Live Chat** | ❌ | ✅ | ✅ |
| **View Community Chat** | ✅ | ✅ | ✅ |
| **See Student Security Numbers** | ❌ | ❌ | ✅ |
| **Receive Notifications** | ✅ | ✅ | ✅ |

---

## **Student Experience & Navigation**

### **Subject Page View** (`/classes/[id]`):
1. **Visual Design**: Color-coded header with gradient background
2. **Topic Structure**: Expandable/collapsible sections
3. **Lecture Cards**: Individual content entries with play buttons, download links, and visual indicators

### **Video Playback**:
- **YouTube Integration**: Click play → opens full-screen modal
- **Direct Streaming**: Videos play directly in platform
- **Controls**: Standard video player controls

### **Material Access**:
- **Download Buttons**: Direct file access
- **File Type Badges**: Color-coded format indicators
- **Size Information**: File metadata display

---

## **Content Management & Editing**

- **Real-time Updates**: Changes reflect immediately
- **Bulk Management**: Multiple content items via `/manage` interface
- **Individual Editing**: Per-lecture modification in class editor
- **Reordering**: Drag-and-drop topic organization
- All items (lectures, topics, materials, tickets) can be edited or updated later

---

## **Platform Navigation**

### **Sidebar Menu Items**
| Route | Label | Visible To |
|-------|-------|------------|
| `/dashboard` | Home | All |
| `/classes` | Classes | All |
| `/live` | Live Classes | All |
| `/calendar` | Calendar | All |
| `/recordings` | Recordings | All |
| `/materials` | Study Materials | All |
| `/community` | Community | All |
| `/support` | Support | All |
| `/manage` | Manage | Admin, Manager |
| `/admin` | User Admin | Manager |

---

## **Key Workflow Summary**

**For Managers/Admins**:
1. Create Subject → Set visual theme and basic info
2. Add Topics → Structure content logically
3. Create Lectures → Add videos, materials, descriptions
4. Upload Materials → Link downloadable resources
5. Schedule Sessions → Set up live meetings
6. Post Announcements → Auto-notifies all users
7. Respond to Tickets → Two-way conversation with students
8. Join Live Chats → Real-time support for students
9. Monitor Community → View all chats with student security numbers (Manager only)

**For Students**:
1. Browse Subjects → Visual subject cards with neumorphic design
2. Enter Subject → See organized topic structure
3. Select Lecture → Watch videos, download materials
4. Join Live Sessions → Real-time participation
5. Community Chat → Discuss with classmates per subject
6. Raise Support Ticket → Get help from staff
7. Live Chat → Instant conversation with any available staff
8. Notifications → Stay updated on announcements

---

## **Getting Started**

### **Prerequisites**
- Node.js (v18+)
- npm or yarn
- Database (configured with Prisma)

### **Installation**
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up database
npm run db:push

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

---

## **Technology Stack**

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM with SQLite
- **Authentication**: JWT (7-day expiry) with bcryptjs
- **UI Design**: Neumorphic design system, Nunito font (Google Fonts)
- **Video Integration**: YouTube embed, Jitsi Meet
- **Real-time**: Polling-based (3-4s intervals for chats, 15s for notifications)
- **File Handling**: URL-based external hosting

---

## **Database Models**

### **Core Content Models**:
- **User**: Authentication, roles, and unique security number
- **Class**: Subject-level containers with colour and icon
- **Topic**: Content organization within classes (ordered)
- **Content**: Individual lectures within topics
- **Lecture**: Direct class-level lecture entries
- **Material**: Downloadable file management
- **LiveSession**: Real-time video conferences (Jitsi Meet)
- **CalendarEvent**: Scheduling and timeline management

### **Support & Communication Models**:
- **SupportTicket**: Issue tickets with type (GENERAL/SUBJECT), status, and priority
- **TicketReply**: Two-way conversation messages within a ticket
- **ChatSession**: Live chat session between student and agent
- **ChatMessage**: Individual messages within a live chat

### **Community & Notification Models**:
- **CommunityMessage**: Per-class group chat messages
- **Notification**: Per-user notification entries, linked to announcements
- **Enrollment**: Student-to-class enrollment tracking
- **Announcement**: Platform-wide announcements (trigger notifications)

---

## **API Routes**

### **Authentication**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### **Content Management**
- `GET/POST /api/classes` - List/create classes
- `GET/PUT/DELETE /api/classes/[id]` - Single class operations
- `GET/POST /api/lectures` - List/create lectures
- `GET/POST /api/materials` - List/create materials
- `GET/POST /api/live-sessions` - List/create live sessions
- `GET/POST /api/events` - List/create calendar events
- `GET/POST /api/announcements` - List/create (auto-creates notifications)

### **Support System**
- `GET/POST /api/support/tickets` - List/create tickets
- `PUT /api/support/tickets/[id]` - Update ticket status
- `GET/POST /api/support/tickets/[id]/replies` - Ticket replies
- `GET/POST /api/support/live-chats` - List/start chat sessions
- `PUT /api/support/live-chats/[id]` - Join/close chat
- `GET/POST /api/support/live-chats/[id]/messages` - Chat messages

### **Community**
- `GET/POST /api/community/[classId]/messages` - Per-class community messages

### **Notifications**
- `GET /api/notifications` - Get user's notifications
- `PUT /api/notifications/[id]` - Mark notification as read

### **User Management**
- `GET/POST /api/users` - List/create users (Manager only)
- `GET/PUT/DELETE /api/users/[id]` - Single user operations
