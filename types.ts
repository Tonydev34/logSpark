
export type ReleaseCategory = 'features' | 'fixes' | 'improvements' | 'breaking';

export type TemplateType = 'standard' | 'marketing' | 'technical' | 'minimal';

export type AppView = 'home' | 'generator' | 'pricing' | 'privacy' | 'contact' | 'about' | 'disclaimer';

export interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  provider: 'github' | 'google';
}

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  stargazers_count?: number;
}

export interface ChangelogInput {
  version: string;
  date: string;
  template: TemplateType;
  entries: {
    category: ReleaseCategory;
    content: string;
  }[];
}

export interface GeneratedChangelog {
  markdown: string;
  html: string;
  plainText: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
}
