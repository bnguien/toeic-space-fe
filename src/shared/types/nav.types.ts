export interface NavSubItem {
  key: string;
  label: string;
  path: string;
  badge?: string | number;
}

export interface NavSection {
  key: string;
  label: string;
  icon: string;
  path?: string;
  children?: NavSubItem[];
}
