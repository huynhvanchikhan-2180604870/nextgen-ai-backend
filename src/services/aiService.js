import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAI, logError } from "../config/logger.js";
import Project from "../models/Project.js";

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "AIzaSyABoPIFxN29VegcjENIiwJ1-Z9fv21hiBg"
);

// Get the generative model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// AI Service for project planning and recommendations
export const aiService = {
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

      const prompt = `Bạn là một chuyên gia AI lập kế hoạch dự án. Nhiệm vụ của bạn là tạo ra một kế hoạch dự án toàn diện dựa trên yêu cầu của người dùng.

Thông tin dự án:
- Tên dự án: ${projectName}
- Mô tả: ${description}
- Yêu cầu: ${requirements?.join(", ") || "Không có"}
- Ngân sách: $${budget || "Chưa xác định"}
- Thời gian: ${timeline || "Chưa xác định"}
- Công nghệ ưa thích: ${techPreferences?.join(", ") || "Không có"}
- Độ phức tạp: ${complexity || "Trung bình"}

Hướng dẫn:
1. Cung cấp ước tính thực tế về thời gian, chi phí và độ phức tạp
2. Chia nhỏ dự án thành các giai đoạn logic
3. Đề xuất stack công nghệ phù hợp
4. Xác định rủi ro tiềm ẩn và chiến lược giảm thiểu
5. Cung cấp khuyến nghị có thể thực hiện
6. Xem xét ràng buộc ngân sách và thời gian
7. Định dạng phản hồi dưới dạng JSON có cấu trúc

Định dạng phản hồi:
{
  "overview": {
    "projectName": "Tên dự án",
    "estimatedCost": 50000,
    "estimatedTime": "6 tháng",
    "complexity": "Cao",
    "successRate": 85
  },
  "phases": [
    {
      "id": 1,
      "name": "Giai đoạn 1",
      "duration": "2 tháng",
      "cost": 20000,
      "tasks": ["Nhiệm vụ 1", "Nhiệm vụ 2"],
      "deliverables": ["Sản phẩm 1", "Sản phẩm 2"]
    }
  ],
  "techStack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["Node.js", "Express"],
    "database": ["MongoDB"],
    "deployment": ["Docker", "AWS"]
  },
  "recommendations": [
    {
      "projectId": "id_dự_án",
      "title": "Tên dự án",
      "matchPercentage": 85,
      "price": 299,
      "thumbnail": "url_hình_ảnh",
      "reason": "Lý do khuyến nghị"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      let plan;
      try {
        plan = JSON.parse(text);
      } catch (parseError) {
        // If JSON parsing fails, create a structured response
        plan = {
          overview: {
            projectName: projectName,
            estimatedCost: budget || 50000,
            estimatedTime: timeline || "6 tháng",
            complexity: complexity || "Trung bình",
            successRate: 80,
          },
          phases: [
            {
              id: 1,
              name: "Giai đoạn 1: Phân tích và thiết kế",
              duration: "1-2 tháng",
              cost: (budget || 50000) * 0.3,
              tasks: [
                "Phân tích yêu cầu",
                "Thiết kế hệ thống",
                "Tạo wireframe",
              ],
              deliverables: [
                "Tài liệu phân tích",
                "Thiết kế UI/UX",
                "Kiến trúc hệ thống",
              ],
            },
            {
              id: 2,
              name: "Giai đoạn 2: Phát triển",
              duration: "2-3 tháng",
              cost: (budget || 50000) * 0.5,
              tasks: [
                "Phát triển frontend",
                "Phát triển backend",
                "Tích hợp API",
              ],
              deliverables: [
                "Ứng dụng hoàn chỉnh",
                "API documentation",
                "Test cases",
              ],
            },
            {
              id: 3,
              name: "Giai đoạn 3: Testing và triển khai",
              duration: "1 tháng",
              cost: (budget || 50000) * 0.2,
              tasks: ["Testing", "Bug fixing", "Deployment"],
              deliverables: [
                "Ứng dụng production",
                "User manual",
                "Maintenance plan",
              ],
            },
          ],
          techStack: {
            frontend: techPreferences?.includes("React")
              ? ["React", "TypeScript", "Tailwind CSS"]
              : ["Vue.js", "JavaScript", "CSS3"],
            backend: ["Node.js", "Express.js", "JWT"],
            database: ["MongoDB", "Redis"],
            deployment: ["Docker", "AWS", "Nginx"],
          },
          recommendations: [],
        };
      }

      logAI("project_plan_generated", null, null, {
        projectName,
        phases: plan.phases?.length || 0,
        recommendations: plan.recommendations?.length || 0,
      });

      return {
        success: true,
        plan,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to generate project plan",
      };
    }
  },

  // Get project recommendations
  async getProjectRecommendations(projectDetails) {
    try {
      const { techStack, productType, budget } = projectDetails;

      const prompt = `Dựa trên thông tin dự án, hãy đề xuất các dự án tương tự từ cơ sở dữ liệu:

Thông tin dự án:
- Công nghệ: ${techStack?.join(", ") || "Không có"}
- Loại sản phẩm: ${productType || "Không có"}
- Ngân sách: $${budget || "Không giới hạn"}

Hãy tìm và đề xuất 5 dự án phù hợp nhất với thông tin trên.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Get actual projects from database
      const projects = await Project.find({
        status: "published",
        ...(techStack && { techStack: { $in: techStack } }),
        ...(productType && { productType }),
        ...(budget && { price: { $lte: budget } }),
      })
        .select("title description price thumbnail techStack rating")
        .limit(5)
        .sort({ "rating.average": -1 });

      const recommendations = projects.map((project, index) => ({
        projectId: project._id,
        title: project.title,
        matchPercentage: 90 - index * 10,
        price: project.price,
        thumbnail: project.thumbnail,
        reason: `Phù hợp với công nghệ ${project.techStack.join(", ")}`,
      }));

      return {
        success: true,
        recommendations,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to get recommendations",
      };
    }
  },

  // Chat about project
  async chatAboutProject(sessionId, userMessage, projectContext) {
    try {
      const prompt = `Bạn là một chuyên gia tư vấn dự án AI. Người dùng đang hỏi về dự án của họ.

Thông tin dự án:
- Tên: ${projectContext.projectName || "Chưa có"}
- Mô tả: ${projectContext.description || "Chưa có"}
- Yêu cầu: ${projectContext.requirements?.join(", ") || "Chưa có"}
- Ngân sách: $${projectContext.budget || "Chưa có"}
- Thời gian: ${projectContext.timeline || "Chưa có"}

Câu hỏi của người dùng: ${userMessage}

Hãy trả lời một cách chuyên nghiệp, hữu ích và cụ thể. Đưa ra lời khuyên thực tế và có thể thực hiện được.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logAI("chat_response_generated", null, sessionId, {
        messageLength: userMessage.length,
        responseLength: text.length,
      });

      return {
        success: true,
        response: text,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to generate chat response",
      };
    }
  },

  // Generate code suggestions
  async generateCodeSuggestions(techStack, feature, context) {
    try {
      const prompt = `Bạn là một chuyên gia lập trình. Hãy tạo code mẫu cho tính năng "${feature}" sử dụng công nghệ ${techStack.join(
        ", "
      )}.

Context: ${context}

Hãy cung cấp:
1. Code mẫu hoàn chỉnh
2. Giải thích cách hoạt động
3. Best practices
4. Lưu ý quan trọng

Định dạng phản hồi:
{
  "code": "code_mẫu",
  "explanation": "giải_thích",
  "bestPractices": ["practice1", "practice2"],
  "notes": ["note1", "note2"]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON, fallback to plain text
      let suggestions;
      try {
        suggestions = JSON.parse(text);
      } catch (parseError) {
        suggestions = {
          code: text,
          explanation: "Code suggestion generated by AI",
          bestPractices: ["Follow coding standards", "Add error handling"],
          notes: ["Test thoroughly", "Consider security"],
        };
      }

      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to generate code suggestions",
      };
    }
  },

  // Analyze project complexity
  async analyzeProjectComplexity(projectDetails) {
    try {
      const { requirements, techStack, timeline, budget } = projectDetails;

      const prompt = `Phân tích độ phức tạp của dự án dựa trên:

Yêu cầu: ${requirements?.join(", ") || "Không có"}
Công nghệ: ${techStack?.join(", ") || "Không có"}
Thời gian: ${timeline || "Không có"}
Ngân sách: $${budget || "Không có"}

Hãy đánh giá:
1. Độ phức tạp (Thấp/Trung bình/Cao)
2. Rủi ro tiềm ẩn
3. Thời gian ước tính
4. Chi phí ước tính
5. Khuyến nghị

Định dạng phản hồi:
{
  "complexity": "Cao",
  "riskLevel": "Trung bình",
  "estimatedTime": "6-8 tháng",
  "estimatedCost": 75000,
  "risks": ["Rủi ro 1", "Rủi ro 2"],
  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (parseError) {
        analysis = {
          complexity: "Trung bình",
          riskLevel: "Thấp",
          estimatedTime: "3-4 tháng",
          estimatedCost: budget || 50000,
          risks: ["Thiếu kinh nghiệm", "Thay đổi yêu cầu"],
          recommendations: ["Lập kế hoạch chi tiết", "Thường xuyên review"],
        };
      }

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to analyze project complexity",
      };
    }
  },

  // Generate project documentation
  async generateProjectDocumentation(projectPlan) {
    try {
      const prompt = `Tạo tài liệu dự án dựa trên kế hoạch:

${JSON.stringify(projectPlan, null, 2)}

Hãy tạo:
1. Tài liệu tổng quan dự án
2. Hướng dẫn triển khai
3. Tài liệu API (nếu có)
4. Hướng dẫn bảo trì

Định dạng phản hồi:
{
  "overview": "Tài liệu tổng quan",
  "deployment": "Hướng dẫn triển khai",
  "api": "Tài liệu API",
  "maintenance": "Hướng dẫn bảo trì"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let documentation;
      try {
        documentation = JSON.parse(text);
      } catch (parseError) {
        documentation = {
          overview: text,
          deployment: "Hướng dẫn triển khai sẽ được cung cấp",
          api: "Tài liệu API sẽ được tạo",
          maintenance: "Hướng dẫn bảo trì sẽ được cung cấp",
        };
      }

      return {
        success: true,
        documentation,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to generate documentation",
      };
    }
  },
};

export default aiService;
