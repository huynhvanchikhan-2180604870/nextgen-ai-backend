import { logError } from "../config/logger.js";
import AIProjectPlan from "../models/AIProjectPlan.js";

// Save AI project plan
const saveProjectPlan = async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      projectType,
      budget,
      timeline,
      techStack,
      features,
      tags,
    } = req.body;

    // Validate required fields
    if (!title || !content || !projectType || !budget || !timeline) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: title, content, projectType, budget, timeline",
      });
    }

    const projectPlan = new AIProjectPlan({
      user: req.user._id,
      title,
      description: description || "",
      content,
      projectType,
      budget: parseInt(budget),
      timeline,
      techStack: techStack || [],
      features: features || [],
      tags: tags || [],
    });

    await projectPlan.save();

    res.status(201).json({
      success: true,
      message: "Project plan saved successfully",
      data: {
        planId: projectPlan._id,
        title: projectPlan.title,
        status: projectPlan.status,
        createdAt: projectPlan.createdAt,
      },
    });
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to save project plan",
      error: error.message,
    });
  }
};

// Get user's project plans
const getUserProjectPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectType } = req.query;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (status) filter.status = status;
    if (projectType) filter.projectType = projectType;

    const plans = await AIProjectPlan.find(filter)
      .select(
        "title description projectType budget timeline status createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AIProjectPlan.countDocuments(filter);

    res.json({
      success: true,
      data: {
        plans,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to get project plans",
      error: error.message,
    });
  }
};

// Get single project plan
const getProjectPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await AIProjectPlan.findOne({
      _id: planId,
      user: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Project plan not found",
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to get project plan",
      error: error.message,
    });
  }
};

// Update project plan
const updateProjectPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const updateData = req.body;

    const plan = await AIProjectPlan.findOneAndUpdate(
      { _id: planId, user: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Project plan not found",
      });
    }

    res.json({
      success: true,
      message: "Project plan updated successfully",
      data: plan,
    });
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to update project plan",
      error: error.message,
    });
  }
};

// Delete project plan
const deleteProjectPlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await AIProjectPlan.findOneAndDelete({
      _id: planId,
      user: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Project plan not found",
      });
    }

    res.json({
      success: true,
      message: "Project plan deleted successfully",
    });
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project plan",
      error: error.message,
    });
  }
};

// Export project plan
const exportProjectPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { format = "markdown" } = req.query;

    const plan = await AIProjectPlan.findOne({
      _id: planId,
      user: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Project plan not found",
      });
    }

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${plan.title}.json"`
      );
      return res.json(plan);
    }

    if (format === "markdown") {
      const markdown = `# ${plan.title}

${plan.description ? `## Mô tả\n${plan.description}\n` : ""}

## Thông tin dự án
- **Loại dự án:** ${plan.projectType}
- **Ngân sách:** ${plan.budget.toLocaleString()} VND
- **Thời gian:** ${plan.timeline}
- **Công nghệ:** ${plan.techStack.join(", ")}
- **Chức năng:** ${plan.features.join(", ")}

## Nội dung kế hoạch

${plan.content}

---
*Tạo bởi NextGen AI - ${new Date(plan.createdAt).toLocaleDateString("vi-VN")}*`;

      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${plan.title}.md"`
      );
      return res.send(markdown);
    }

    res.status(400).json({
      success: false,
      message: "Unsupported export format",
    });
  } catch (error) {
    logError(error);
    res.status(500).json({
      success: false,
      message: "Failed to export project plan",
      error: error.message,
    });
  }
};

export {
  deleteProjectPlan,
  exportProjectPlan,
  getProjectPlan,
  getUserProjectPlans,
  saveProjectPlan,
  updateProjectPlan,
};
