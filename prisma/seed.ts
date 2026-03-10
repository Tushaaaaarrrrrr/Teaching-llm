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
  await prisma.calendarEvent.deleteMany();
  await prisma.material.deleteMany();
  await prisma.liveSession.deleteMany();
  await prisma.lecture.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  console.log("Existing data cleared.");

  // ──────────────────────────────────────────────
  // 2. Create test users
  // ──────────────────────────────────────────────
  console.log("Creating users...");

  const managerPassword = await bcrypt.hash("manager123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  const manager = await prisma.user.create({
    data: {
      name: "Platform Manager",
      email: "manager@teacherai.com",
      passwordHash: managerPassword,
      role: "MANAGER",
      avatar: "/avatars/manager.png",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Content Admin",
      email: "admin@teacherai.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      avatar: "/avatars/admin.png",
    },
  });

  const rahul = await prisma.user.create({
    data: {
      name: "Rahul Sharma",
      email: "student@teacherai.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      avatar: "/avatars/rahul.png",
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: "Priya Patel",
      email: "priya@teacherai.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      avatar: "/avatars/priya.png",
    },
  });

  const amit = await prisma.user.create({
    data: {
      name: "Amit Kumar",
      email: "amit@teacherai.com",
      passwordHash: studentPassword,
      role: "STUDENT",
      avatar: "/avatars/amit.png",
    },
  });

  console.log(
    `Created users: ${manager.name}, ${admin.name}, ${rahul.name}, ${priya.name}, ${amit.name}`
  );

  // ──────────────────────────────────────────────
  // 3. Create classes (admin as creator)
  // ──────────────────────────────────────────────
  console.log("Creating classes...");

  const dsaClass = await prisma.class.create({
    data: {
      name: "Data Structures & Algorithms",
      description:
        "Comprehensive course covering fundamental data structures and algorithm design techniques including arrays, linked lists, trees, graphs, sorting, and dynamic programming.",
      subject: "Computer Science",
      color: "#4F46E5",
      icon: "BookOpen",
      createdById: admin.id,
    },
  });

  const mlClass = await prisma.class.create({
    data: {
      name: "Machine Learning Fundamentals",
      description:
        "Introduction to machine learning concepts including supervised and unsupervised learning, neural networks, model evaluation, and real-world applications.",
      subject: "AI/ML",
      color: "#7C3AED",
      icon: "Brain",
      createdById: admin.id,
    },
  });

  const webDevClass = await prisma.class.create({
    data: {
      name: "Web Development",
      description:
        "Full-stack web development covering modern frontend frameworks, backend APIs, databases, authentication, and deployment strategies.",
      subject: "Engineering",
      color: "#0EA5E9",
      icon: "Globe",
      createdById: admin.id,
    },
  });

  const dbClass = await prisma.class.create({
    data: {
      name: "Database Systems",
      description:
        "In-depth study of relational databases, SQL, query optimization, transaction management, indexing, and introduction to NoSQL systems.",
      subject: "Computer Science",
      color: "#F59E0B",
      icon: "Database",
      createdById: admin.id,
    },
  });

  const osClass = await prisma.class.create({
    data: {
      name: "Operating Systems",
      description:
        "Core operating system concepts including process management, memory management, file systems, scheduling algorithms, and concurrency.",
      subject: "Computer Science",
      color: "#10B981",
      icon: "Monitor",
      createdById: admin.id,
    },
  });

  const networkClass = await prisma.class.create({
    data: {
      name: "Computer Networks",
      description:
        "Fundamentals of computer networking covering OSI model, TCP/IP, routing, switching, network security, and modern protocols.",
      subject: "Engineering",
      color: "#EF4444",
      icon: "Wifi",
      createdById: admin.id,
    },
  });

  console.log("Created 6 classes.");

  // ──────────────────────────────────────────────
  // 4. Create lectures for each class
  // ──────────────────────────────────────────────
  console.log("Creating lectures...");

  // Helper to create a date N days ago
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  // DSA Lectures
  await prisma.lecture.createMany({
    data: [
      {
        classId: dsaClass.id,
        title: "Introduction to Arrays and Complexity Analysis",
        description:
          "Understand the fundamentals of arrays, memory layout, and Big-O notation for time and space complexity analysis.",
        videoUrl: "/videos/lecture-1.mp4",
        notesUrl: "/notes/lecture-1.pdf",
        duration: "55 min",
        thumbnail: "/thumbnails/dsa-1.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(28),
      },
      {
        classId: dsaClass.id,
        title: "Linked Lists: Singly, Doubly, and Circular",
        description:
          "Deep dive into linked list variations, implementation patterns, and common interview problems involving linked lists.",
        videoUrl: "/videos/lecture-2.mp4",
        notesUrl: "/notes/lecture-2.pdf",
        duration: "1h 10min",
        thumbnail: "/thumbnails/dsa-2.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(21),
      },
      {
        classId: dsaClass.id,
        title: "Stacks, Queues, and Their Applications",
        description:
          "Explore stack and queue data structures, their implementations using arrays and linked lists, and real-world use cases.",
        videoUrl: "/videos/lecture-3.mp4",
        notesUrl: "/notes/lecture-3.pdf",
        duration: "48 min",
        thumbnail: "/thumbnails/dsa-3.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(14),
      },
      {
        classId: dsaClass.id,
        title: "Binary Trees and Binary Search Trees",
        description:
          "Tree traversal algorithms (inorder, preorder, postorder), BST operations, and balancing concepts.",
        videoUrl: "/videos/lecture-4.mp4",
        notesUrl: "/notes/lecture-4.pdf",
        duration: "1h 15min",
        thumbnail: "/thumbnails/dsa-4.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(7),
      },
    ],
  });

  // ML Lectures
  await prisma.lecture.createMany({
    data: [
      {
        classId: mlClass.id,
        title: "What is Machine Learning? Types and Applications",
        description:
          "Overview of machine learning paradigms: supervised, unsupervised, and reinforcement learning with industry examples.",
        videoUrl: "/videos/lecture-5.mp4",
        notesUrl: "/notes/lecture-5.pdf",
        duration: "50 min",
        thumbnail: "/thumbnails/ml-1.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(26),
      },
      {
        classId: mlClass.id,
        title: "Linear Regression and Gradient Descent",
        description:
          "Mathematical foundations of linear regression, cost functions, and the gradient descent optimization algorithm.",
        videoUrl: "/videos/lecture-6.mp4",
        notesUrl: "/notes/lecture-6.pdf",
        duration: "1h 5min",
        thumbnail: "/thumbnails/ml-2.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(19),
      },
      {
        classId: mlClass.id,
        title: "Classification: Logistic Regression and Decision Trees",
        description:
          "Binary and multi-class classification techniques, decision boundaries, and tree-based models.",
        videoUrl: "/videos/lecture-7.mp4",
        notesUrl: "/notes/lecture-7.pdf",
        duration: "1h 20min",
        thumbnail: "/thumbnails/ml-3.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(12),
      },
      {
        classId: mlClass.id,
        title: "Neural Networks: Perceptrons to Deep Learning",
        description:
          "Introduction to artificial neural networks, activation functions, backpropagation, and multi-layer architectures.",
        videoUrl: "/videos/lecture-8.mp4",
        notesUrl: "/notes/lecture-8.pdf",
        duration: "1h 30min",
        thumbnail: "/thumbnails/ml-4.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(5),
      },
    ],
  });

  // Web Development Lectures
  await prisma.lecture.createMany({
    data: [
      {
        classId: webDevClass.id,
        title: "HTML5 Semantic Elements and Accessibility",
        description:
          "Modern HTML5 tags, semantic markup best practices, ARIA attributes, and building accessible web pages.",
        videoUrl: "/videos/lecture-9.mp4",
        notesUrl: "/notes/lecture-9.pdf",
        duration: "45 min",
        thumbnail: "/thumbnails/web-1.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(25),
      },
      {
        classId: webDevClass.id,
        title: "CSS Flexbox, Grid, and Responsive Design",
        description:
          "Master CSS layout techniques with Flexbox and Grid, media queries, and mobile-first responsive design patterns.",
        videoUrl: "/videos/lecture-10.mp4",
        notesUrl: "/notes/lecture-10.pdf",
        duration: "1h 10min",
        thumbnail: "/thumbnails/web-2.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(18),
      },
      {
        classId: webDevClass.id,
        title: "React Fundamentals: Components, Props, and State",
        description:
          "Building interactive UIs with React, understanding the component lifecycle, hooks, and state management.",
        videoUrl: "/videos/lecture-11.mp4",
        notesUrl: "/notes/lecture-11.pdf",
        duration: "1h 25min",
        thumbnail: "/thumbnails/web-3.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(11),
      },
    ],
  });

  // Database Systems Lectures
  await prisma.lecture.createMany({
    data: [
      {
        classId: dbClass.id,
        title: "Relational Model and ER Diagrams",
        description:
          "Entity-relationship modeling, relational algebra basics, and translating business requirements into database schemas.",
        videoUrl: "/videos/lecture-12.mp4",
        notesUrl: "/notes/lecture-12.pdf",
        duration: "50 min",
        thumbnail: "/thumbnails/db-1.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(24),
      },
      {
        classId: dbClass.id,
        title: "SQL Fundamentals: Queries, Joins, and Subqueries",
        description:
          "Writing SQL queries from basic SELECT to complex multi-table joins, aggregations, and nested subqueries.",
        videoUrl: "/videos/lecture-13.mp4",
        notesUrl: "/notes/lecture-13.pdf",
        duration: "1h 15min",
        thumbnail: "/thumbnails/db-2.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(17),
      },
      {
        classId: dbClass.id,
        title: "Indexing, Query Optimization, and Execution Plans",
        description:
          "B-tree and hash indexes, query planner internals, EXPLAIN output interpretation, and performance tuning strategies.",
        videoUrl: "/videos/lecture-14.mp4",
        notesUrl: "/notes/lecture-14.pdf",
        duration: "1h 5min",
        thumbnail: "/thumbnails/db-3.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(10),
      },
      {
        classId: dbClass.id,
        title: "Transactions, ACID Properties, and Concurrency Control",
        description:
          "Transaction isolation levels, locking mechanisms, MVCC, and ensuring data consistency in concurrent environments.",
        videoUrl: "/videos/lecture-15.mp4",
        notesUrl: "/notes/lecture-15.pdf",
        duration: "58 min",
        thumbnail: "/thumbnails/db-4.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(3),
      },
    ],
  });

  // Operating Systems Lectures
  await prisma.lecture.createMany({
    data: [
      {
        classId: osClass.id,
        title: "Introduction to Operating Systems and Process Management",
        description:
          "OS architecture overview, process states and transitions, process control blocks, and system calls.",
        videoUrl: "/videos/lecture-16.mp4",
        notesUrl: "/notes/lecture-16.pdf",
        duration: "52 min",
        thumbnail: "/thumbnails/os-1.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(23),
      },
      {
        classId: osClass.id,
        title: "CPU Scheduling Algorithms",
        description:
          "FCFS, SJF, Round Robin, Priority scheduling, and multi-level queue scheduling with comparative analysis.",
        videoUrl: "/videos/lecture-17.mp4",
        notesUrl: "/notes/lecture-17.pdf",
        duration: "1h",
        thumbnail: "/thumbnails/os-2.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(16),
      },
      {
        classId: osClass.id,
        title: "Memory Management: Paging and Segmentation",
        description:
          "Virtual memory concepts, page tables, TLB, page replacement algorithms, and segmentation techniques.",
        videoUrl: "/videos/lecture-18.mp4",
        notesUrl: "/notes/lecture-18.pdf",
        duration: "1h 10min",
        thumbnail: "/thumbnails/os-3.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(9),
      },
    ],
  });

  // Computer Networks Lectures
  await prisma.lecture.createMany({
    data: [
      {
        classId: networkClass.id,
        title: "OSI Model and TCP/IP Protocol Suite",
        description:
          "Layered network architecture, OSI vs TCP/IP models, encapsulation, and protocol interactions across layers.",
        videoUrl: "/videos/lecture-19.mp4",
        notesUrl: "/notes/lecture-19.pdf",
        duration: "45 min",
        thumbnail: "/thumbnails/net-1.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(22),
      },
      {
        classId: networkClass.id,
        title: "IP Addressing, Subnetting, and Routing",
        description:
          "IPv4/IPv6 addressing schemes, CIDR notation, subnet calculations, and static vs dynamic routing protocols.",
        videoUrl: "/videos/lecture-20.mp4",
        notesUrl: "/notes/lecture-20.pdf",
        duration: "1h 5min",
        thumbnail: "/thumbnails/net-2.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(15),
      },
      {
        classId: networkClass.id,
        title: "Transport Layer: TCP and UDP",
        description:
          "Reliable vs unreliable transport, TCP three-way handshake, flow control, congestion control, and UDP use cases.",
        videoUrl: "/videos/lecture-21.mp4",
        notesUrl: "/notes/lecture-21.pdf",
        duration: "58 min",
        thumbnail: "/thumbnails/net-3.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(8),
      },
      {
        classId: networkClass.id,
        title: "Network Security: Firewalls, VPNs, and Encryption",
        description:
          "Symmetric and asymmetric encryption, SSL/TLS, firewall configurations, VPN tunneling, and common attack vectors.",
        videoUrl: "/videos/lecture-22.mp4",
        notesUrl: "/notes/lecture-22.pdf",
        duration: "1h 15min",
        thumbnail: "/thumbnails/net-4.jpg",
        uploadedById: admin.id,
        uploadedAt: daysAgo(2),
      },
    ],
  });

  console.log("Created lectures for all classes.");

  // ──────────────────────────────────────────────
  // 5. Create live sessions
  // ──────────────────────────────────────────────
  console.log("Creating live sessions...");

  // Helper for date strings
  const today = new Date();
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const todayStr = formatDate(today);
  const tomorrowStr = formatDate(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000));
  const in3Days = formatDate(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000));
  const in5Days = formatDate(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000));
  const yesterdayStr = formatDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000));
  const threeDaysAgoStr = formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000));

  await prisma.liveSession.createMany({
    data: [
      {
        classId: dsaClass.id,
        title: "DSA Doubt Clearing Session - Trees & Graphs",
        description:
          "Live interactive session to resolve doubts on tree traversals, graph BFS/DFS, and related problem-solving techniques.",
        meetingLink: "https://meet.jit.si/TeachingLLM-DSA-Live",
        instructor: "Dr. Ananya Mehta",
        date: todayStr,
        time: "10:00 AM",
        status: "live",
        createdById: admin.id,
      },
      {
        classId: mlClass.id,
        title: "Hands-on: Building Your First Neural Network",
        description:
          "Step-by-step walkthrough of building, training, and evaluating a neural network using Python and TensorFlow.",
        meetingLink: "https://meet.jit.si/TeachingLLM-ML-Workshop",
        instructor: "Prof. Vikram Iyer",
        date: todayStr,
        time: "2:00 PM",
        status: "scheduled",
        createdById: admin.id,
      },
      {
        classId: webDevClass.id,
        title: "Live Coding: Building a REST API with Next.js",
        description:
          "Watch and code along as we build a complete REST API with authentication, validation, and database integration.",
        meetingLink: "https://meet.jit.si/TeachingLLM-WebDev-Live",
        instructor: "Sneha Gupta",
        date: tomorrowStr,
        time: "11:00 AM",
        status: "scheduled",
        createdById: admin.id,
      },
      {
        classId: dbClass.id,
        title: "SQL Performance Tuning Workshop",
        description:
          "Practical session on identifying slow queries, reading execution plans, and applying indexing strategies for optimal performance.",
        meetingLink: "https://meet.jit.si/TeachingLLM-DB-Workshop",
        instructor: "Dr. Rajesh Nair",
        date: in3Days,
        time: "3:00 PM",
        status: "scheduled",
        createdById: admin.id,
      },
      {
        classId: osClass.id,
        title: "OS Concepts Revision - Midterm Preparation",
        description:
          "Comprehensive revision covering process scheduling, memory management, and file systems for the upcoming midterm exam.",
        meetingLink: "https://meet.jit.si/TeachingLLM-OS-Revision",
        instructor: "Prof. Kavitha Raman",
        date: in5Days,
        time: "9:00 AM",
        status: "scheduled",
        createdById: admin.id,
      },
      {
        classId: networkClass.id,
        title: "Packet Analysis with Wireshark",
        description:
          "Hands-on demonstration of capturing and analyzing network packets using Wireshark to understand protocol behavior.",
        meetingLink: "https://meet.jit.si/TeachingLLM-Network-Lab",
        instructor: "Dr. Ananya Mehta",
        date: yesterdayStr,
        time: "4:00 PM",
        status: "completed",
        createdById: admin.id,
      },
      {
        classId: dsaClass.id,
        title: "Competitive Programming Strategies",
        description:
          "Tips and techniques for competitive programming, covering time management, common patterns, and practice problem walkthroughs.",
        meetingLink: "https://meet.jit.si/TeachingLLM-DSA-CompProg",
        instructor: "Sneha Gupta",
        date: threeDaysAgoStr,
        time: "1:00 PM",
        status: "completed",
        createdById: admin.id,
      },
    ],
  });

  console.log("Created 7 live sessions.");

  // ──────────────────────────────────────────────
  // 6. Create materials for classes
  // ──────────────────────────────────────────────
  console.log("Creating materials...");

  await prisma.material.createMany({
    data: [
      // DSA materials
      {
        classId: dsaClass.id,
        title: "DSA Complete Reference Notes",
        description:
          "Comprehensive notes covering all data structures and algorithms topics with diagrams and code examples.",
        fileUrl: "/materials/dsa-reference-notes.pdf",
        fileType: "PDF",
        fileSize: "4.2 MB",
        uploadedById: admin.id,
      },
      {
        classId: dsaClass.id,
        title: "Algorithm Complexity Cheat Sheet",
        description:
          "Quick reference card for Big-O complexities of common data structures and sorting algorithms.",
        fileUrl: "/materials/complexity-cheatsheet.pdf",
        fileType: "PDF",
        fileSize: "820 KB",
        uploadedById: admin.id,
      },
      {
        classId: dsaClass.id,
        title: "Week 1-4 Lecture Slides",
        description:
          "Compiled slide deck from the first four weeks covering arrays through binary trees.",
        fileUrl: "/materials/dsa-slides-week1-4.pptx",
        fileType: "PPTX",
        fileSize: "12.5 MB",
        uploadedById: admin.id,
      },

      // ML materials
      {
        classId: mlClass.id,
        title: "Machine Learning Mathematics Primer",
        description:
          "Essential linear algebra, probability, and calculus concepts needed for understanding ML algorithms.",
        fileUrl: "/materials/ml-math-primer.pdf",
        fileType: "PDF",
        fileSize: "3.8 MB",
        uploadedById: admin.id,
      },
      {
        classId: mlClass.id,
        title: "Python for ML - Jupyter Notebooks",
        description:
          "Collection of interactive Jupyter notebooks with code examples for regression, classification, and clustering.",
        fileUrl: "/materials/ml-notebooks.zip",
        fileType: "ZIP",
        fileSize: "8.1 MB",
        uploadedById: admin.id,
      },
      {
        classId: mlClass.id,
        title: "Neural Networks Architecture Diagrams",
        description:
          "Visual guide to common neural network architectures including CNNs, RNNs, and Transformers.",
        fileUrl: "/materials/nn-architectures.pptx",
        fileType: "PPTX",
        fileSize: "6.3 MB",
        uploadedById: admin.id,
      },

      // Web Dev materials
      {
        classId: webDevClass.id,
        title: "React Best Practices Guide",
        description:
          "Industry-standard patterns for React development including hooks, context, performance optimization, and testing.",
        fileUrl: "/materials/react-best-practices.pdf",
        fileType: "PDF",
        fileSize: "2.9 MB",
        uploadedById: admin.id,
      },
      {
        classId: webDevClass.id,
        title: "Full-Stack Project Starter Template",
        description:
          "Boilerplate project with Next.js, Prisma, and Tailwind CSS pre-configured with authentication and API routes.",
        fileUrl: "/materials/fullstack-template.zip",
        fileType: "ZIP",
        fileSize: "1.4 MB",
        uploadedById: admin.id,
      },

      // DB materials
      {
        classId: dbClass.id,
        title: "SQL Query Practice Problems",
        description:
          "50 progressively difficult SQL problems with solutions covering joins, subqueries, window functions, and CTEs.",
        fileUrl: "/materials/sql-practice-problems.pdf",
        fileType: "PDF",
        fileSize: "1.7 MB",
        uploadedById: admin.id,
      },
      {
        classId: dbClass.id,
        title: "Database Design Assignment Brief",
        description:
          "Assignment instructions for designing and implementing a normalized database schema for an e-commerce platform.",
        fileUrl: "/materials/db-design-assignment.doc",
        fileType: "DOC",
        fileSize: "540 KB",
        uploadedById: admin.id,
      },

      // OS materials
      {
        classId: osClass.id,
        title: "Process Scheduling Simulation Guide",
        description:
          "Step-by-step guide for running the CPU scheduling simulator with sample workloads and analysis templates.",
        fileUrl: "/materials/scheduling-simulation.pdf",
        fileType: "PDF",
        fileSize: "2.1 MB",
        uploadedById: admin.id,
      },
      {
        classId: osClass.id,
        title: "OS Midterm Study Guide",
        description:
          "Condensed study material covering key topics, sample questions, and important formulas for the midterm exam.",
        fileUrl: "/materials/os-midterm-guide.doc",
        fileType: "DOC",
        fileSize: "1.3 MB",
        uploadedById: admin.id,
      },

      // Network materials
      {
        classId: networkClass.id,
        title: "Networking Lab Manual",
        description:
          "Complete lab manual with exercises on packet tracing, subnetting, socket programming, and Wireshark analysis.",
        fileUrl: "/materials/networking-lab-manual.pdf",
        fileType: "PDF",
        fileSize: "5.6 MB",
        uploadedById: admin.id,
      },
      {
        classId: networkClass.id,
        title: "TCP/IP Protocol Reference Slides",
        description:
          "Detailed slides on TCP/IP protocol suite with packet format diagrams, header fields, and state machines.",
        fileUrl: "/materials/tcpip-reference-slides.pptx",
        fileType: "PPTX",
        fileSize: "9.2 MB",
        uploadedById: admin.id,
      },
    ],
  });

  console.log("Created 14 materials.");

  // ──────────────────────────────────────────────
  // 7. Create calendar events
  // ──────────────────────────────────────────────
  console.log("Creating calendar events...");

  const in1Week = formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  const in10Days = formatDate(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000));
  const in2Weeks = formatDate(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000));
  const in18Days = formatDate(new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000));
  const in3Weeks = formatDate(new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000));

  await prisma.calendarEvent.createMany({
    data: [
      {
        title: "DSA Assignment 3 Due",
        description:
          "Submit your solutions for Binary Tree problems (Q1-Q5) via the portal. Late submissions will incur a 10% penalty per day.",
        date: tomorrowStr,
        time: "11:59 PM",
        type: "assignment",
        relatedClass: "Data Structures & Algorithms",
        classId: dsaClass.id,
        createdById: admin.id,
      },
      {
        title: "ML Quiz: Regression Techniques",
        description:
          "Online quiz covering linear regression, polynomial regression, and regularization methods. Duration: 30 minutes.",
        date: in3Days,
        time: "10:00 AM",
        type: "exam",
        relatedClass: "Machine Learning Fundamentals",
        classId: mlClass.id,
        createdById: admin.id,
      },
      {
        title: "Web Development Project Presentation",
        description:
          "Each team presents their full-stack project. 15 minutes per team including Q&A. Attendance is mandatory.",
        date: in1Week,
        time: "2:00 PM",
        type: "class",
        relatedClass: "Web Development",
        classId: webDevClass.id,
        createdById: admin.id,
      },
      {
        title: "Database Systems Midterm Exam",
        description:
          "Written exam covering ER modeling, normalization, SQL queries, and transaction management. Bring your student ID.",
        date: in10Days,
        time: "9:00 AM",
        type: "exam",
        relatedClass: "Database Systems",
        classId: dbClass.id,
        createdById: admin.id,
      },
      {
        title: "OS Lab: Memory Management Simulation",
        description:
          "Hands-on lab session implementing page replacement algorithms. Bring your laptops with the simulator installed.",
        date: in2Weeks,
        time: "3:00 PM",
        type: "class",
        relatedClass: "Operating Systems",
        classId: osClass.id,
        createdById: admin.id,
      },
      {
        title: "Networking Assignment 2 Due",
        description:
          "Submit Wireshark capture analysis report and subnetting exercise solutions through the class portal.",
        date: in18Days,
        time: "11:59 PM",
        type: "assignment",
        relatedClass: "Computer Networks",
        classId: networkClass.id,
        createdById: admin.id,
      },
      {
        title: "Guest Lecture: AI in Modern Software Engineering",
        description:
          "Industry expert from Google discusses how AI is transforming software development practices. Open to all students.",
        date: in3Weeks,
        time: "4:00 PM",
        type: "event",
        relatedClass: null,
        classId: null,
        createdById: manager.id,
      },
    ],
  });

  console.log("Created 7 calendar events.");

  // ──────────────────────────────────────────────
  // 8. Create announcements
  // ──────────────────────────────────────────────
  console.log("Creating announcements...");

  await prisma.announcement.createMany({
    data: [
      {
        title: "Platform Maintenance Scheduled",
        content:
          "The Teaching LLM platform will undergo scheduled maintenance on Saturday from 2:00 AM to 6:00 AM IST. During this window, the platform may be temporarily unavailable. Please save your work and plan accordingly.",
        type: "warning",
      },
      {
        title: "New Course Materials Available",
        content:
          "Updated lecture slides and practice problem sets have been uploaded for Data Structures & Algorithms and Machine Learning Fundamentals. Check the Materials section of each class to access the new resources.",
        type: "info",
      },
      {
        title: "Midterm Results Published",
        content:
          "Results for the Database Systems and Operating Systems midterm exams are now available. Students can view their scores and detailed feedback in their respective class dashboards. Congratulations to all who performed well!",
        type: "success",
      },
    ],
  });

  console.log("Created 3 announcements.");

  // ──────────────────────────────────────────────
  // Done
  // ──────────────────────────────────────────────
  console.log("\nDatabase seed completed successfully!");
  console.log("Summary:");
  console.log("  - 5 users (1 manager, 1 admin, 3 students)");
  console.log("  - 6 classes");
  console.log("  - 22 lectures");
  console.log("  - 7 live sessions");
  console.log("  - 14 materials");
  console.log("  - 7 calendar events");
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
