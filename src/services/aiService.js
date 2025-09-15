import OpenAI from "openai";
import { logAI, logError } from "../config/logger.js";
import Project from "../models/Project.js";
import { mockAiService } from "./mockAiService.js";

// Initialize OpenAI with mock key if not provided
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock-key-for-development",
});

// Check if we have a real OpenAI API key
const hasRealApiKey =
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY !== "test-key" &&
  process.env.OPENAI_API_KEY !== "mock-key-for-development";

// AI Service for project planning and recommendations
export const aiService = {
  // Generate project plan
  async generateProjectPlan(projectDetails) {
    // Use mock service if no real API key
    if (!hasRealApiKey) {
      return await mockAiService.generateProjectPlan(projectDetails);
    }

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

      const systemPrompt = `You are an expert AI project planning assistant. Your task is to create a comprehensive project plan based on the user's requirements.

Guidelines:
1. Provide realistic estimates for time, cost, and complexity
2. Break down the project into logical phases
3. Suggest appropriate technology stack
4. Identify potential risks and mitigation strategies
5. Provide actionable recommendations
6. Consider the budget and timeline constraints
7. Format the response as structured JSON

Response format:
{
  "overview": {
    "projectName": "string",
    "estimatedCost": number,
    "estimatedTime": "string",
       "complexity": "string",
    "successRate": number
  },
  "phases": [
    {
      "id": number,
      "name": "string",
      "duration": "string",
      "cost": number,
      "tasks": ["string"],
      "deliverables": ["string"]
    }
  ],
  "techStack": {
    "frontend": ["string"],
    "backend": ["string"],
    "database": ["string"],
    "deployment": ["string"],
    "tools": ["string"]
  },
  "recommendations": [
    {
      "title": "string",
      "matchPercentage": number,
      "price": number,
      "reason": "string"
    }
  ],
  "estimatedROI": {
    "investment": number,
    "projectedRevenue": number,
    "breakEvenTime": "string"
  },
  "risks": [
    {
      "type": "string",
      "description": "string",
      "mitigation": "string",
      "probability": "string"
    }
  ],
  "alternatives": [
    {
      "name": "string",
      "description": "string",
      "pros": ["string"],
      "cons": ["string"],
      "cost": number
    }
  ]
}`;

      const userPrompt = `Create a comprehensive project plan for:

Project Name: ${projectName}
Description: ${description}
Requirements: ${requirements.join(", ")}
Budget: $${budget || "Not specified"}
Timeline: ${timeline || "Not specified"}
Tech Preferences: ${techPreferences?.join(", ") || "None specified"}
Complexity: ${complexity || "medium"}

Please provide a detailed, realistic project plan that considers all the given constraints and requirements.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const response = completion.choices[0].message.content;
      let aiPlan;

      try {
        aiPlan = JSON.parse(response);
      } catch (parseError) {
        // If JSON parsing fails, create a structured response
        aiPlan = {
          overview: {
            projectName,
            estimatedCost: budget || 5000,
            estimatedTime: timeline || "3 months",
            complexity: complexity || "medium",
            successRate: 85,
          },
          phases: [
            {
              id: 1,
              name: "Planning & Design",
              duration: "2 weeks",
              cost: 800,
              tasks: ["UI/UX Design", "Database Design", "API Planning"],
              deliverables: ["Wireframes", "Database Schema"],
            },
            {
              id: 2,
              name: "Development",
              duration: "6 weeks",
              cost: 3000,
              tasks: [
                "Frontend Development",
                "Backend Development",
                "Integration",
              ],
              deliverables: ["Working Application", "API Documentation"],
            },
            {
              id: 3,
              name: "Testing & Deployment",
              duration: "2 weeks",
              cost: 1200,
              tasks: ["Testing", "Bug Fixes", "Deployment"],
              deliverables: ["Production Application", "User Manual"],
            },
          ],
          techStack: {
            frontend: techPreferences || ["React", "Tailwind CSS"],
            backend: ["Node.js", "Express"],
            database: ["MongoDB"],
            deployment: ["AWS", "Docker"],
            tools: ["Git", "VS Code", "Postman"],
          },
          recommendations: [],
          estimatedROI: {
            investment: budget || 5000,
            projectedRevenue: (budget || 5000) * 3,
            breakEvenTime: "6 months",
          },
          risks: [
            {
              type: "Technical",
              description: "Complex integration challenges",
              mitigation: "Thorough testing and prototyping",
              probability: "Medium",
            },
          ],
          alternatives: [],
        };
      }

      // Get project recommendations
      aiPlan.recommendations = await this.getProjectRecommendations(
        projectDetails
      );

      logAI("project_plan_generated", null, null, {
        projectName,
        complexity,
        phases: aiPlan.phases?.length || 0,
      });

      return {
        success: true,
        plan: aiPlan,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Get project recommendations
  async getProjectRecommendations(projectDetails) {
    try {
      const { techPreferences, requirements, budget } = projectDetails;

      // Build search query for similar projects
      const searchQuery = {
        status: "published",
        $or: [],
      };

      if (techPreferences && techPreferences.length > 0) {
        searchQuery.$or.push({
          techStack: { $in: techPreferences },
        });
      }

      if (requirements && requirements.length > 0) {
        searchQuery.$or.push({
          $text: { $search: requirements.join(" ") },
        });
      }

      if (budget) {
        searchQuery.price = { $lte: budget * 1.2 }; // Allow 20% over budget
      }

      // Find similar projects
      const projects = await Project.find(searchQuery)
        .select("title thumbnail price rating techStack description")
        .limit(5)
        .sort({ "rating.average": -1, purchaseCount: -1 });

      const recommendations = projects.map((project) => {
        // Calculate match percentage based on tech stack overlap
        let matchPercentage = 0;
        if (techPreferences && project.techStack) {
          const commonTech = techPreferences.filter((tech) =>
            project.techStack.some((stack) =>
              stack.toLowerCase().includes(tech.toLowerCase())
            )
          );
          matchPercentage = Math.round(
            (commonTech.length / techPreferences.length) * 100
          );
        }

        return {
          projectId: project._id,
          title: project.title,
          matchPercentage: Math.max(matchPercentage, 30), // Minimum 30% match
          price: project.price,
          thumbnail: project.thumbnail,
          reason: `Similar tech stack and requirements. ${project.rating.count} reviews with ${project.rating.average} stars.`,
        };
      });

      return recommendations;
    } catch (error) {
      logError(error);
      return [];
    }
  },

  // Chat with AI about project
  async chatAboutProject(sessionId, userMessage, projectContext) {
    // Use mock service if no real API key
    if (!hasRealApiKey) {
      return await mockAiService.chatAboutProject(
        sessionId,
        userMessage,
        projectContext
      );
    }

    try {
      const systemPrompt = `You are an AI project planning assistant. You help users refine their project plans and answer questions about development.

Context about the current project:
- Project Name: ${projectContext.projectName}
- Description: ${projectContext.description}
- Requirements: ${projectContext.requirements?.join(", ") || "Not specified"}
- Budget: $${projectContext.budget || "Not specified"}
- Timeline: ${projectContext.timeline || "Not specified"}
- Tech Preferences: ${
        projectContext.techPreferences?.join(", ") || "Not specified"
      }

Guidelines:
1. Be helpful and provide practical advice
2. Ask clarifying questions when needed
3. Suggest improvements to the project plan
4. Provide code examples when relevant
5. Keep responses concise but informative
6. Focus on actionable insights`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content;

      logAI("project_chat", null, sessionId, {
        messageLength: userMessage.length,
        responseLength: response.length,
      });

      return {
        success: true,
        response,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Generate code suggestions
  async generateCodeSuggestions(techStack, feature, context) {
    try {
      const systemPrompt = `You are an expert software developer. Generate code examples and suggestions for the given feature and technology stack.

Guidelines:
1. Provide clean, production-ready code
2. Include proper error handling
3. Add comments for clarity
4. Follow best practices for the technology
5. Provide multiple approaches when relevant
6. Include setup instructions if needed`;

      const userPrompt = `Generate code for: ${feature}

Technology Stack: ${techStack.join(", ")}
Context: ${context}

Please provide:
1. Code implementation
2. Setup instructions
3. Best practices
4. Common pitfalls to avoid`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message.content;

      logAI("code_suggestions_generated", null, null, {
        techStack: techStack.join(","),
        feature,
      });

      return {
        success: true,
        code: response,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Analyze project complexity
  async analyzeProjectComplexity(projectDetails) {
    try {
      const { requirements, techPreferences, timeline, budget } =
        projectDetails;

      const systemPrompt = `Analyze the complexity of a software project based on the given requirements and constraints.

Return a JSON response with:
{
  "complexity": "simple|medium|complex|enterprise",
  "confidence": number (0-100),
  "factors": ["string"],
  "recommendations": ["string"],
  "estimatedEffort": "string",
  "riskLevel": "low|medium|high"
}`;

      const userPrompt = `Analyze this project:

Requirements: ${requirements?.join(", ") || "Not specified"}
Tech Stack: ${techPreferences?.join(", ") || "Not specified"}
Timeline: ${timeline || "Not specified"}
Budget: $${budget || "Not specified"}

Provide a complexity analysis with recommendations.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content;
      let analysis;

      try {
        analysis = JSON.parse(response);
      } catch (parseError) {
        analysis = {
          complexity: "medium",
          confidence: 75,
          factors: ["Standard web application", "Common tech stack"],
          recommendations: ["Start with MVP", "Iterate based on feedback"],
          estimatedEffort: "3-6 months",
          riskLevel: "medium",
        };
      }

      logAI("complexity_analyzed", null, null, {
        complexity: analysis.complexity,
        confidence: analysis.confidence,
      });

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Generate project documentation
  async generateProjectDocumentation(projectPlan) {
    try {
      const systemPrompt = `Generate comprehensive project documentation based on the project plan.

Include:
1. Project overview
2. Technical specifications
3. Architecture diagrams (in text format)
4. API documentation
5. Deployment guide
6. Testing strategy
7. Maintenance plan

Format as structured markdown.`;

      const userPrompt = `Generate documentation for this project plan:

${JSON.stringify(projectPlan, null, 2)}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 3000,
      });

      const documentation = completion.choices[0].message.content;

      logAI("documentation_generated", null, null, {
        sections: documentation.split("#").length - 1,
      });

      return {
        success: true,
        documentation,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default aiService;
