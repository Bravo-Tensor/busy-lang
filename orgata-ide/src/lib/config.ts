export const config = {
  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'openai', // 'openai' | 'anthropic'
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  },

  // Business Process Configuration
  business: {
    defaultTimeZone: process.env.DEFAULT_TIMEZONE || 'UTC',
    workingHoursStart: process.env.WORKING_HOURS_START || '09:00',
    workingHoursEnd: process.env.WORKING_HOURS_END || '17:00',
    workingDays: process.env.WORKING_DAYS?.split(',') || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },

  // Knit Integration
  knit: {
    enabled: process.env.KNIT_ENABLED !== 'false',
    autoReconcile: process.env.KNIT_AUTO_RECONCILE === 'true',
    reconciliationThreshold: parseFloat(process.env.KNIT_THRESHOLD || '0.8'),
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'file:./orgata-ide.db',
  },

  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT || '3002'),
    path: process.env.WS_PATH || '/api/ws',
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'orgata-ide-secret-key',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600'), // 1 hour
  },

  // Feature Flags
  features: {
    realTimeProcessing: process.env.FEATURE_REALTIME !== 'false',
    businessIntelligence: process.env.FEATURE_BI !== 'false',
    multiTenant: process.env.FEATURE_MULTITENANT === 'true',
    advancedAnalytics: process.env.FEATURE_ANALYTICS !== 'false',
  },

  // Application Configuration
  app: {
    name: 'Orgata IDE',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001'),
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // File System Configuration
  fileSystem: {
    businessDirectory: process.env.BUSINESS_DIR || './businesses',
    templatesDirectory: process.env.TEMPLATES_DIR || './templates',
    tempDirectory: process.env.TEMP_DIR || './temp',
  },

  // Performance Configuration
  performance: {
    maxConcurrentProcesses: parseInt(process.env.MAX_CONCURRENT_PROCESSES || '10'),
    processTimeout: parseInt(process.env.PROCESS_TIMEOUT || '300000'), // 5 minutes
    cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300'), // 5 minutes
  },

  // Validation
  validation: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['.busy', '.yaml', '.yml', '.json'],
    maxProcessSteps: parseInt(process.env.MAX_PROCESS_STEPS || '100'),
  },
};

// Configuration validation
export function validateConfig() {
  const errors: string[] = [];

  if (!config.ai.apiKey) {
    errors.push('AI_API_KEY is required');
  }

  if (config.ai.provider !== 'openai' && config.ai.provider !== 'anthropic') {
    errors.push('AI_PROVIDER must be either "openai" or "anthropic"');
  }

  if (config.performance.maxConcurrentProcesses < 1) {
    errors.push('MAX_CONCURRENT_PROCESSES must be at least 1');
  }

  if (config.performance.processTimeout < 1000) {
    errors.push('PROCESS_TIMEOUT must be at least 1000ms');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Environment-specific configurations
export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';
export const isTest = config.app.environment === 'test';

// Feature checking utilities
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature];
}

// Logging configuration
export const logConfig = {
  level: config.app.logLevel,
  format: isDevelopment ? 'dev' : 'combined',
  timestamp: true,
  colorize: isDevelopment,
};

export default config;