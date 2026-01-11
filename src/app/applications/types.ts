/**
 * Application Schema
 * 
 * Represents an application deployed in the infrastructure
 */
export interface Application {
    /** Unique identifier */
    id: string;

    /** Name of the application */
    name: string;

    /** Location of the app in the server (file path) */
    location: string;

    /** Programming language or framework used */
    language: string;

    /** Repository URL (GitHub or other) - Optional */
    repository?: string;

    /** Network access ports - Array of port strings (e.g., ["8080", "3000:80"]) */
    networkAccess?: string[];

    /** Commands for managing the application - Key-value pairs */
    commands?: Record<string, string>;

    /** Additional information stored as JSON */
    information?: Record<string, any>;

    /** Owner user ID */
    owner: string;

    /** Creation timestamp */
    createdAt?: string;

    /** Last update timestamp */
    updatedAt?: string;
}

/**
 * Application creation data (without auto-generated fields)
 */
export type CreateApplicationData = Omit<Application, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Application update data (all fields optional except id)
 */
export type UpdateApplicationData = Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>;
