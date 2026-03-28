import { createFileRoute } from "@tanstack/react-router";
import { AI_MODEL_CONFIGS, AIModelType } from "@/config/ai";
import { formatGeminiErrorMessage, getGeminiModelInstance } from "@/lib/server/gemini";
import { stripHtml } from "@/utils/html";

const SYSTEM_PROMPT_ZH = `你是一位资深的人力资源专家和简历优化顾问，拥有超过15年的招聘和简历审核经验。你的任务是分析用户的简历内容，并提供专业、具体、可操作的优化建议。

## 分析维度

请从以下几个维度分析简历：

### 1. 基本信息评估
- 姓名和职位标题是否清晰
- 联系方式是否完整
- 是否有不必要的个人信息
- 头像/照片是否得体

### 2. 教育背景评估
- 学校、专业、学历描述是否清晰
- 时间线是否准确
- GPA/荣誉是否突出展示
- 描述是否与目标岗位相关

### 3. 工作经历评估
- 是否使用STAR法则（情境-任务-行动-结果）
- 是否量化了成果（数字、百分比等）
- 动词是否有力且多样化
- 是否与目标岗位匹配
- 时间线是否连续

### 4. 项目经历评估
- 项目背景是否清晰
- 个人角色和贡献是否明确
- 技术栈展示是否充分
- 项目成果是否量化

### 5. 技能特长评估
- 技能分类是否清晰
- 是否展示技能熟练度
- 是否与岗位需求匹配

### 6. 自我评价评估
- 是否避免空话套话
- 是否突出个人优势
- 是否有具体事例支撑

### 7. 整体印象
- 简历结构是否清晰
- 排版是否美观
- 语言是否专业
- 重点是否突出

## 输出格式

请严格按照以下JSON格式输出，不要输出其他内容：

\`\`\`json
{
  "score": 85,
  "suggestions": [
    {
      "category": "basic",
      "priority": "high",
      "title": "完善职位标题",
      "description": "建议将职位标题从"前端开发"改为更具体的方向，如"高级前端开发工程师（Vue/React方向）"",
      "example": "修改前：前端开发\\n修改后：高级前端开发工程师（Vue/React方向）- 5年经验"
    },
    {
      "category": "experience",
      "priority": "high",
      "title": "量化工作成果",
      "description": "工作经历中缺乏具体的数据支撑，建议添加可量化的成果",
      "example": "修改前：负责公司官网开发\\n修改后：主导公司官网重构，页面加载速度提升60%，用户留存率提高25%"
    }
  ],
  "strengths": [
    "教育背景扎实，学历信息完整",
    "项目经历丰富，技术栈覆盖全面"
  ],
  "summary": "这份简历整体结构清晰，但工作经历部分需要加强量化描述，建议重点优化。"
}
\`\`\`

## 字段说明
- score: 简历综合评分（0-100）
- suggestions: 优化建议列表
  - category: 分类（basic/education/experience/project/skills/evaluation/overall）
  - priority: 优先级（high/medium/low）
  - title: 建议标题（简短）
  - description: 详细说明
  - example: 修改示例（可选）
- strengths: 简历亮点列表
- summary: 综合评价总结

注意：
1. 建议要具体，不要说"优化描述"这种空话
2. 优先给出最重要的建议（3-5条即可）
3. 如果某部分内容为空，建议添加相关内容
4. 语气要专业但友善`;

