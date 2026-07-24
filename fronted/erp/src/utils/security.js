/**
 * Security utilities for input validation, sanitization, and XSS prevention
 */

// HTML entity encoding to prevent XSS
export const escapeHtml = (str) => {
    if (typeof str !== "string") return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// Remove potential script injections
export const sanitizeInput = (input) => {
    if (typeof input !== "string") return input;
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .trim();
};

// Sanitize object recursively
export const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") return sanitizeInput(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === "object") {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[sanitizeInput(key)] = sanitizeObject(value);
        }
        return sanitized;
    }
    return obj;
};

// Validate email format
export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Validate Mexican phone number
export const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10 || cleaned.length === 12;
};

// Validate Mexican RFC
export const isValidRfc = (rfc) => {
    const regex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
    return regex.test(rfc);
};

// Validate CURP
export const isValidCurp = (curp) => {
    const regex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;
    return regex.test(curp);
};

// Validate positive number
export const isValidAmount = (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0;
};

// Generate secure random ID
export const generateSecureId = (length = 16) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (x) => chars[x % chars.length]).join("");
};

// Generate session ID
export const generateSessionId = () => {
    return `${Date.now()}-${generateSecureId(12)}`;
};

// Get device fingerprint for session tracking
export const getDeviceFingerprint = () => {
    const nav = window.navigator;
    const screen = window.screen;
    return {
        userAgent: nav.userAgent,
        language: nav.language,
        platform: nav.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: Date.now()
    };
};

// Check if running in secure context
export const isSecureContext = () => {
    return window.isSecureContext || window.location.protocol === "https:";
};

// Rate limiting helper (client-side)
const rateLimitMap = new Map();

export const checkRateLimit = (action, maxAttempts = 5, windowMs = 60000) => {
    const now = Date.now();
    const key = action;

    if (!rateLimitMap.has(key)) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remainingAttempts: maxAttempts - 1 };
    }

    const record = rateLimitMap.get(key);

    if (now > record.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remainingAttempts: maxAttempts - 1 };
    }

    if (record.count >= maxAttempts) {
        return {
            allowed: false,
            remainingAttempts: 0,
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        };
    }

    record.count++;
    return { allowed: true, remainingAttempts: maxAttempts - record.count };
};

// Password strength checker
export const checkPasswordStrength = (password) => {
    const checks = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
        ...checks,
        score,
        strength: score < 2 ? "weak" : score < 4 ? "medium" : "strong"
    };
};

// Detect suspicious patterns
export const detectSuspiciousActivity = (action, data) => {
    const suspicious = [];

    // Check for SQL injection patterns
    const sqlPatterns = /('|--|;|\/\*|\*\/|xp_|exec|execute|insert|select|delete|update|drop|create|alter)/i;
    if (typeof data === "string" && sqlPatterns.test(data)) {
        suspicious.push("sql_injection_attempt");
    }

    // Check for excessive data size
    if (JSON.stringify(data).length > 100000) {
        suspicious.push("excessive_data_size");
    }

    return suspicious;
};
