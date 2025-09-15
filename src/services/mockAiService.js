import { logAI, logError } from "../config/logger.js";

// Mock AI Service for development without OpenAI API key
export const mockAiService = {
  // Generate project plan
  async generateProjectPlan(projectDetails) {
    try {
      const {
        projectName,
        description,
        requirements,
        budget,
        timeline,
        techPreferences,
        complexity,
      } = projectDetails;

      // Mock response for development
      const mockPlan = {
        overview: {
          projectName: projectName || "Sample Project",
          estimatedCost: budget || 5000,
          estimatedTime: timeline || "8 weeks",
          complexity: complexity || "medium",
          successRate: 85,
        },
        phases: [
          {
            id: 1,
            name: "Planning & Setup",
            duration: "1-2 weeks",
            cost: Math.floor((budget || 5000) * 0.15),
            tasks: [
              "Requirements analysis",
              "Technical architecture design",
              "Project setup and configuration",
              "Team coordination",
            ],
            deliverables: [
              "Project specification document",
              "Technical architecture diagram",
              "Development environment setup",
            ],
          },
          {
            id: 2,
            name: "Core Development",
            duration: "4-5 weeks",
            cost: Math.floor((budget || 5000) * 0.6),
            tasks: [
              "Backend API development",
              "Frontend implementation",
              "Database design and implementation",
              "Core feature development",
            ],
            deliverables: [
              "Working application prototype",
              "API documentation",
              "Database schema",
            ],
          },
          {
            id: 3,
            name: "Testing & Integration",
            duration: "1-2 weeks",
            cost: Math.floor((budget || 5000) * 0.15),
            tasks: [
              "Unit testing",
              "Integration testing",
              "Performance testing",
              "Bug fixes and optimization",
            ],
            deliverables: [
              "Test reports",
              "Performance benchmarks",
              "Bug fix documentation",
            ],
          },
          {
            id: 4,
            name: "Deployment & Launch",
            duration: "1 week",
            cost: Math.floor((budget || 5000) * 0.1),
            tasks: [
              "Production deployment",
              "Performance optimization",
              "Launch preparation",
              "User training",
            ],
            deliverables: [
              "Live application",
              "Deployment documentation",
              "User manual",
            ],
          },
        ],
        techStack: {
          frontend: techPreferences?.includes("React")
            ? ["React.js", "TypeScript", "TailwindCSS"]
            : ["Vue.js", "JavaScript", "CSS3"],
          backend: techPreferences?.includes("Node")
            ? ["Node.js", "Express.js", "MongoDB"]
            : ["Python", "FastAPI", "PostgreSQL"],
          database: techPreferences?.includes("MongoDB")
            ? ["MongoDB", "Redis"]
            : ["PostgreSQL", "Redis"],
          deployment: ["Docker", "AWS/GCP", "Nginx", "PM2"],
        },
        risks: [
          {
            risk: "Technical complexity",
            probability: "medium",
            impact: "high",
            mitigation: "Regular code reviews and pair programming",
          },
          {
            risk: "Timeline delays",
            probability: "medium",
            impact: "medium",
            mitigation: "Buffer time in schedule and agile methodology",
          },
          {
            risk: "Budget overrun",
            probability: "low",
            impact: "high",
            mitigation: "Regular budget monitoring and scope management",
          },
          {
            risk: "Team availability",
            probability: "low",
            impact: "medium",
            mitigation: "Cross-training and documentation",
          },
        ],
        recommendations: [
          "Use modern development practices (CI/CD, code reviews)",
          "Implement comprehensive testing strategy",
          "Consider scalability from the beginning",
          "Regular client communication and feedback",
          "Documentation is crucial for maintenance",
          "Use version control and branching strategy",
          "Implement monitoring and logging",
          "Plan for future maintenance and updates",
        ],
        nextSteps: [
          "Finalize project requirements",
          "Set up development environment",
          "Create project repository",
          "Assign team members to phases",
          "Schedule regular review meetings",
        ],
      };

      logAI.info("Mock AI project plan generated", {
        projectName,
        complexity,
        budget,
        timeline,
      });

      return {
        success: true,
        plan: mockPlan,
        metadata: {
          model: "mock-gpt-4",
          tokensUsed: 0,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logError.error("Mock AI project plan generation failed", {
        error: error.message,
        projectDetails,
      });

      return {
        success: false,
        error: "Failed to generate project plan",
        details: error.message,
      };
    }
  },

  // Chat about project
  async chatAboutProject(sessionId, message, projectContext) {
    try {
      // Mock chat responses
      const responses = [
        "Tôi hiểu yêu cầu của bạn. Dựa trên thông tin dự án, tôi khuyên bạn nên tập trung vào việc xây dựng MVP trước.",
        "Để tối ưu hóa ngân sách, bạn có thể sử dụng các công nghệ mã nguồn mở và triển khai trên cloud.",
        "Về mặt kỹ thuật, tôi đề xuất sử dụng kiến trúc microservices để dễ dàng mở rộng sau này.",
        "Timeline của bạn khá hợp lý. Tuy nhiên, tôi khuyên bạn nên thêm 1-2 tuần buffer cho testing và deployment.",
        "Để giảm thiểu rủi ro, hãy đảm bảo có documentation đầy đủ và code review process.",
        "Tôi thấy dự án này có tiềm năng lớn. Hãy tập trung vào user experience và performance optimization.",
      ];

      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      logAI.info("Mock AI chat response generated", {
        sessionId,
        messageLength: message.length,
        hasProjectContext: !!projectContext,
      });

      return {
        success: true,
        response: randomResponse,
        metadata: {
          model: "mock-gpt-4",
          tokensUsed: 0,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logError.error("Mock AI chat failed", {
        error: error.message,
        sessionId,
        message,
      });

      return {
        success: false,
        error: "Failed to process chat message",
        details: error.message,
      };
    }
  },

  // Get project recommendations
  async getProjectRecommendations(userId, preferences) {
    try {
      // Mock project recommendations
      const recommendations = [
        {
          id: "rec-1",
          title: "E-commerce Platform",
          description: "Modern e-commerce solution with React and Node.js",
          techStack: ["React", "Node.js", "MongoDB", "Stripe"],
          estimatedCost: 8000,
          estimatedTime: "10 weeks",
          complexity: "high",
          matchScore: 95,
        },
        {
          id: "rec-2",
          title: "Task Management App",
          description: "Collaborative task management with real-time updates",
          techStack: ["Vue.js", "Express", "PostgreSQL", "Socket.io"],
          estimatedCost: 5000,
          estimatedTime: "6 weeks",
          complexity: "medium",
          matchScore: 88,
        },
        {
          id: "rec-3",
          title: "Blog CMS",
          description: "Content management system for bloggers",
          techStack: ["Next.js", "Node.js", "MongoDB", "Cloudinary"],
          estimatedCost: 3000,
          estimatedTime: "4 weeks",
          complexity: "low",
          matchScore: 82,
        },
      ];

      logAI.info("Mock project recommendations generated", {
        userId,
        preferencesCount: Object.keys(preferences || {}).length,
      });

      return {
        success: true,
        recommendations,
        metadata: {
          model: "mock-gpt-4",
          tokensUsed: 0,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logError.error("Mock project recommendations failed", {
        error: error.message,
        userId,
        preferences,
      });

      return {
        success: false,
        error: "Failed to generate recommendations",
        details: error.message,
      };
    }
  },

  // Analyze project complexity
  async analyzeProjectComplexity(projectDetails) {
    try {
      const { requirements, techStack, features, timeline, budget } =
        projectDetails;

      // Simple complexity analysis
      let complexityScore = 0;

      // Requirements complexity
      if (requirements && requirements.length > 10) complexityScore += 2;
      else if (requirements && requirements.length > 5) complexityScore += 1;

      // Tech stack complexity
      if (techStack && techStack.length > 5) complexityScore += 2;
      else if (techStack && techStack.length > 3) complexityScore += 1;

      // Features complexity
      if (features && features.length > 8) complexityScore += 2;
      else if (features && features.length > 4) complexityScore += 1;

      // Timeline pressure
      if (timeline && parseInt(timeline) < 4) complexityScore += 2;
      else if (timeline && parseInt(timeline) < 8) complexityScore += 1;

      // Budget constraints
      if (budget && budget < 3000) complexityScore += 1;

      let complexity = "low";
      if (complexityScore >= 6) complexity = "high";
      else if (complexityScore >= 3) complexity = "medium";

      const analysis = {
        complexity,
        score: complexityScore,
        factors: {
          requirements: requirements?.length || 0,
          techStack: techStack?.length || 0,
          features: features?.length || 0,
          timeline: timeline || "8 weeks",
          budget: budget || 5000,
        },
        recommendations:
          complexity === "high"
            ? [
                "Consider breaking into smaller phases",
                "Increase timeline",
                "Add more team members",
              ]
            : complexity === "medium"
            ? ["Plan carefully", "Regular reviews", "Buffer time"]
            : [
                "Good to proceed",
                "Focus on quality",
                "Consider additional features",
              ],
      };

      logAI.info("Mock project complexity analysis completed", {
        complexity,
        score: complexityScore,
      });

      return {
        success: true,
        analysis,
        metadata: {
          model: "mock-gpt-4",
          tokensUsed: 0,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logError.error("Mock complexity analysis failed", {
        error: error.message,
        projectDetails,
      });

      return {
        success: false,
        error: "Failed to analyze complexity",
        details: error.message,
      };
    }
  },
};
