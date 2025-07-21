import { DependencyGraphManager } from '../src/core/dependency-graph';
import { ConflictType } from '../src/types';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DependencyGraphManager', () => {
  let tempDir: string;
  let depGraph: DependencyGraphManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'knit-test-'));
    depGraph = new DependencyGraphManager(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should initialize .knit directory structure', async () => {
      await depGraph.initialize();

      const knitDir = path.join(tempDir, '.knit');
      const configFile = path.join(knitDir, 'config.json');
      const dependenciesFile = path.join(knitDir, 'dependencies.json');

      expect(await fs.access(knitDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(configFile).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(dependenciesFile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should create default configuration', async () => {
      await depGraph.initialize();

      const configFile = path.join(tempDir, '.knit', 'config.json');
      const config = JSON.parse(await fs.readFile(configFile, 'utf-8'));

      expect(config).toHaveProperty('autoApplyThreshold');
      expect(config).toHaveProperty('llm');
      expect(config).toHaveProperty('git');
      expect(config).toHaveProperty('ignore');
    });
  });

  describe('dependency management', () => {
    beforeEach(async () => {
      await depGraph.initialize();
      await depGraph.load();
    });

    it('should add dependency relationships', async () => {
      await depGraph.addDependency('source.md', 'target.ts');

      const dependencies = depGraph.getAllDependencies();
      expect(dependencies['source.md'].watches).toContain('target.ts');
      expect(dependencies['target.ts'].watchedBy).toContain('source.md');
    });

    it('should remove dependency relationships', async () => {
      await depGraph.addDependency('source.md', 'target.ts');
      await depGraph.removeDependency('source.md', 'target.ts');

      const dependencies = depGraph.getAllDependencies();
      expect(dependencies['source.md']?.watches || []).not.toContain('target.ts');
      expect(dependencies['target.ts']?.watchedBy || []).not.toContain('source.md');
    });

    it('should get dependent files', async () => {
      await depGraph.addDependency('source.md', 'target.ts');
      
      const dependents = depGraph.getDependentFiles('target.ts');
      expect(dependents).toContain('source.md');
    });

    it('should detect dependency cycles', async () => {
      await depGraph.addDependency('a.md', 'b.ts');
      await depGraph.addDependency('b.ts', 'c.js');
      await depGraph.addDependency('c.js', 'a.md');

      const cycles = depGraph.hasCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('reconciliation rules', () => {
    beforeEach(async () => {
      await depGraph.initialize();
      await depGraph.load();
    });

    it('should store and retrieve reconciliation rules', async () => {
      const rules = {
        autoApplyThreshold: 0.9,
        requireReview: [ConflictType.REVIEW_REQUIRED]
      };

      await depGraph.addDependency('source.md', 'target.ts', rules);
      
      const storedRules = depGraph.getReconciliationRules('source.md');
      expect(storedRules?.autoApplyThreshold).toBe(0.9);
      expect(storedRules?.requireReview).toContain(ConflictType.REVIEW_REQUIRED);
    });
  });

  describe('hash tracking', () => {
    beforeEach(async () => {
      await depGraph.initialize();
      await depGraph.load();
    });

    it('should update and retrieve reconciled hashes', async () => {
      const testHash = 'abc123';
      
      // First add the file to the dependency graph
      await depGraph.addDependency('test.md', 'target.ts');
      await depGraph.updateReconciledHash('test.md', testHash);
      const retrievedHash = depGraph.getLastReconciledHash('test.md');
      
      expect(retrievedHash).toBe(testHash);
    });
  });

  describe('visualization', () => {
    beforeEach(async () => {
      await depGraph.initialize();
      await depGraph.load();
    });

    it('should generate dependency graph visualization', async () => {
      await depGraph.addDependency('design.md', 'implementation.ts');
      await depGraph.addDependency('implementation.ts', 'test.spec.ts');

      const visualization = depGraph.visualize();
      
      expect(visualization).toContain('design.md');
      expect(visualization).toContain('implementation.ts');
      expect(visualization).toContain('→');
    });
  });
});