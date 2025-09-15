import dotenv from "dotenv";
import connectDB from "../config/database.js";
import Project from "../models/Project.js";
import User from "../models/User.js";

// Load environment variables
dotenv.config();

const sampleUsers = [
  {
    email: "admin@nextgenai.com",
    password: "admin123",
    fullName: "Admin User",
    role: "admin",
    verified: true,
    balance: 1000,
  },
  {
    email: "author@nextgenai.com",
    password: "author123",
    fullName: "Tech Author",
    role: "author",
    verified: true,
    balance: 500,
  },
  {
    email: "user@nextgenai.com",
    password: "user123",
    fullName: "Regular User",
    role: "user",
    verified: true,
    balance: 100,
  },
];

const sampleProjects = [
  {
    title: "E-commerce React Template",
    description: "Full-featured e-commerce solution with modern design",
    longDescription:
      "A complete e-commerce template built with React, Node.js, and MongoDB. Features include user authentication, product catalog, shopping cart, payment integration, and admin dashboard.",
    price: 49.99,
    originalPrice: 79.99,
    thumbnail:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
    images: [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
      "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800",
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
    ],
    demoUrl: "https://demo.nextgenai.com/ecommerce",
    githubUrl: "https://github.com/nextgenai/ecommerce-template",
    techStack: ["React", "Node.js", "MongoDB", "Express", "Stripe"],
    productType: "fullstack",
    license: {
      type: "commercial",
      description: "Can be used for commercial projects",
      restrictions: ["No reselling", "No redistribution"],
    },
    features: [
      "Responsive design",
      "User authentication",
      "Product catalog",
      "Shopping cart",
      "Payment integration",
      "Admin dashboard",
      "Order management",
      "Inventory tracking",
    ],
    requirements: {
      node: ">=14.0.0",
      database: "MongoDB 4.0+",
      other: ["Redis for caching", "Stripe account for payments"],
    },
    fileStructure: {
      "frontend/": "React application with modern UI components",
      "backend/": "Node.js API with Express framework",
      "database/": "MongoDB schemas and migrations",
      "docs/": "Complete documentation and setup guide",
    },
    changelog: [
      {
        version: "1.2.0",
        date: new Date("2024-01-15"),
        changes: [
          "Added payment gateway integration",
          "Bug fixes",
          "Performance improvements",
        ],
      },
      {
        version: "1.1.0",
        date: new Date("2024-01-01"),
        changes: ["Added admin dashboard", "Improved mobile responsiveness"],
      },
    ],
    tags: ["responsive", "admin", "payment", "ecommerce"],
    rating: {
      average: 4.8,
      count: 124,
    },
    purchaseCount: 1250,
    featured: true,
    status: "published",
    glowColor: "#00ff88",
  },
  {
    title: "React Admin Dashboard",
    description: "Modern admin dashboard with dark theme and analytics",
    longDescription:
      "A comprehensive admin dashboard built with React and Material-UI. Perfect for managing web applications with built-in analytics, user management, and customizable widgets.",
    price: 39.99,
    originalPrice: 59.99,
    thumbnail:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    ],
    demoUrl: "https://demo.nextgenai.com/admin-dashboard",
    techStack: ["React", "Material-UI", "Chart.js", "Redux"],
    productType: "web_app",
    license: {
      type: "commercial",
      description: "Can be used for commercial projects",
      restrictions: ["No reselling"],
    },
    features: [
      "Dark/Light theme",
      "Responsive design",
      "Analytics dashboard",
      "User management",
      "Data tables",
      "Charts and graphs",
      "Notification system",
    ],
    requirements: {
      node: ">=16.0.0",
      database: "Any REST API",
      other: ["Modern browser support"],
    },
    tags: ["admin", "dashboard", "analytics", "material-ui"],
    rating: {
      average: 4.6,
      count: 89,
    },
    purchaseCount: 890,
    featured: true,
    status: "published",
    glowColor: "#6366f1",
  },
  {
    title: "Node.js API Boilerplate",
    description:
      "Production-ready Node.js API with authentication and documentation",
    longDescription:
      "A robust Node.js API boilerplate with JWT authentication, rate limiting, input validation, and comprehensive documentation. Perfect for building scalable backend services.",
    price: 29.99,
    thumbnail:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
    images: [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
    ],
    demoUrl: "https://demo.nextgenai.com/api-docs",
    techStack: ["Node.js", "Express", "MongoDB", "JWT", "Swagger"],
    productType: "api",
    license: {
      type: "mit",
      description: "MIT License - Free for commercial use",
      restrictions: [],
    },
    features: [
      "JWT Authentication",
      "Rate limiting",
      "Input validation",
      "Error handling",
      "API documentation",
      "Database integration",
      "Testing setup",
      "Docker support",
    ],
    requirements: {
      node: ">=18.0.0",
      database: "MongoDB 5.0+",
      other: ["Redis for rate limiting"],
    },
    tags: ["api", "backend", "authentication", "documentation"],
    rating: {
      average: 4.7,
      count: 156,
    },
    purchaseCount: 1200,
    featured: false,
    status: "published",
    glowColor: "#10b981",
  },
  {
    title: "Vue.js E-commerce Store",
    description: "Modern e-commerce store built with Vue.js and Nuxt.js",
    longDescription:
      "A complete e-commerce solution using Vue.js and Nuxt.js. Features server-side rendering, PWA capabilities, and modern UI components.",
    price: 44.99,
    originalPrice: 69.99,
    thumbnail:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800",
    images: ["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800"],
    demoUrl: "https://demo.nextgenai.com/vue-store",
    techStack: ["Vue.js", "Nuxt.js", "Vuex", "Tailwind CSS"],
    productType: "web_app",
    license: {
      type: "commercial",
      description: "Can be used for commercial projects",
      restrictions: ["No reselling"],
    },
    features: [
      "Server-side rendering",
      "PWA support",
      "Modern UI",
      "Shopping cart",
      "User accounts",
      "Product search",
      "Mobile responsive",
    ],
    requirements: {
      node: ">=16.0.0",
      database: "Any REST API",
      other: ["Modern browser support"],
    },
    tags: ["vue", "nuxt", "ecommerce", "pwa"],
    rating: {
      average: 4.5,
      count: 67,
    },
    purchaseCount: 450,
    featured: false,
    status: "published",
    glowColor: "#4ade80",
  },
  {
    title: "React Native Mobile App",
    description: "Cross-platform mobile app with React Native and Expo",
    longDescription:
      "A complete mobile application template built with React Native and Expo. Includes navigation, state management, and native features.",
    price: 59.99,
    originalPrice: 89.99,
    thumbnail:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
    images: [
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800",
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800",
    ],
    demoUrl: "https://demo.nextgenai.com/mobile-app",
    techStack: ["React Native", "Expo", "Redux", "React Navigation"],
    productType: "mobile_app",
    license: {
      type: "commercial",
      description: "Can be used for commercial projects",
      restrictions: ["No reselling"],
    },
    features: [
      "Cross-platform",
      "Native navigation",
      "State management",
      "Push notifications",
      "Camera integration",
      "Offline support",
      "Social login",
    ],
    requirements: {
      node: ">=16.0.0",
      database: "Any REST API",
      other: ["Expo CLI", "iOS/Android development environment"],
    },
    tags: ["react-native", "mobile", "expo", "cross-platform"],
    rating: {
      average: 4.4,
      count: 92,
    },
    purchaseCount: 680,
    featured: true,
    status: "published",
    glowColor: "#f59e0b",
  },
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log("🗄️  Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    console.log("🧹 Cleared existing data");

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.email}`);
    }

    // Create projects
    const author = createdUsers.find((user) => user.role === "author");
    for (const projectData of sampleProjects) {
      const project = await Project.create({
        ...projectData,
        author: author._id,
      });
      console.log(`📦 Created project: ${project.title}`);
    }

    console.log("✅ Database seeded successfully!");
    console.log("\n📋 Sample accounts:");
    console.log("Admin: admin@nextgenai.com / admin123");
    console.log("Author: author@nextgenai.com / author123");
    console.log("User: user@nextgenai.com / user123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
