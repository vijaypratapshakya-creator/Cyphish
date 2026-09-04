import fs from 'fs';
import path from 'path';
import { __dirname } from '../utils/utils.js';
import Template from '../models/Template.js';
import { validateHTMLContent, validatePlaceholders, sanitizeCssSettings } from '../utils/templateUtils.js';
import { convertMarkdownToHtml, applyCssSettings } from '../services/templateService.js';
import { escapeRegex } from '../middlewares/sanitizeMiddleware.js';

const SUPPORTED_PLACEHOLDER_FIELDS = [
    'firstName', 'lastName', 'email', 'phoneNumber', 'role', 'country', 'link', 'department', 'company'
];

function parseCssSettingsFromBody(body) {
    if (body.cssSettings == null) return null;
    if (typeof body.cssSettings === 'object') return sanitizeCssSettings(body.cssSettings);
    try {
        const parsed = JSON.parse(body.cssSettings);
        return sanitizeCssSettings(parsed);
    } catch {
        return null;
    }
}

// Create a new template
export const createTemplate = async (req, res) => {
    try {
        const { name, subject, category, difficulty, tags } = req.body;
        const type = req.body.type || req.body.category || 'custom';
        let htmlContent = '';
        let sourceFormat = req.body.sourceFormat || 'html';
        let markdownContent = '';
        let cssSettings = null;

        if (!name || !String(name).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Template name is required',
            });
        }

        if (!subject || !String(subject).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Email subject is required',
            });
        }

        // 1. Direct HTML content in request body (AI Generator, HTML Composer, or Raw HTML paste)
        if (req.body.htmlContent != null || req.body.content != null || req.body.html != null) {
            htmlContent = String(req.body.htmlContent ?? req.body.content ?? req.body.html ?? '');
            sourceFormat = req.body.sourceFormat || 'html';
        }
        // 2. Markdown path: body has sourceFormat === 'markdown' or markdownContent provided
        else if (req.body.sourceFormat === 'markdown' || req.body.markdownContent != null) {
            sourceFormat = 'markdown';
            markdownContent = String(req.body.markdownContent || '');
            cssSettings = parseCssSettingsFromBody(req.body);

            const rawHtml = await convertMarkdownToHtml(markdownContent);
            htmlContent = applyCssSettings(rawHtml || '<p></p>', cssSettings);
        }
        // 3. File upload path (multipart file upload of .html or .eml)
        else if (req.file) {
            const filePath = req.file.path || path.join(__dirname, '..', 'uploads', req.file.filename);

            try {
                htmlContent = fs.readFileSync(filePath, 'utf-8');
                sourceFormat = req.file.originalname?.endsWith('.eml') ? 'raw_eml' : 'html';
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: error.message,
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Template content cannot be empty. Provide htmlContent, markdownContent, or upload an HTML file.',
            });
        }

        const HTMLErrors = await validateHTMLContent(htmlContent);
        if (HTMLErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: HTMLErrors.join(', '),
            });
        }

        const template = new Template({
            name: String(name).trim(),
            subject: String(subject).trim(),
            type: String(type).trim(),
            category: category ? String(category).trim() : 'IT & Security',
            difficulty: Number(difficulty) || 3,
            tags: Array.isArray(tags) ? tags : (tags ? [String(tags)] : ['Phishing Drill']),
            htmlContent,
            sourceFormat,
            markdownContent: sourceFormat === 'markdown' ? markdownContent : undefined,
            cssSettings: sourceFormat === 'markdown' ? cssSettings : undefined,
        });

        await template.save();

        res.status(201).json({
            success: true,
            message: 'Email template created successfully',
            data: template
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// Get all templates
export const getAllTemplates = async (req, res) => {
    try {
        const templates = await Template.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: templates
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get templates list with optional search and pagination (for Saved list UI)
export const getTemplateList = async (req, res) => {
    try {
        const search = (req.query.search || '').trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page, 10) || 15));

        const query = {};
        if (search) {
            const escaped = escapeRegex(search);
            query.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { subject: { $regex: escaped, $options: 'i' } },
                { type: { $regex: escaped, $options: 'i' } },
            ];
        }

        const total = await Template.countDocuments(query);
        const lastPage = Math.max(1, Math.ceil(total / perPage));
        const skip = (page - 1) * perPage;
        const templates = await Template.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .lean();

        const from = total === 0 ? null : skip + 1;
        const to = total === 0 ? null : Math.min(skip + perPage, total);

        res.status(200).json({
            success: true,
            data: {
                templates,
                pagination: {
                    current_page: page,
                    last_page: lastPage,
                    per_page: perPage,
                    total,
                    from,
                    to,
                },
                filters: { search },
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// Get a specific template by ID
export const getTemplateById = async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        res.status(200).json({
            success: true,
            data: template
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update a template
export const updateTemplate = async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found',
            });
        }

        const updatedData = {
            name: req.body.name != null ? String(req.body.name).trim() : template.name,
            subject: req.body.subject != null ? String(req.body.subject).trim() : template.subject,
            category: req.body.category != null ? String(req.body.category).trim() : template.category,
            type: req.body.type != null ? String(req.body.type).trim() : template.type,
            difficulty: req.body.difficulty !== undefined ? Number(req.body.difficulty) : template.difficulty,
            tags: req.body.tags != null ? (Array.isArray(req.body.tags) ? req.body.tags : [String(req.body.tags)]) : template.tags,
        };

        if (req.file) {
            const filePath = req.file.path || path.join(__dirname, '..', 'uploads', req.file.filename);
            try {
                updatedData.htmlContent = fs.readFileSync(filePath, 'utf-8');
                updatedData.sourceFormat = req.file.originalname?.endsWith('.eml') ? 'raw_eml' : 'html';
                updatedData.markdownContent = '';
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
        } else if (req.body.htmlContent != null || req.body.content != null || req.body.html != null) {
            updatedData.htmlContent = String(req.body.htmlContent ?? req.body.content ?? req.body.html);
            updatedData.sourceFormat = req.body.sourceFormat || 'html';
            updatedData.markdownContent = '';
        } else if (req.body.markdownContent != null && String(req.body.markdownContent).trim() !== '') {
            const markdownContent = String(req.body.markdownContent);
            const cssSettings = parseCssSettingsFromBody(req.body);
            const rawHtml = await convertMarkdownToHtml(markdownContent);
            updatedData.htmlContent = applyCssSettings(rawHtml || '<p></p>', cssSettings);
            updatedData.sourceFormat = 'markdown';
            updatedData.markdownContent = markdownContent;
            updatedData.cssSettings = cssSettings ?? template.cssSettings;
        } else if (req.body.markdownContent != null) {
            // Explicit empty markdown from composer: clear body and keep markdown template
            const cssSettings = parseCssSettingsFromBody(req.body);
            const htmlContent = applyCssSettings('<p></p>', cssSettings ?? template.cssSettings);
            updatedData.htmlContent = htmlContent;
            updatedData.sourceFormat = 'markdown';
            updatedData.markdownContent = '';
            updatedData.cssSettings = cssSettings ?? template.cssSettings;
        } else {
            updatedData.htmlContent = template.htmlContent;
        }

        const updatedTemplate = await Template.findByIdAndUpdate(
            req.params.id,
            updatedData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: updatedTemplate,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete a template
export const deleteTemplate = async (req, res) => {
    try {
        const template = await Template.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Template deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Generate an AI-powered threat scenario template
export const generateAITemplate = async (req, res) => {
    try {
        const { targetAudience, category, difficulty, scenarioPrompt, companyName, tone, selectedModel } = req.body;
        const { generateThreatScenario } = await import('../services/aiIntegrationService.js');
        const scenario = await generateThreatScenario({
            targetAudience,
            category,
            difficulty,
            scenarioPrompt,
            companyName,
            tone,
            selectedModel,
        });

        res.status(200).json({
            success: true,
            message: 'AI threat scenario generated successfully',
            data: scenario,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