const SYSTEM_PROMPT_EN = `You are a senior HR expert and resume optimization consultant with over 15 years of experience in recruitment and resume review. Your task is to analyze the user's resume content and provide professional, specific, and actionable optimization suggestions.

## Analysis Dimensions

Please analyze the resume from the following dimensions:

### 1. Basic Information Assessment
- Is the name and job title clear
- Are contact details complete
- Are there unnecessary personal details
- Is the photo professional

### 2. Education Background Assessment
- Are school, major, and degree clearly described
- Is the timeline accurate
- Are GPA/honors highlighted
- Is the description relevant to the target position

### 3. Work Experience Assessment
- Is the STAR method used (Situation-Task-Action-Result)
- Are achievements quantified (numbers, percentages)
- Are action verbs powerful and varied
- Does it match the target position
- Is the timeline continuous

### 4. Project Experience Assessment
- Is the project background clear
- Is personal role and contribution clear
- Is the tech stack well presented
- Are project results quantified

### 5. Skills Assessment
- Are skills clearly categorized
- Is skill proficiency shown
- Does it match job requirements

### 6. Self Evaluation Assessment
- Are vague statements avoided
- Are personal strengths highlighted
- Are there specific examples

### 7. Overall Impression
- Is the resume structure clear
- Is the layout professional
- Is the language professional
- Are key points highlighted

## Output Format

Please output strictly in the following JSON format, with no other content:

\`\`\`json
{
  "score": 85,
  "suggestions": [
    {
      "category": "basic",
      "priority": "high",
      "title": "Refine Job Title",
      "description": "Consider changing the job title from 'Frontend Developer' to a more specific direction",
      "example": "Before: Frontend Developer\\nAfter: Senior Frontend Engineer (Vue/React) - 5 Years Experience"
    },
    {
      "category": "experience",
      "priority": "high",
      "title": "Quantify Achievements",
      "description": "Work experience lacks specific data support, consider adding quantifiable results",
      "example": "Before: Responsible for company website development\\nAfter: Led company website rebuild, improved page load speed by 60%, increased user retention by 25%"
    }
  ],
  "strengths": [
    "Solid educational background with complete degree information",
    "Rich project experience with comprehensive tech stack coverage"
  ],
  "summary": "This resume has a clear overall structure, but the work experience section needs more quantitative descriptions. Focus on optimizing this area."
}
\`\`\`

## Field Descriptions
- score: Resume overall score (0-100)
- suggestions: List of optimization suggestions
  - category: Category (basic/education/experience/project/skills/evaluation/overall)
  - priority: Priority (high/medium/low)
  - title: Suggestion title (short)
  - description: Detailed explanation
  - example: Modification example (optional)
- strengths: List of resume highlights
- summary: Overall evaluation summary

Note:
1. Be specific with suggestions, don't say vague things like "optimize description"
2. Prioritize the most important suggestions (3-5 is enough)
3. If a section is empty, suggest adding relevant content
4. Tone should be professional yet friendly`;

interface ResumeData {
  basic?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    [key: string]: unknown;
  };
  education?: Array<{
    school?: string;
    major?: string;
    degree?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  experience?: Array<{
    company?: string;
    position?: string;
    date?: string;
    details?: string;
    [key: string]: unknown;
  }>;
  projects?: Array<{
    name?: string;
    role?: string;
    date?: string;
    description?: string;
    link?: string;
    [key: string]: unknown;
  }>;
  skillContent?: string;
  selfEvaluationContent?: string;
  [key: string]: unknown;
}

function formatResumeContent(resume: ResumeData, locale?: string): string {
  const lines: string[] = [];
  const labels = {
    name: locale === "en" ? "Name" : "姓名",
    title: locale === "en" ? "Job Title" : "职位",
    email: locale === "en" ? "Email" : "邮箱",
    phone: locale === "en" ? "Phone" : "电话",
    location: locale === "en" ? "Location" : "地址",
    education: locale === "en" ? "Education" : "教育经历",
    school: locale === "en" ? "School" : "学校",
    major: locale === "en" ? "Major" : "专业",
    degree: locale === "en" ? "Degree" : "学历",
    gpa: "GPA",
    experience: locale === "en" ? "Work Experience" : "工作经历",
    company: locale === "en" ? "Company" : "公司",
    position: locale === "en" ? "Position" : "职位",
    projects: locale === "en" ? "Projects" : "项目经历",
    projectName: locale === "en" ? "Project Name" : "项目名称",
    role: locale === "en" ? "Role" : "角色",
    skills: locale === "en" ? "Skills" : "技能特长",
    selfEvaluation: locale === "en" ? "Self Evaluation" : "自我评价",
  };

  // Basic information
  if (resume.basic) {
    lines.push(`【${locale === "en" ? "Basic Information" : "基本信息"}】`);
    if (resume.basic.name) lines.push(`${labels.name}: ${resume.basic.name}`);
    if (resume.basic.title) lines.push(`${labels.title}: ${resume.basic.title}`);
    if (resume.basic.email) lines.push(`${labels.email}: ${resume.basic.email}`);
    if (resume.basic.phone) lines.push(`${labels.phone}: ${resume.basic.phone}`);
    if (resume.basic.location) lines.push(`${labels.location}: ${resume.basic.location}`);
    lines.push("");
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    lines.push(`【${labels.education}】`);
    resume.education.forEach((edu, index) => {
      lines.push(`${index + 1}. ${edu.school || ""} - ${edu.major || ""} (${edu.degree || ""})`);
      if (edu.startDate || edu.endDate) {
        lines.push(`   ${locale === "en" ? "Time" : "时间"}: ${edu.startDate || ""} ~ ${edu.endDate || ""}`);
      }
      if (edu.gpa) lines.push(`   GPA: ${edu.gpa}`);
      if (edu.description) lines.push(`   ${edu.description}`);
    });
    lines.push("");
  }

  // Work experience
  if (resume.experience && resume.experience.length > 0) {
    lines.push(`【${labels.experience}】`);
    resume.experience.forEach((exp, index) => {
      lines.push(`${index + 1}. ${exp.company || ""} - ${exp.position || ""}`);
      if (exp.date) lines.push(`   ${locale === "en" ? "Time" : "时间"}: ${exp.date}`);
      if (exp.details) {
        const cleanDetails = stripHtml(exp.details);
        lines.push(`   ${locale === "en" ? "Description" : "描述"}: ${cleanDetails}`);
      }
    });
    lines.push("");
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    lines.push(`【${labels.projects}】`);
    resume.projects.forEach((proj, index) => {
      lines.push(`${index + 1}. ${proj.name || ""} - ${proj.role || ""}`);
      if (proj.date) lines.push(`   ${locale === "en" ? "Time" : "时间"}: ${proj.date}`);
      if (proj.description) {
        const cleanDesc = stripHtml(proj.description);
        lines.push(`   ${locale === "en" ? "Description" : "描述"}: ${cleanDesc}`);
      }
    });
    lines.push("");
  }

  // Skills
  if (resume.skillContent) {
    lines.push(`【${labels.skills}】`);
    const cleanSkills = stripHtml(resume.skillContent);
    lines.push(cleanSkills);
    lines.push("");
  }

  // Self evaluation
  if (resume.selfEvaluationContent) {
    lines.push(`【${labels.selfEvaluation}】`);
    const cleanEval = stripHtml(resume.selfEvaluationContent);
    lines.push(cleanEval);
  }

  return lines.join("\n");
}

