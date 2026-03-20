# Manager's Guide: Google Calendar Integration & Global System

This guide explains how to connect your Google Calendar to the LMS and manage events for specific courses or the entire platform.

## 1. Connecting Your Account
1. Go to your **Profile** page.
2. Click **"Link Google Calendar"**.
3. Sign in with your Google account and grant the requested permissions.
4. **Select Your Calendar:** Once linked, you must select the *one specific calendar* you wish to use for syncing. This calendar will be stored and reused for all future syncs.

## 2. Managing Events in Google Calendar
The LMS is **Read-Only**. It will sync events *from* Google Calendar but will never modify or create them there.

### How to Map Events to Courses
To make an event appear for a specific course, you must include the **Course ID** in the event's **Description** field using this exact format:
`LMS-COURSE-{id}`

**Example Description:**
```text
Introduction to Chemistry Lecture.
LMS-COURSE-cm12345
```

### Global Events (All Students)
To create an event visible to every enrolled student (regardless of their course), use the special **Global System ID**:
`LMS-COURSE-global`

## 3. Syncing with the LMS
1. Go to the **Calendar** tab in the LMS.
2. Click the **"Sync Calendar"** button (top right).
3. The system will fetch all events from your selected calendar that have a valid mapping ID.
4. **Last Sync Time:** The UI will display exactly when the last successful sync occurred.

### Behavior & Rules
- **No ID = No Sync:** Events without an `LMS-COURSE-{id}` tag in the description are completely ignored.
- **Strict Mapping:** If an ID is incorrect or the course doesn't exist, the event is ignored.
- **Updates:** If you change an event's time or title in Google Calendar, you must click **"Sync Calendar"** in the LMS to reflect those changes.
- **Deletions:** Deleting an event in Google Calendar and then syncing will remove it from the LMS.

## 4. Finding Course IDs
- Go to the **Manage** tab.
- Click the **Courses** sub-tab.
- Under each course, you will see a copyable **ID** (e.g., `cm12345`).
- The **Global System ID** is prominently displayed at the top of the Courses list for easy access.

---
*Note: The LMS strictly uses the `calendarId` you first selected. If you need to change the source calendar, you must unlink and re-link your Google account.*
