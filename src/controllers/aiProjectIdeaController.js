import AIProjectIdea from "../models/AIProjectIdea.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Save AI chat result as project idea
// @route   POST /api/v1/ai-project-ideas
// @access  Private
export const saveProjectIdea = asyncHandler(async (req, res) => {
  const {
    sessionId,
    title,
    description,
    features,
    techStack,
    budget,
    timeline,
    complexity,
    marketAnalysis,
    resources,
    tags,
  } = req.body;

  const projectIdea = await AIProjectIdea.create({
    user: req.user._id,
    sessionId,
    title,
    description,
    features,
    techStack,
    budget,
    timeline,
    complexity,
    marketAnalysis,
    resources,
    tags,
  });

  res.status(201).json({
    success: true,
    data: projectIdea,
  });
});

// @desc    Get user's project ideas
// @route   GET /api/v1/ai-project-ideas
// @access  Private
export const getUserProjectIdeas = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;

  const filters = { user: req.user._id };
  if (status) filters.status = status;
  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  const ideas = await AIProjectIdea.find(filters)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("title description status createdAt tags complexity.budget.estimated");

  const total = await AIProjectIdea.countDocuments(filters);

  res.json({
    success: true,
    data: {
      ideas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get project idea by ID
// @route   GET /api/v1/ai-project-ideas/:id
// @access  Private
export const getProjectIdea = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const idea = await AIProjectIdea.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!idea) {
    return res.status(404).json({
      success: false,
      message: "Project idea not found",
    });
  }

  res.json({
    success: true,
    data: idea,
  });
});

// @desc    Update project idea
// @route   PUT /api/v1/ai-project-ideas/:id
// @access  Private
export const updateProjectIdea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const idea = await AIProjectIdea.findOneAndUpdate(
    { _id: id, user: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );

  if (!idea) {
    return res.status(404).json({
      success: false,
      message: "Project idea not found",
    });
  }

  res.json({
    success: true,
    data: idea,
  });
});

// @desc    Delete project idea
// @route   DELETE /api/v1/ai-project-ideas/:id
// @access  Private
export const deleteProjectIdea = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const idea = await AIProjectIdea.findOneAndDelete({
    _id: id,
    user: req.user._id,
  });

  if (!idea) {
    return res.status(404).json({
      success: false,
      message: "Project idea not found",
    });
  }

  res.json({
    success: true,
    message: "Project idea deleted successfully",
  });
});

