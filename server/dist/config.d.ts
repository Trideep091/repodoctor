import { AppSettings } from './types/index.js';
export declare const PORT: number;
export declare const DEFAULT_SETTINGS: AppSettings;
export declare function getSettings(): AppSettings;
export declare function updateSettings(newSettings: Partial<AppSettings>): AppSettings;