export const Route = createFileRoute("/api/resume/optimize-suggest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            resumeData,
            modelType,
            apiKey,
            modelId,
            apiEndpoint,
            locale,
          } = body as {
            resumeData: ResumeData;
            modelType: AIModelType;
            apiKey: string;
            modelId?: string;
            apiEndpoint?: string;
            locale?: string;
          };

          if (!apiKey || !resumeData) {
            return Response.json(
              { success: false, error: "Missing API key or resume data" },
              { status: 400 }
            );
          }

          const modelConfig = AI_MODEL_CONFIGS[modelType];
          if (!modelConfig) {
            return Response.json(
              { success: false, error: "Invalid model type" },
              { status: 400 }
            );
          }

          const systemPrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
          const resumeContent = formatResumeContent(resumeData, locale);

          let resultText: string;

          if (modelType === "gemini") {
            const geminiModel = modelId || "gemini-flash-latest";
            const modelInstance = getGeminiModelInstance({
              apiKey,
              model: geminiModel,
              systemInstruction: systemPrompt,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              },
            });

            const result = await modelInstance.generateContent(
              `${locale === "en" ? "Here is the resume content:" : "以下是简历内容："}\n\n${resumeContent}`
            );
            resultText = result.response.text() || "";
          } else {
            const model = modelConfig.requiresModelId
              ? modelId || modelConfig.defaultModel
              : modelConfig.defaultModel;

            const response = await fetch(modelConfig.url(apiEndpoint), {
              method: "POST",
              headers: modelConfig.headers(apiKey),
              body: JSON.stringify({
                model,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: `${locale === "en" ? "Here is the resume content:" : "以下是简历内容："}\n\n${resumeContent}` },
                ],
                temperature: 0.7,
                max_tokens: 4096,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              let errorMessage = `HTTP ${response.status}`;
              try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
              } catch {
                if (errorText) {
                  errorMessage = errorText.slice(0, 200);
                }
              }
              return Response.json({
                success: false,
                error: errorMessage,
              });
            }

            const data = await response.json();
            resultText = data.choices?.[0]?.message?.content || "";
          }

          // Parse JSON result
          const jsonMatch = resultText.match(/```json\s*([\s\S]*?)```/);
          let suggestions;

          if (jsonMatch) {
            try {
              suggestions = JSON.parse(jsonMatch[1].trim());
            } catch {
              try {
                suggestions = JSON.parse(resultText);
              } catch {
                return Response.json({
                  success: false,
                  error: "Failed to parse AI response",
                });
              }
            }
          } else {
            try {
              suggestions = JSON.parse(resultText);
            } catch {
              return Response.json({
                success: false,
                error: "Failed to parse AI response",
              });
            }
          }

          return Response.json({
            success: true,
            data: suggestions,
          });
        } catch (error) {
          console.error("Resume optimize suggestion error:", error);
          return Response.json(
            {
              success: false,
              error: formatGeminiErrorMessage(error),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
