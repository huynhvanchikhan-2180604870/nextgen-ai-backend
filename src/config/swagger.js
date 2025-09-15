import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NextGenAI API",
      version: "1.0.0",
      description:
        "API documentation for NextGenAI - A platform for selling source code and AI Planner",
      contact: {
        name: "NextGenAI Team",
        email: "support@nextgenai.com",
        url: "https://nextgenai.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:5000/api/v1",
        description: "Development server",
      },
      {
        url: "https://api.nextgenai.com/api/v1",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60f7b3b3b3b3b3b3b3b3b3b3",
            },
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            fullName: {
              type: "string",
              example: "John Doe",
            },
            avatar: {
              type: "string",
              example: "https://example.com/avatar.jpg",
            },
            role: {
              type: "string",
              enum: ["user", "author", "admin"],
              example: "user",
            },
            verified: {
              type: "boolean",
              example: true,
            },
            balance: {
              type: "number",
              example: 100.5,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Project: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60f7b3b3b3b3b3b3b3b3b3b3",
            },
            title: {
              type: "string",
              example: "E-commerce React Template",
            },
            description: {
              type: "string",
              example: "Full-featured e-commerce solution with modern design",
            },
            price: {
              type: "number",
              example: 49.99,
            },
            thumbnail: {
              type: "string",
              example: "https://example.com/thumbnail.jpg",
            },
            techStack: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["React", "Node.js", "MongoDB"],
            },
            productType: {
              type: "string",
              enum: [
                "web_app",
                "mobile_app",
                "fullstack",
                "template",
                "api",
                "ai_ml",
                "desktop_app",
                "game",
              ],
              example: "fullstack",
            },
            rating: {
              type: "object",
              properties: {
                average: {
                  type: "number",
                  example: 4.8,
                },
                count: {
                  type: "number",
                  example: 124,
                },
              },
            },
            purchaseCount: {
              type: "number",
              example: 1250,
            },
            featured: {
              type: "boolean",
              example: true,
            },
            status: {
              type: "string",
              enum: ["draft", "published", "archived", "suspended"],
              example: "published",
            },
            author: {
              $ref: "#/components/schemas/User",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60f7b3b3b3b3b3b3b3b3b3b3",
            },
            type: {
              type: "string",
              enum: ["topup", "purchase", "refund", "withdrawal", "commission"],
              example: "purchase",
            },
            amount: {
              type: "number",
              example: -49.99,
            },
            currency: {
              type: "string",
              enum: ["USD", "VND", "EUR"],
              example: "USD",
            },
            description: {
              type: "string",
              example: "Purchase project: E-commerce React Template",
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "processing",
                "completed",
                "failed",
                "cancelled",
                "refunded",
              ],
              example: "completed",
            },
            paymentMethod: {
              type: "string",
              enum: [
                "wallet_balance",
                "vnpay",
                "momo",
                "paypal",
                "stripe",
                "bank_transfer",
              ],
              example: "stripe",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        AIPlannerSession: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60f7b3b3b3b3b3b3b3b3b3b3",
            },
            sessionId: {
              type: "string",
              example: "uuid-session-id",
            },
            status: {
              type: "string",
              enum: ["active", "processing", "completed", "failed", "expired"],
              example: "completed",
            },
            projectDetails: {
              type: "object",
              properties: {
                projectName: {
                  type: "string",
                  example: "My Awesome Project",
                },
                description: {
                  type: "string",
                  example: "A web application for managing tasks",
                },
                requirements: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  example: [
                    "User authentication",
                    "Task management",
                    "Real-time updates",
                  ],
                },
                budget: {
                  type: "number",
                  example: 5000,
                },
                timeline: {
                  type: "string",
                  example: "3 months",
                },
                techPreferences: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  example: ["React", "Node.js", "MongoDB"],
                },
              },
            },
            aiPlan: {
              type: "object",
              properties: {
                overview: {
                  type: "object",
                  properties: {
                    projectName: {
                      type: "string",
                    },
                    estimatedCost: {
                      type: "number",
                    },
                    estimatedTime: {
                      type: "string",
                    },
                    complexity: {
                      type: "string",
                    },
                    successRate: {
                      type: "number",
                    },
                  },
                },
                phases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "number",
                      },
                      name: {
                        type: "string",
                      },
                      duration: {
                        type: "string",
                      },
                      cost: {
                        type: "number",
                      },
                      tasks: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      deliverables: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                    },
                  },
                },
                techStack: {
                  type: "object",
                  properties: {
                    frontend: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                    backend: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                    database: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                    deployment: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                  },
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      projectId: {
                        type: "string",
                      },
                      title: {
                        type: "string",
                      },
                      matchPercentage: {
                        type: "number",
                      },
                      price: {
                        type: "number",
                      },
                      thumbnail: {
                        type: "string",
                      },
                      reason: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            completedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                  },
                  message: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operation successful",
            },
            data: {
              type: "object",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js", "./src/models/*.js"],
};

const specs = swaggerJsdoc(options);

export const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #00ff88; }
  `,
  customSiteTitle: "NextGenAI API Documentation",
  customfavIcon: "/favicon.ico",
};

export default swaggerUi.setup(specs, swaggerOptions);
