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
      const prompt = `Bạn là một chuyên gia tư vấn dự án AI với 10+ năm kinh nghiệm. Người dùng đang hỏi về dự án của họ.

Thông tin dự án hiện tại:
- Tên: ${projectContext.projectName || "Chưa có"}
- Mô tả: ${projectContext.description || "Chưa có"}
- Yêu cầu: ${projectContext.requirements?.join(", ") || "Chưa có"}
- Ngân sách: $${projectContext.budget || "Chưa có"}
- Thời gian: ${projectContext.timeline || "Chưa có"}

Câu hỏi của người dùng: ${userMessage}

Hãy trả lời một cách chuyên nghiệp và chi tiết, bao gồm:

1. **Phân tích dự án:** Đánh giá độ phức tạp, rủi ro và tiềm năng
2. **Timeline cụ thể:** Chia nhỏ dự án thành các giai đoạn với thời gian cụ thể
3. **Báo giá chi tiết:** Ước tính chi phí cho từng giai đoạn và tổng thể
4. **Tech stack đề xuất:** Công nghệ phù hợp với ngân sách và yêu cầu
5. **Đội ngũ cần thiết:** Số lượng và vai trò developers
6. **Rủi ro và giải pháp:** Các vấn đề có thể gặp phải và cách xử lý
7. **Khuyến nghị:** Lời khuyên thực tế để tối ưu hóa dự án

Định dạng response:
- Sử dụng markdown để format đẹp
- Đưa ra số liệu cụ thể (thời gian, chi phí, số người)
- Phân tích chi tiết từng khía cạnh
- Đưa ra timeline và milestone rõ ràng
- Báo giá theo từng giai đoạn phát triển`;

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

  // Smart AI conversation flow
  async smartProjectConsultation(userMessage, conversationHistory) {
    try {
      // Analyze conversation history to determine current step
      const lastMessages = conversationHistory.slice(-3);
      const isFirstMessage = conversationHistory.length <= 1;

      let prompt = `Bạn là một chuyên gia tư vấn dự án AI thông minh. Bạn sẽ hỏi từng bước để thu thập thông tin dự án.

Lịch sử cuộc trò chuyện:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

Tin nhắn mới nhất của user: "${userMessage}"

Hãy phân tích và trả lời theo logic sau:

**BƯỚC 1: Xác định quy mô dự án**
- Nếu đây là tin nhắn đầu tiên hoặc chưa xác định quy mô
- Hỏi: "Xin chào! Tôi hiểu bạn muốn làm ${userMessage}. Quy mô của dự án ở mức độ nào?"
- Đưa ra 3 lựa chọn: "1. Đồ án môn học", "2. Đồ án tốt nghiệp", "3. Dự án thực tế"

**BƯỚC 2: Hỏi về công nghệ**
- Nếu đã xác định quy mô nhưng chưa hỏi về công nghệ
- Hỏi: "Bạn đã chọn được công nghệ để xây dựng chưa?"
- Gợi ý công nghệ dựa trên quy mô dự án

**BƯỚC 3: Hỏi về chức năng**
- Nếu đã có công nghệ nhưng chưa hỏi về chức năng
- Hỏi: "Bạn đã nghĩ ra được các chức năng chưa? Nếu chưa tôi sẽ giúp bạn gợi ý dựa vào quy mô dự án."

**BƯỚC 4: Hỏi về ngân sách**
- Nếu đã có chức năng nhưng chưa hỏi về ngân sách
- Hỏi: "Ngân sách dự kiến của bạn là bao nhiêu?"

**BƯỚC 5: Phân tích và báo giá**
- Nếu đã có đầy đủ thông tin (quy mô, công nghệ, chức năng, ngân sách)
- Đưa ra phân tích chi tiết, timeline, báo giá và nút "Xác nhận đặt hàng"

Hãy trả lời ngắn gọn, thân thiện và theo đúng bước hiện tại.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to generate smart consultation",
      };
    }
  },

  // Analyze project requirements and provide detailed analysis
  async analyzeProjectRequirements(userMessage) {
    try {
      const prompt = `Bạn là một chuyên gia tư vấn dự án AI với 10+ năm kinh nghiệm. Người dùng đưa ra yêu cầu: "${userMessage}"

Hãy phân tích và đưa ra một báo cáo chi tiết bao gồm:

## 📊 **PHÂN TÍCH DỰ ÁN**

### **1. Đánh giá tổng quan**
- **Loại dự án:** [Xác định loại dự án]
- **Độ phức tạp:** [Thấp/Trung bình/Cao] với lý do
- **Thị trường mục tiêu:** [Phân tích thị trường]
- **Tiềm năng thương mại:** [Đánh giá khả năng sinh lời]

### **2. TIMELINE CHI TIẾT**
**Giai đoạn 1: Planning & Design (2-3 tuần)**
- Phân tích yêu cầu chi tiết
- Thiết kế UI/UX
- Lựa chọn công nghệ
- Thiết kế database

**Giai đoạn 2: Development Core (4-6 tuần)**
- Phát triển backend API
- Xây dựng frontend
- Tích hợp database
- Testing cơ bản

**Giai đoạn 3: Features & Integration (3-4 tuần)**
- Tính năng nâng cao
- Tích hợp thanh toán
- SEO optimization
- Security implementation

**Giai đoạn 4: Testing & Deployment (2-3 tuần)**
- Testing toàn diện
- Performance optimization
- Deployment
- Documentation

### **3. BÁO GIÁ CHI TIẾT**

**💰 Chi phí phát triển:**
- **Frontend Development:** $3,000 - $5,000
- **Backend Development:** $4,000 - $7,000
- **Database Design:** $1,000 - $2,000
- **UI/UX Design:** $2,000 - $3,000
- **Testing & QA:** $1,500 - $2,500
- **Deployment & Setup:** $500 - $1,000

**📊 Tổng chi phí ước tính: $12,000 - $20,500**

### **4. TECH STACK ĐỀ XUẤT**

**Frontend:**
- React.js + Next.js (SEO friendly)
- Tailwind CSS (styling)
- Redux/Zustand (state management)

**Backend:**
- Node.js + Express.js
- MongoDB/PostgreSQL (database)
- JWT (authentication)

**Infrastructure:**
- Vercel/Netlify (frontend hosting)
- AWS/DigitalOcean (backend hosting)
- Cloudinary (image storage)

### **5. ĐỘI NGŨ CẦN THIẾT**
- **1 Full-stack Developer** (lead)
- **1 Frontend Developer** (UI/UX focus)
- **1 Backend Developer** (API & Database)
- **1 UI/UX Designer** (part-time)
- **1 QA Tester** (part-time)

### **6. RỦI RO VÀ GIẢI PHÁP**

**Rủi ro cao:**
- Thay đổi yêu cầu trong quá trình phát triển
- Vấn đề về hiệu năng với lượng người dùng lớn
- Bảo mật dữ liệu khách hàng

**Giải pháp:**
- Agile development với sprint 2 tuần
- Load testing và optimization
- Security audit và encryption

### **7. KHUYẾN NGHỊ**

**Ưu tiên cao:**
1. Bắt đầu với MVP (Minimum Viable Product)
2. Focus vào user experience
3. Implement analytics từ đầu
4. Chuẩn bị cho scaling

**Lộ trình phát triển:**
- **Tháng 1-2:** MVP với tính năng cơ bản
- **Tháng 3-4:** Advanced features
- **Tháng 5-6:** Optimization & scaling

Hãy đưa ra phân tích cụ thể và thực tế dựa trên yêu cầu "${userMessage}".`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: "Failed to analyze project requirements",
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
