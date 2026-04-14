// Application types and interfaces
export type Application = {
  id: string;
  name: string;
  appIcon?: string;
  location: string;
  language: string;
  repository?: string;
  networkAccess?: string[];
  commands?: Record<string, string>;
  information?: Record<string, any>;
  owner: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateApplicationData = Omit<Application, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateApplicationData = Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>;
