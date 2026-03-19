export type LoreActionKind = 'navigate' | 'open_external' | 'run_operation';
export type LoreDataSourceKind = 'model' | 'config' | 'view';

export interface LoreCompilerConfig {
  compilerVersion?: string;
  permissionModelRef?: string;
  permissions?: {
    pages?: Record<string, string[]>;
    actions?: Record<string, string[]>;
    dataSources?: Record<string, string[]>;
  };
  navigation?: {
    homePageId?: string;
    labels?: Record<string, string>;
    groups?: Record<string, string>;
    order?: Record<string, number>;
  };
}

export interface DataSourceIR {
  id: string;
  sourceName: string;
  sourceDocId: string;
  sourceDocName: string;
  kind: LoreDataSourceKind;
  requiredPermissions: string[];
}

export interface ActionIR {
  id: string;
  kind: LoreActionKind;
  label: string;
  target: string;
  requiredPermissions: string[];
}

export interface PageIR {
  pageId: string;
  route: string;
  title: string;
  navLabel: string;
  sourceDocId: string;
  sourcePath: string;
  renderable: true;
  displaySource: string;
  requiredPermissions: string[];
  dataSources: DataSourceIR[];
  actions: ActionIR[];
}

export interface NavigationItemIR {
  pageId: string;
  route: string;
  title: string;
  group: string;
  order: number;
  requiredPermissions: string[];
}

export interface SiteManifest {
  siteId: string;
  workspaceRoot: string;
  compilerVersion: string;
  sourceHash: string;
  permissionModelRef?: string;
  pages: PageIR[];
  navigation: {
    homePageId?: string;
    sidebar: NavigationItemIR[];
    sitemap: NavigationItemIR[];
  };
}
