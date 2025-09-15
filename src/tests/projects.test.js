import request from "supertest";
import { connectDB, disconnectDB } from "../config/database.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import app from "../server.js";

describe("Projects API", () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});

    // Create a test user and get auth token
    const user = new User({
      email: "test@example.com",
      password: "password123",
      fullName: "Test User",
      verified: true,
      role: "author",
    });
    await user.save();
    userId = user._id;

    // Generate token for testing
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    authToken = loginResponse.body.data.accessToken;
  });

  describe("GET /api/v1/projects/featured", () => {
    it("should get featured projects", async () => {
      // Create some test projects
      const projects = [
        {
          title: "Featured Project 1",
          description: "A featured project",
          price: 49.99,
          thumbnail: "https://example.com/thumb1.jpg",
          techStack: ["React", "Node.js"],
          productType: "web_app",
          license: { type: "commercial" },
          features: ["Feature 1", "Feature 2"],
          author: userId,
          featured: true,
          status: "published",
        },
        {
          title: "Featured Project 2",
          description: "Another featured project",
          price: 29.99,
          thumbnail: "https://example.com/thumb2.jpg",
          techStack: ["Vue.js", "Express"],
          productType: "web_app",
          license: { type: "mit" },
          features: ["Feature 3", "Feature 4"],
          author: userId,
          featured: true,
          status: "published",
        },
      ];

      await Project.insertMany(projects);

      const response = await request(app)
        .get("/api/v1/projects/featured")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].featured).toBe(true);
    });
  });

  describe("GET /api/v1/projects", () => {
    it("should get all published projects", async () => {
      // Create test projects
      const projects = [
        {
          title: "Project 1",
          description: "A test project",
          price: 49.99,
          thumbnail: "https://example.com/thumb1.jpg",
          techStack: ["React", "Node.js"],
          productType: "web_app",
          license: { type: "commercial" },
          features: ["Feature 1"],
          author: userId,
          status: "published",
        },
        {
          title: "Project 2",
          description: "Another test project",
          price: 29.99,
          thumbnail: "https://example.com/thumb2.jpg",
          techStack: ["Vue.js", "Express"],
          productType: "web_app",
          license: { type: "mit" },
          features: ["Feature 2"],
          author: userId,
          status: "draft",
        },
      ];

      await Project.insertMany(projects);

      const response = await request(app).get("/api/v1/projects").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(1); // Only published project
      expect(response.body.data.projects[0].status).toBe("published");
    });

    it("should filter projects by tech stack", async () => {
      const projects = [
        {
          title: "React Project",
          description: "A React project",
          price: 49.99,
          thumbnail: "https://example.com/thumb1.jpg",
          techStack: ["React", "Node.js"],
          productType: "web_app",
          license: { type: "commercial" },
          features: ["Feature 1"],
          author: userId,
          status: "published",
        },
        {
          title: "Vue Project",
          description: "A Vue project",
          price: 29.99,
          thumbnail: "https://example.com/thumb2.jpg",
          techStack: ["Vue.js", "Express"],
          productType: "web_app",
          license: { type: "mit" },
          features: ["Feature 2"],
          author: userId,
          status: "published",
        },
      ];

      await Project.insertMany(projects);

      const response = await request(app)
        .get("/api/v1/projects?techStack=React")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.projects[0].techStack).toContain("React");
    });

    it("should filter projects by price range", async () => {
      const projects = [
        {
          title: "Expensive Project",
          description: "An expensive project",
          price: 99.99,
          thumbnail: "https://example.com/thumb1.jpg",
          techStack: ["React"],
          productType: "web_app",
          license: { type: "commercial" },
          features: ["Feature 1"],
          author: userId,
          status: "published",
        },
        {
          title: "Cheap Project",
          description: "A cheap project",
          price: 19.99,
          thumbnail: "https://example.com/thumb2.jpg",
          techStack: ["Vue.js"],
          productType: "web_app",
          license: { type: "mit" },
          features: ["Feature 2"],
          author: userId,
          status: "published",
        },
      ];

      await Project.insertMany(projects);

      const response = await request(app)
        .get("/api/v1/projects?priceMin=20&priceMax=50")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(0); // No projects in this range
    });
  });

  describe("GET /api/v1/projects/:id", () => {
    it("should get project by ID", async () => {
      const project = new Project({
        title: "Test Project",
        description: "A test project",
        price: 49.99,
        thumbnail: "https://example.com/thumb1.jpg",
        techStack: ["React", "Node.js"],
        productType: "web_app",
        license: { type: "commercial" },
        features: ["Feature 1", "Feature 2"],
        author: userId,
        status: "published",
      });

      await project.save();

      const response = await request(app)
        .get(`/api/v1/projects/${project._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.title).toBe("Test Project");
      expect(response.body.data.project.author).toBeDefined();
    });

    it("should return 404 for non-existent project", async () => {
      const fakeId = "60f7b3b3b3b3b3b3b3b3b3b3";

      const response = await request(app)
        .get(`/api/v1/projects/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Project not found");
    });
  });

  describe("POST /api/v1/projects", () => {
    it("should create a new project", async () => {
      const projectData = {
        title: "New Project",
        description: "A new project",
        price: 49.99,
        thumbnail: "https://example.com/thumb1.jpg",
        techStack: ["React", "Node.js"],
        productType: "web_app",
        license: { type: "commercial" },
        features: ["Feature 1", "Feature 2"],
      };

      const response = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(projectData.title);
      expect(response.body.data.author).toBe(userId.toString());
    });

    it("should not create project without authentication", async () => {
      const projectData = {
        title: "New Project",
        description: "A new project",
        price: 49.99,
        thumbnail: "https://example.com/thumb1.jpg",
        techStack: ["React", "Node.js"],
        productType: "web_app",
        license: { type: "commercial" },
        features: ["Feature 1", "Feature 2"],
      };

      const response = await request(app)
        .post("/api/v1/projects")
        .send(projectData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Not authorized, no token");
    });

    it("should not create project with invalid data", async () => {
      const projectData = {
        title: "", // Invalid: empty title
        description: "A new project",
        price: -10, // Invalid: negative price
        thumbnail: "https://example.com/thumb1.jpg",
        techStack: ["React", "Node.js"],
        productType: "web_app",
        license: { type: "commercial" },
        features: ["Feature 1", "Feature 2"],
      };

      const response = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${authToken}`)
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/projects/filter-options", () => {
    it("should get filter options", async () => {
      // Create projects with different tech stacks and types
      const projects = [
        {
          title: "React Project",
          description: "A React project",
          price: 49.99,
          thumbnail: "https://example.com/thumb1.jpg",
          techStack: ["React", "Node.js"],
          productType: "web_app",
          license: { type: "commercial" },
          features: ["Feature 1"],
          author: userId,
          status: "published",
        },
        {
          title: "Vue Project",
          description: "A Vue project",
          price: 29.99,
          thumbnail: "https://example.com/thumb2.jpg",
          techStack: ["Vue.js", "Express"],
          productType: "mobile_app",
          license: { type: "mit" },
          features: ["Feature 2"],
          author: userId,
          status: "published",
        },
      ];

      await Project.insertMany(projects);

      const response = await request(app)
        .get("/api/v1/projects/filter-options")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.techStacks).toContain("React");
      expect(response.body.data.techStacks).toContain("Vue.js");
      expect(response.body.data.productTypes).toContain("web_app");
      expect(response.body.data.productTypes).toContain("mobile_app");
      expect(response.body.data.licenses).toContain("commercial");
      expect(response.body.data.licenses).toContain("mit");
    });
  });
});