// @desc    Export project idea
// @route   POST /api/v1/ai-project-ideas/:id/export
// @access  Private
export const exportProjectIdea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { format = "json" } = req.body;

  const idea = await AIProjectIdea.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!idea) {
    return res.status(404).json({
      success: false,
      message: "Project idea not found",
    });
  }

  // Generate export data based on format
  let exportData;
  let contentType;
  let filename;

  switch (format) {
    case "json":
      exportData = JSON.stringify(idea, null, 2);
      contentType = "application/json";
      filename = `${idea.title.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
      break;

    case "markdown":
      exportData = generateMarkdownExport(idea);
      contentType = "text/markdown";
      filename = `${idea.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
      break;

    case "pdf":
      // For PDF, you would use a library like puppeteer or pdfkit
      // For now, return JSON
      exportData = JSON.stringify(idea, null, 2);
      contentType = "application/json";
      filename = `${idea.title.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
      break;

    default:
      return res.status(400).json({
        success: false,
        message: "Unsupported export format",
      });
  }

  // Record export in the idea
  idea.exportFormats.push({
    type: format,
    generatedAt: new Date(),
  });
  await idea.save();

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(exportData);
});

// @desc    Get public project ideas
// @route   GET /api/v1/ai-project-ideas/public
// @access  Public
export const getPublicProjectIdeas = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, tags } = req.query;

  const filters = { isPublic: true };
  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (tags) {
    filters.tags = { $in: tags.split(",") };
  }

  const ideas = await AIProjectIdea.find(filters)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("title description tags createdAt complexity.budget.estimated")
    .populate("user", "name email");

  const total = await AIProjectIdea.countDocuments(filters);

  res.json({
    success: true,
    data: {
      ideas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Helper function to generate markdown export
function generateMarkdownExport(idea) {
  let markdown = `# ${idea.title}\n\n`;
  markdown += `**Description:** ${idea.description}\n\n`;
  
  if (idea.features && idea.features.length > 0) {
    markdown += `## Features\n\n`;
    idea.features.forEach((feature, index) => {
      markdown += `${index + 1}. **${feature.name}** (${feature.priority})\n`;
      markdown += `   ${feature.description}\n`;
      if (feature.estimatedHours) {
        markdown += `   *Estimated: ${feature.estimatedHours} hours*\n`;
      }
      markdown += `\n`;
    });
  }

  if (idea.techStack && idea.techStack.length > 0) {
    markdown += `## Technology Stack\n\n`;
    idea.techStack.forEach(tech => {
      markdown += `- **${tech.name}** (${tech.category}) - ${tech.experience}\n`;
    });
    markdown += `\n`;
  }

  if (idea.budget) {
    markdown += `## Budget\n\n`;
    markdown += `**Total Estimated:** ${idea.budget.estimated || idea.calculateTotalBudget()} ${idea.budget.currency}\n\n`;
    
    if (idea.budget.breakdown && idea.budget.breakdown.length > 0) {
      markdown += `### Breakdown\n\n`;
      idea.budget.breakdown.forEach(item => {
        markdown += `- **${item.category}:** ${item.amount} ${idea.budget.currency}\n`;
        if (item.description) {
          markdown += `  ${item.description}\n`;
        }
      });
      markdown += `\n`;
    }
  }

  if (idea.timeline) {
    markdown += `## Timeline\n\n`;
    markdown += `**Total Estimated:** ${idea.timeline.estimated || idea.calculateTotalTimeline()} weeks\n\n`;
    
    if (idea.timeline.phases && idea.timeline.phases.length > 0) {
      markdown += `### Phases\n\n`;
      idea.timeline.phases.forEach((phase, index) => {
        markdown += `${index + 1}. **${phase.name}** (${phase.duration} weeks)\n`;
        if (phase.description) {
          markdown += `   ${phase.description}\n`;
        }
        if (phase.deliverables && phase.deliverables.length > 0) {
          markdown += `   **Deliverables:**\n`;
          phase.deliverables.forEach(deliverable => {
            markdown += `   - ${deliverable}\n`;
          });
        }
        markdown += `\n`;
      });
    }
  }

  if (idea.complexity) {
    markdown += `## Complexity Analysis\n\n`;
    markdown += `**Level:** ${idea.complexity.level}\n`;
    markdown += `**Score:** ${idea.complexity.score}/10\n\n`;
    
    if (idea.complexity.factors && idea.complexity.factors.length > 0) {
      markdown += `### Factors\n\n`;
      idea.complexity.factors.forEach(factor => {
        markdown += `- **${factor.name}** (${factor.impact} impact)\n`;
        if (factor.description) {
          markdown += `  ${factor.description}\n`;
        }
      });
      markdown += `\n`;
    }
  }

  if (idea.marketAnalysis) {
    markdown += `## Market Analysis\n\n`;
    if (idea.marketAnalysis.targetAudience) {
      markdown += `**Target Audience:** ${idea.marketAnalysis.targetAudience}\n\n`;
    }
    if (idea.marketAnalysis.competitors && idea.marketAnalysis.competitors.length > 0) {
      markdown += `**Competitors:** ${idea.marketAnalysis.competitors.join(", ")}\n\n`;
    }
    if (idea.marketAnalysis.opportunities && idea.marketAnalysis.opportunities.length > 0) {
      markdown += `**Opportunities:**\n`;
      idea.marketAnalysis.opportunities.forEach(opp => {
        markdown += `- ${opp}\n`;
      });
      markdown += `\n`;
    }
  }

  markdown += `---\n`;
  markdown += `*Generated on ${new Date().toLocaleDateString()}*\n`;

  return markdown;
}
