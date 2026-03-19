import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ──────────────────────────────────────────────
  // 1. Clear all existing data (order matters for FK constraints)
  // ──────────────────────────────────────────────
  console.log("Clearing existing data...");
  await prisma.announcement.deleteMany();
  await prisma.courseEvent.deleteMany();
  await prisma.material.deleteMany();
  await prisma.lecture.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  console.log("Existing data cleared.");

  // ──────────────────────────────────────────────
  // 2. Create test users
  // ──────────────────────────────────────────────
  console.log("Creating users...");

  const managerPassword = await bcrypt.hash("admin1234", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  const genSec = () => 'SEC' + Math.random().toString(36).substring(2, 9).toUpperCase();

  const manager = await prisma.user.create({
    data: {
      name: "Platform Manager",
      email: "tushar@singhai.com",
      passwordHash: managerPassword,
      role: "MANAGER",
      avatar: "/avatars/manager.png",
      securityNumber: genSec(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Content Admin",
      email: "admin@teacherai.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      avatar: "/avatars/admin.png",
      securityNumber: genSec(),
    },
  });

  const rahul = await prisma.user.create({
    data: {
      name: "Rahul Sharma",
      email: "student@teacherai.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      avatar: "/avatars/rahul.png",
      securityNumber: genSec(),
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: "Priya Patel",
      email: "priya@teacherai.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      avatar: "/avatars/priya.png",
      securityNumber: genSec(),
    },
  });

  const amit = await prisma.user.create({
    data: {
      name: "Amit Kumar",
      email: "amit@teacherai.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      avatar: "/avatars/amit.png",
      securityNumber: genSec(),
    },
  });

  console.log(
    `Created users: ${manager.name}, ${admin.name}, ${rahul.name}, ${priya.name}, ${amit.name}`
  );

  // ──────────────────────────────────────────────
  // 3. Create classes
  // ──────────────────────────────────────────────
  console.log("Creating classes...");

  const dsaClass = await prisma.course.create({
    data: { name: "Data Structures & Algorithms", description: "Comprehensive course covering fundamental data structures and algorithm design techniques.", subject: "Computer Science", color: "#4F46E5", icon: "BookOpen", createdById: admin.id },
  });
  const mlClass = await prisma.course.create({
    data: { name: "Machine Learning Fundamentals", description: "Introduction to machine learning concepts including supervised and unsupervised learning.", subject: "AI/ML", color: "#7C3AED", icon: "Brain", createdById: admin.id },
  });
  const webDevClass = await prisma.course.create({
    data: { name: "Web Development", description: "Full-stack web development covering modern frontend frameworks, backend APIs, databases.", subject: "Engineering", color: "#0EA5E9", icon: "Globe", createdById: admin.id },
  });
  const dbClass = await prisma.course.create({
    data: { name: "Database Systems", description: "In-depth study of relational databases, SQL, query optimization, transaction management.", subject: "Computer Science", color: "#F59E0B", icon: "Database", createdById: admin.id },
  });
  const osClass = await prisma.course.create({
    data: { name: "Operating Systems", description: "Core operating system concepts including process management, memory management, file systems.", subject: "Computer Science", color: "#10B981", icon: "Monitor", createdById: admin.id },
  });
  const networkClass = await prisma.course.create({
    data: { name: "Computer Networks", description: "Fundamentals of computer networking covering OSI model, TCP/IP, routing, switching.", subject: "Engineering", color: "#EF4444", icon: "Wifi", createdById: admin.id },
  });

  console.log("Created 6 classes.");

  // ──────────────────────────────────────────────
  // 4. Create lectures
  // ──────────────────────────────────────────────
  console.log("Creating lectures...");
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  await prisma.lecture.createMany({
    data: [
      { courseId: dsaClass.id, title: "Introduction to Arrays and Complexity Analysis", description: "Fundamentals of arrays, memory layout, and Big-O notation.", videoUrl: "/videos/lecture-1.mp4", notesUrl: "/notes/lecture-1.pdf", duration: "55 min", uploadedById: admin.id, uploadedAt: daysAgo(28) },
      { courseId: dsaClass.id, title: "Linked Lists: Singly, Doubly, and Circular", description: "Deep dive into linked list variations and common interview problems.", videoUrl: "/videos/lecture-2.mp4", notesUrl: "/notes/lecture-2.pdf", duration: "1h 10min", uploadedById: admin.id, uploadedAt: daysAgo(21) },
      { courseId: dsaClass.id, title: "Stacks, Queues, and Their Applications", description: "Stack and queue data structures, implementations and real-world use cases.", videoUrl: "/videos/lecture-3.mp4", notesUrl: "/notes/lecture-3.pdf", duration: "48 min", uploadedById: admin.id, uploadedAt: daysAgo(14) },
      { courseId: dsaClass.id, title: "Binary Trees and Binary Search Trees", description: "Tree traversal algorithms, BST operations, and balancing concepts.", videoUrl: "/videos/lecture-4.mp4", notesUrl: "/notes/lecture-4.pdf", duration: "1h 15min", uploadedById: admin.id, uploadedAt: daysAgo(7) },
      { courseId: mlClass.id, title: "What is Machine Learning? Types and Applications", description: "Overview of ML paradigms with industry examples.", videoUrl: "/videos/lecture-5.mp4", notesUrl: "/notes/lecture-5.pdf", duration: "50 min", uploadedById: admin.id, uploadedAt: daysAgo(26) },
      { courseId: mlClass.id, title: "Linear Regression and Gradient Descent", description: "Mathematical foundations of linear regression and gradient descent.", videoUrl: "/videos/lecture-6.mp4", notesUrl: "/notes/lecture-6.pdf", duration: "1h 5min", uploadedById: admin.id, uploadedAt: daysAgo(19) },
      { courseId: mlClass.id, title: "Classification: Logistic Regression and Decision Trees", description: "Classification techniques and tree-based models.", videoUrl: "/videos/lecture-7.mp4", notesUrl: "/notes/lecture-7.pdf", duration: "1h 20min", uploadedById: admin.id, uploadedAt: daysAgo(12) },
      { courseId: mlClass.id, title: "Neural Networks: Perceptrons to Deep Learning", description: "Neural networks, activation functions, and backpropagation.", videoUrl: "/videos/lecture-8.mp4", notesUrl: "/notes/lecture-8.pdf", duration: "1h 30min", uploadedById: admin.id, uploadedAt: daysAgo(5) },
      { courseId: webDevClass.id, title: "HTML5 Semantic Elements and Accessibility", description: "Modern HTML5 tags and accessible web pages.", videoUrl: "/videos/lecture-9.mp4", notesUrl: "/notes/lecture-9.pdf", duration: "45 min", uploadedById: admin.id, uploadedAt: daysAgo(25) },
      { courseId: webDevClass.id, title: "CSS Flexbox, Grid, and Responsive Design", description: "CSS layout techniques and mobile-first responsive design.", videoUrl: "/videos/lecture-10.mp4", notesUrl: "/notes/lecture-10.pdf", duration: "1h 10min", uploadedById: admin.id, uploadedAt: daysAgo(18) },
      { courseId: webDevClass.id, title: "React Fundamentals: Components, Props, and State", description: "Building interactive UIs with React.", videoUrl: "/videos/lecture-11.mp4", notesUrl: "/notes/lecture-11.pdf", duration: "1h 25min", uploadedById: admin.id, uploadedAt: daysAgo(11) },
      { courseId: dbClass.id, title: "Relational Model and ER Diagrams", description: "Entity-relationship modeling and relational algebra.", videoUrl: "/videos/lecture-12.mp4", notesUrl: "/notes/lecture-12.pdf", duration: "50 min", uploadedById: admin.id, uploadedAt: daysAgo(24) },
      { courseId: dbClass.id, title: "SQL Fundamentals: Queries, Joins, and Subqueries", description: "SQL from basic SELECT to complex multi-table joins.", videoUrl: "/videos/lecture-13.mp4", notesUrl: "/notes/lecture-13.pdf", duration: "1h 15min", uploadedById: admin.id, uploadedAt: daysAgo(17) },
      { courseId: dbClass.id, title: "Indexing, Query Optimization, and Execution Plans", description: "B-tree indexes, query planner internals, and performance tuning.", videoUrl: "/videos/lecture-14.mp4", notesUrl: "/notes/lecture-14.pdf", duration: "1h 5min", uploadedById: admin.id, uploadedAt: daysAgo(10) },
      { courseId: dbClass.id, title: "Transactions, ACID Properties, and Concurrency Control", description: "Transaction isolation levels and data consistency.", videoUrl: "/videos/lecture-15.mp4", notesUrl: "/notes/lecture-15.pdf", duration: "58 min", uploadedById: admin.id, uploadedAt: daysAgo(3) },
      { courseId: osClass.id, title: "Introduction to Operating Systems and Process Management", description: "OS architecture, process states, and system calls.", videoUrl: "/videos/lecture-16.mp4", notesUrl: "/notes/lecture-16.pdf", duration: "52 min", uploadedById: admin.id, uploadedAt: daysAgo(23) },
      { courseId: osClass.id, title: "CPU Scheduling Algorithms", description: "FCFS, SJF, Round Robin, and Priority scheduling.", videoUrl: "/videos/lecture-17.mp4", notesUrl: "/notes/lecture-17.pdf", duration: "1h", uploadedById: admin.id, uploadedAt: daysAgo(16) },
      { courseId: osClass.id, title: "Memory Management: Paging and Segmentation", description: "Virtual memory, page tables, and replacement algorithms.", videoUrl: "/videos/lecture-18.mp4", notesUrl: "/notes/lecture-18.pdf", duration: "1h 10min", uploadedById: admin.id, uploadedAt: daysAgo(9) },
      { courseId: networkClass.id, title: "OSI Model and TCP/IP Protocol Suite", description: "Layered network architecture and protocol interactions.", videoUrl: "/videos/lecture-19.mp4", notesUrl: "/notes/lecture-19.pdf", duration: "45 min", uploadedById: admin.id, uploadedAt: daysAgo(22) },
      { courseId: networkClass.id, title: "IP Addressing, Subnetting, and Routing", description: "IPv4/IPv6 addressing schemes and routing protocols.", videoUrl: "/videos/lecture-20.mp4", notesUrl: "/notes/lecture-20.pdf", duration: "1h 5min", uploadedById: admin.id, uploadedAt: daysAgo(15) },
      { courseId: networkClass.id, title: "Transport Layer: TCP and UDP", description: "TCP handshake, flow control, and UDP use cases.", videoUrl: "/videos/lecture-21.mp4", notesUrl: "/notes/lecture-21.pdf", duration: "58 min", uploadedById: admin.id, uploadedAt: daysAgo(8) },
      { courseId: networkClass.id, title: "Network Security: Firewalls, VPNs, and Encryption", description: "Encryption, SSL/TLS, firewalls, and VPN tunneling.", videoUrl: "/videos/lecture-22.mp4", notesUrl: "/notes/lecture-22.pdf", duration: "1h 15min", uploadedById: admin.id, uploadedAt: daysAgo(2) },
    ],
  });

  console.log("Created 22 lectures.");

  // ──────────────────────────────────────────────
  // 5. Create course events (unified: sessions + calendar)
  // ──────────────────────────────────────────────
  console.log("Creating course events...");

  const now = new Date();
  const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);
  const daysFromNow = (d: number, hour = 10, minute = 0) => {
    const dt = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    dt.setHours(hour, minute, 0, 0);
    return dt;
  };

  await prisma.courseEvent.createMany({
    data: [
      // LIVE (happening now)
      { courseId: dsaClass.id, title: "DSA Doubt Clearing Session - Trees & Graphs", description: "Live interactive session to resolve doubts on tree traversals and graph BFS/DFS.", startTime: hoursFromNow(-1), endTime: hoursFromNow(1), meetLink: "https://meet.jit.si/TeachingLLM-DSA-Live", type: "class", createdById: admin.id },
      // UPCOMING
      { courseId: mlClass.id, title: "Hands-on: Building Your First Neural Network", description: "Step-by-step walkthrough of building a neural network using Python and TensorFlow.", startTime: hoursFromNow(4), endTime: hoursFromNow(5.5), meetLink: "https://meet.jit.si/TeachingLLM-ML-Workshop", type: "class", createdById: admin.id },
      { courseId: webDevClass.id, title: "Live Coding: Building a REST API with Next.js", description: "Build a complete REST API with authentication and database integration.", startTime: daysFromNow(1, 11, 0), endTime: daysFromNow(1, 12, 30), meetLink: "https://meet.jit.si/TeachingLLM-WebDev-Live", type: "class", createdById: admin.id },
      { courseId: dbClass.id, title: "SQL Performance Tuning Workshop", description: "Practical session on identifying slow queries and applying indexing strategies.", startTime: daysFromNow(3, 15, 0), endTime: daysFromNow(3, 17, 0), meetLink: "https://meet.jit.si/TeachingLLM-DB-Workshop", type: "class", createdById: admin.id },
      { courseId: osClass.id, title: "OS Concepts Revision - Midterm Preparation", description: "Comprehensive revision covering process scheduling, memory management, and file systems.", startTime: daysFromNow(5, 9, 0), endTime: daysFromNow(5, 11, 0), meetLink: "https://meet.jit.si/TeachingLLM-OS-Revision", type: "class", createdById: admin.id },
      // COMPLETED
      { courseId: networkClass.id, title: "Packet Analysis with Wireshark", description: "Hands-on demonstration of capturing and analyzing network packets.", startTime: daysFromNow(-1, 16, 0), endTime: daysFromNow(-1, 17, 30), meetLink: "https://meet.jit.si/TeachingLLM-Network-Lab", type: "class", createdById: admin.id },
      { courseId: dsaClass.id, title: "Competitive Programming Strategies", description: "Tips and techniques for competitive programming and practice problem walkthroughs.", startTime: daysFromNow(-3, 13, 0), endTime: daysFromNow(-3, 15, 0), meetLink: "https://meet.jit.si/TeachingLLM-DSA-CompProg", type: "class", createdById: admin.id },
      // ASSIGNMENTS
      { courseId: dsaClass.id, title: "DSA Assignment 3 Due", description: "Submit your Binary Tree solutions (Q1-Q5). Late submissions: 10% penalty per day.", startTime: daysFromNow(1, 23, 59), endTime: daysFromNow(1, 23, 59), type: "assignment", createdById: admin.id },
      { courseId: networkClass.id, title: "Networking Assignment 2 Due", description: "Submit Wireshark capture analysis report and subnetting exercise solutions.", startTime: daysFromNow(18, 23, 59), endTime: daysFromNow(18, 23, 59), type: "assignment", createdById: admin.id },
      // EXAMS
      { courseId: mlClass.id, title: "ML Quiz: Regression Techniques", description: "Online quiz covering linear regression, polynomial regression, and regularization. 30 minutes.", startTime: daysFromNow(3, 10, 0), endTime: daysFromNow(3, 10, 30), type: "exam", createdById: admin.id },
      { courseId: dbClass.id, title: "Database Systems Midterm Exam", description: "Written exam covering ER modeling, normalization, SQL queries, and transactions.", startTime: daysFromNow(10, 9, 0), endTime: daysFromNow(10, 12, 0), type: "exam", createdById: admin.id },
      // LABS
      { courseId: webDevClass.id, title: "Web Development Project Presentation", description: "Each team presents their full-stack project. 15 minutes per team.", startTime: daysFromNow(7, 14, 0), endTime: daysFromNow(7, 17, 0), type: "class", createdById: admin.id },
      { courseId: osClass.id, title: "OS Lab: Memory Management Simulation", description: "Hands-on lab implementing page replacement algorithms.", startTime: daysFromNow(14, 15, 0), endTime: daysFromNow(14, 17, 0), type: "class", createdById: admin.id },
      // GLOBAL EVENT
      { courseId: null, title: "Guest Lecture: AI in Modern Software Engineering", description: "Industry expert from Google discusses how AI is transforming software development. Open to all.", startTime: daysFromNow(21, 16, 0), endTime: daysFromNow(21, 18, 0), type: "event", createdById: manager.id },
    ],
  });

  console.log("Created 14 course events.");

  // ──────────────────────────────────────────────
  // 6. Create materials
  // ──────────────────────────────────────────────
  console.log("Creating materials...");

  await prisma.material.createMany({
    data: [
      { courseId: dsaClass.id, title: "DSA Complete Reference Notes", description: "Comprehensive notes covering all DS&A topics.", fileUrl: "/materials/dsa-reference-notes.pdf", fileType: "PDF", fileSize: "4.2 MB", uploadedById: admin.id },
      { courseId: dsaClass.id, title: "Algorithm Complexity Cheat Sheet", description: "Quick reference for Big-O complexities.", fileUrl: "/materials/complexity-cheatsheet.pdf", fileType: "PDF", fileSize: "820 KB", uploadedById: admin.id },
      { courseId: dsaClass.id, title: "Week 1-4 Lecture Slides", description: "Compiled slides from weeks 1-4.", fileUrl: "/materials/dsa-slides-week1-4.pptx", fileType: "PPTX", fileSize: "12.5 MB", uploadedById: admin.id },
      { courseId: mlClass.id, title: "Machine Learning Mathematics Primer", description: "Essential linear algebra and calculus for ML.", fileUrl: "/materials/ml-math-primer.pdf", fileType: "PDF", fileSize: "3.8 MB", uploadedById: admin.id },
      { courseId: mlClass.id, title: "Python for ML - Jupyter Notebooks", description: "Interactive notebooks for regression and classification.", fileUrl: "/materials/ml-notebooks.zip", fileType: "ZIP", fileSize: "8.1 MB", uploadedById: admin.id },
      { courseId: mlClass.id, title: "Neural Networks Architecture Diagrams", description: "Visual guide to CNN, RNN, and Transformer architectures.", fileUrl: "/materials/nn-architectures.pptx", fileType: "PPTX", fileSize: "6.3 MB", uploadedById: admin.id },
      { courseId: webDevClass.id, title: "React Best Practices Guide", description: "Industry-standard React development patterns.", fileUrl: "/materials/react-best-practices.pdf", fileType: "PDF", fileSize: "2.9 MB", uploadedById: admin.id },
      { courseId: webDevClass.id, title: "Full-Stack Project Starter Template", description: "Boilerplate with Next.js, Prisma, and Tailwind CSS.", fileUrl: "/materials/fullstack-template.zip", fileType: "ZIP", fileSize: "1.4 MB", uploadedById: admin.id },
      { courseId: dbClass.id, title: "SQL Query Practice Problems", description: "50 progressively difficult SQL problems with solutions.", fileUrl: "/materials/sql-practice-problems.pdf", fileType: "PDF", fileSize: "1.7 MB", uploadedById: admin.id },
      { courseId: dbClass.id, title: "Database Design Assignment Brief", description: "Assignment for designing an e-commerce database schema.", fileUrl: "/materials/db-design-assignment.doc", fileType: "DOC", fileSize: "540 KB", uploadedById: admin.id },
      { courseId: osClass.id, title: "Process Scheduling Simulation Guide", description: "Guide for running the CPU scheduling simulator.", fileUrl: "/materials/scheduling-simulation.pdf", fileType: "PDF", fileSize: "2.1 MB", uploadedById: admin.id },
      { courseId: osClass.id, title: "OS Midterm Study Guide", description: "Condensed study material for the midterm.", fileUrl: "/materials/os-midterm-guide.doc", fileType: "DOC", fileSize: "1.3 MB", uploadedById: admin.id },
      { courseId: networkClass.id, title: "Networking Lab Manual", description: "Lab exercises on packet tracing and Wireshark analysis.", fileUrl: "/materials/networking-lab-manual.pdf", fileType: "PDF", fileSize: "5.6 MB", uploadedById: admin.id },
      { courseId: networkClass.id, title: "TCP/IP Protocol Reference Slides", description: "TCP/IP slides with packet format diagrams.", fileUrl: "/materials/tcpip-reference-slides.pptx", fileType: "PPTX", fileSize: "9.2 MB", uploadedById: admin.id },
    ],
  });

  console.log("Created 14 materials.");

  // ──────────────────────────────────────────────
  // 7. Create enrollments
  // ──────────────────────────────────────────────
  console.log("Creating enrollments...");

  await prisma.enrollment.createMany({
    data: [
      { userId: admin.id, courseId: dsaClass.id }, { userId: admin.id, courseId: mlClass.id }, { userId: admin.id, courseId: webDevClass.id },
      { userId: admin.id, courseId: dbClass.id }, { userId: admin.id, courseId: osClass.id }, { userId: admin.id, courseId: networkClass.id },
      { userId: rahul.id, courseId: dsaClass.id }, { userId: rahul.id, courseId: mlClass.id }, { userId: rahul.id, courseId: webDevClass.id },
      { userId: priya.id, courseId: mlClass.id }, { userId: priya.id, courseId: dbClass.id }, { userId: priya.id, courseId: osClass.id },
      { userId: amit.id, courseId: dsaClass.id }, { userId: amit.id, courseId: dbClass.id }, { userId: amit.id, courseId: networkClass.id },
    ],
  });

  console.log("Created enrollments.");

  // ──────────────────────────────────────────────
  // 8. Create announcements
  // ──────────────────────────────────────────────
  console.log("Creating announcements...");

  await prisma.announcement.createMany({
    data: [
      { title: "Platform Maintenance Scheduled", content: "The platform will undergo scheduled maintenance on Saturday from 2:00 AM to 6:00 AM IST.", type: "warning", createdById: manager.id },
      { title: "New Course Materials Available", content: "Updated lecture slides and practice problem sets have been uploaded for DSA and ML. Check the Materials section.", type: "info", createdById: admin.id },
      { title: "Midterm Results Published", content: "Results for Database Systems and Operating Systems midterm exams are now available.", type: "success", createdById: admin.id },
    ],
  });

  console.log("Created 3 announcements.");

  // ──────────────────────────────────────────────
  // Done
  // ──────────────────────────────────────────────
  console.log("\n✅ Database seed completed successfully!");
  console.log("Summary:");
  console.log("  - 5 users (1 manager, 1 admin, 3 students)");
  console.log("  - 6 courses");
  console.log("  - 22 lectures");
  console.log("  - 14 course events (sessions + calendar)");
  console.log("  - 14 materials");
  console.log("  - 15 enrollments");
  console.log("  - 3 announcements");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
