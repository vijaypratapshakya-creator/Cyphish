/**
 * Supported email template placeholder variables
 */
export const SUPPORTED_PLACEHOLDERS = [
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'role',
  'country',
  'link',
  'reportLink',
  'trackingUrl',
  'department',
  'ou',
  'team',
  'company',
  // GoPhish-compatible placeholders
  '.FirstName',
  '.LastName',
  '.Email',
  '.URL',
  '.TrackingURL',
  '.Department',
  '.Company',
];

/**
 * Validate HTML content for templates without breaking on complex email tables, styles, or Outlook tags
 */
export const validateHTMLContent = async (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
    return ['Template content cannot be empty.'];
  }
  // Allow all standard and complex email HTML
  return [];
};

/**
 * Validate double-curly placeholder variables without failing on CSS { ... }
 */
export const validatePlaceholders = (htmlContent, supportedFields = SUPPORTED_PLACEHOLDERS) => {
  // Matches only {{ variableName }} or {{ .VariableName }}
  const placeholderRegex = /{{\s*([a-zA-Z0-9_.]+)\s*}}/g;
  const errors = [];
  let match;

  while ((match = placeholderRegex.exec(htmlContent)) !== null) {
    const fieldName = match[1].trim();
    if (!supportedFields.includes(fieldName)) {
      // Non-blocking warning or allow custom variable
    }
  }

  return errors;
};

/** Allowed keys for cssSettings */
const ALLOWED_CSS_KEYS = ['fontFamily', 'fontSize', 'primaryColor'];

export const sanitizeCssSettings = (cssSettings) => {
  if (cssSettings == null || typeof cssSettings !== 'object') return null;
  const out = {};
  let hasAny = false;
  for (const key of ALLOWED_CSS_KEYS) {
    if (cssSettings[key] != null && typeof cssSettings[key] === 'string') {
      const v = String(cssSettings[key]).trim();
      if (v.length > 0 && v.length < 500) {
        out[key] = v;
        hasAny = true;
      }
    }
  }
  return hasAny ? out : null;
};
