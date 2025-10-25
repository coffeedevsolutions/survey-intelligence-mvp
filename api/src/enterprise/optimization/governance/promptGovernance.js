/**
 * Prompt Governance System
 * 
 * Implements versioned prompt packs, evaluation gates, and canary deployments
 * for AI prompt management and quality control
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { validateAIResponse } from '../../../platform/ai/validators/aiResponseValidator.js';

// Prompt governance configuration
const GOVERNANCE_CONFIG = {
  promptDir: 'api/prompts',
  versionFormat: 'v{MAJOR}.{MINOR}.{PATCH}',
  evaluationThreshold: 0.85, // 85% pass rate required
  canaryPercentage: 0.1, // 10% traffic for canary
  maxVersions: 10, // Keep last 10 versions
  evaluationTimeout: 30000, // 30 seconds
};

/**
 * Prompt Version Class
 */
export class PromptVersion {
  constructor(version, content, metadata = {}) {
    this.version = version;
    this.content = content;
    this.metadata = {
      createdAt: new Date().toISOString(),
      author: metadata.author || 'system',
      description: metadata.description || '',
      tags: metadata.tags || [],
      evaluationResults: null,
      canaryStatus: 'disabled',
      ...metadata
    };
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto.createHash('sha256')
      .update(this.content + this.version)
      .digest('hex')
      .substring(0, 16);
  }

  toJSON() {
    return {
      version: this.version,
      content: this.content,
      metadata: this.metadata,
      hash: this.hash
    };
  }

  static fromJSON(data) {
    const version = new PromptVersion(data.version, data.content, data.metadata);
    version.hash = data.hash;
    return version;
  }
}

/**
 * Prompt Pack Class
 */
export class PromptPack {
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
    this.versions = new Map();
    this.currentVersion = null;
    this.canaryVersion = null;
    this.evaluationTests = [];
    this.createdAt = new Date().toISOString();
  }

  /**
   * Add a new version
   */
  addVersion(version, content, metadata = {}) {
    const promptVersion = new PromptVersion(version, content, metadata);
    this.versions.set(version, promptVersion);
    
    // Set as current if it's the first version
    if (!this.currentVersion) {
      this.currentVersion = version;
    }
    
    return promptVersion;
  }

  /**
   * Get version content
   */
  getVersion(version = null) {
    const targetVersion = version || this.currentVersion;
    const promptVersion = this.versions.get(targetVersion);
    return promptVersion ? promptVersion.content : null;
  }

  /**
   * Get version metadata
   */
  getVersionMetadata(version = null) {
    const targetVersion = version || this.currentVersion;
    const promptVersion = this.versions.get(targetVersion);
    return promptVersion ? promptVersion.metadata : null;
  }

  /**
   * Promote version to current
   */
  promoteVersion(version) {
    if (!this.versions.has(version)) {
      throw new Error(`Version ${version} not found`);
    }
    
    this.currentVersion = version;
    this.canaryVersion = null;
    
    // Update metadata
    const promptVersion = this.versions.get(version);
    promptVersion.metadata.canaryStatus = 'promoted';
    promptVersion.metadata.promotedAt = new Date().toISOString();
  }

  /**
   * Set canary version
   */
  setCanaryVersion(version) {
    if (!this.versions.has(version)) {
      throw new Error(`Version ${version} not found`);
    }
    
    this.canaryVersion = version;
    
    // Update metadata
    const promptVersion = this.versions.get(version);
    promptVersion.metadata.canaryStatus = 'canary';
    promptVersion.metadata.canaryStartedAt = new Date().toISOString();
  }

  /**
   * Get available versions
   */
  getVersions() {
    return Array.from(this.versions.keys()).sort((a, b) => {
      // Simple version comparison (assumes semantic versioning)
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        
        if (aPart !== bPart) {
          return bPart - aPart; // Descending order
        }
      }
      
      return 0;
    });
  }

  /**
   * Clean up old versions
   */
  cleanupOldVersions(maxVersions = GOVERNANCE_CONFIG.maxVersions) {
    const versions = this.getVersions();
    
    if (versions.length > maxVersions) {
      const versionsToRemove = versions.slice(maxVersions);
      
      for (const version of versionsToRemove) {
        this.versions.delete(version);
      }
      
      console.log(`🧹 [PromptPack] Cleaned up ${versionsToRemove.length} old versions from ${this.name}`);
    }
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      versions: Object.fromEntries(this.versions),
      currentVersion: this.currentVersion,
      canaryVersion: this.canaryVersion,
      evaluationTests: this.evaluationTests,
      createdAt: this.createdAt
    };
  }

  static fromJSON(data) {
    const pack = new PromptPack(data.name, data.description);
    pack.currentVersion = data.currentVersion;
    pack.canaryVersion = data.canaryVersion;
    pack.evaluationTests = data.evaluationTests || [];
    pack.createdAt = data.createdAt;
    
    // Restore versions
    for (const [version, versionData] of Object.entries(data.versions)) {
      pack.versions.set(version, PromptVersion.fromJSON(versionData));
    }
    
    return pack;
  }
}

/**
 * Evaluation Test Class
 */
export class EvaluationTest {
  constructor(name, input, expectedOutput, schema = null) {
    this.name = name;
    this.input = input;
    this.expectedOutput = expectedOutput;
    this.schema = schema;
    this.results = [];
  }

  /**
   * Run evaluation test
   */
  async runTest(aiFunction, version = null) {
    try {
      const startTime = Date.now();
      const result = await aiFunction(this.input, version);
      const duration = Date.now() - startTime;
      
      // Validate against schema if provided
      let validationResult = null;
      if (this.schema) {
        validationResult = await validateAIResponse(result, this.schema, {
          maxRetries: 1,
          enableRepair: false,
          enableFallback: false
        });
      }
      
      const testResult = {
        version: version,
        passed: this.evaluateResult(result),
        duration: duration,
        actualOutput: result,
        validationResult: validationResult,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      return testResult;
      
    } catch (error) {
      const testResult = {
        version: version,
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      return testResult;
    }
  }

  /**
   * Evaluate test result
   */
  evaluateResult(actualOutput) {
    // Simple evaluation - can be enhanced with more sophisticated logic
    if (typeof actualOutput === 'string' && typeof this.expectedOutput === 'string') {
      return actualOutput.toLowerCase().includes(this.expectedOutput.toLowerCase());
    }
    
    if (typeof actualOutput === 'object' && typeof this.expectedOutput === 'object') {
      return JSON.stringify(actualOutput) === JSON.stringify(this.expectedOutput);
    }
    
    return actualOutput === this.expectedOutput;
  }

  /**
   * Get pass rate for a version
   */
  getPassRate(version = null) {
    const relevantResults = version 
      ? this.results.filter(r => r.version === version)
      : this.results;
    
    if (relevantResults.length === 0) return 0;
    
    const passed = relevantResults.filter(r => r.passed).length;
    return passed / relevantResults.length;
  }
}

/**
 * Prompt Governance Manager
 */
export class PromptGovernanceManager {
  constructor(config = GOVERNANCE_CONFIG) {
    this.config = config;
    this.promptPacks = new Map();
    this.evaluationTests = new Map();
  }

  /**
   * Create or get prompt pack
   */
  getPromptPack(name) {
    if (!this.promptPacks.has(name)) {
      this.promptPacks.set(name, new PromptPack(name));
    }
    return this.promptPacks.get(name);
  }

  /**
   * Add evaluation test
   */
  addEvaluationTest(packName, test) {
    const pack = this.getPromptPack(packName);
    pack.evaluationTests.push(test);
    this.evaluationTests.set(`${packName}.${test.name}`, test);
  }

  /**
   * Run evaluation tests for a version
   */
  async runEvaluationTests(packName, version, aiFunction) {
    const pack = this.getPromptPack(packName);
    const tests = pack.evaluationTests;
    
    if (tests.length === 0) {
      console.warn(`⚠️ [PromptGovernance] No evaluation tests for ${packName}`);
      return { passed: true, score: 1.0, results: [] };
    }
    
    const results = [];
    let passedTests = 0;
    
    for (const test of tests) {
      try {
        const result = await test.runTest(aiFunction, version);
        results.push(result);
        
        if (result.passed) {
          passedTests++;
        }
      } catch (error) {
        console.error(`❌ [PromptGovernance] Test ${test.name} failed:`, error.message);
        results.push({
          testName: test.name,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const score = passedTests / tests.length;
    const passed = score >= this.config.evaluationThreshold;
    
    // Update version metadata
    const promptVersion = pack.versions.get(version);
    if (promptVersion) {
      promptVersion.metadata.evaluationResults = {
        score: score,
        passed: passed,
        totalTests: tests.length,
        passedTests: passedTests,
        timestamp: new Date().toISOString()
      };
    }
    
    return { passed, score, results };
  }

  /**
   * Deploy version with canary
   */
  async deployVersion(packName, version, aiFunction, options = {}) {
    const pack = this.getPromptPack(packName);
    const canaryPercentage = options.canaryPercentage || this.config.canaryPercentage;
    
    // Run evaluation tests first
    const evaluation = await this.runEvaluationTests(packName, version, aiFunction);
    
    if (!evaluation.passed) {
      throw new Error(`Evaluation failed for ${packName} v${version}: ${evaluation.score} < ${this.config.evaluationThreshold}`);
    }
    
    // Set canary version
    pack.setCanaryVersion(version);
    
    console.log(`🚀 [PromptGovernance] Deployed ${packName} v${version} as canary (${canaryPercentage * 100}% traffic)`);
    
    return {
      version: version,
      canaryPercentage: canaryPercentage,
      evaluation: evaluation
    };
  }

  /**
   * Promote canary to production
   */
  promoteCanary(packName) {
    const pack = this.getPromptPack(packName);
    
    if (!pack.canaryVersion) {
      throw new Error(`No canary version to promote for ${packName}`);
    }
    
    pack.promoteVersion(pack.canaryVersion);
    
    console.log(`✅ [PromptGovernance] Promoted ${packName} v${pack.canaryVersion} to production`);
    
    return pack.canaryVersion;
  }

  /**
   * Rollback to previous version
   */
  rollbackVersion(packName, targetVersion = null) {
    const pack = this.getPromptPack(packName);
    const versions = pack.getVersions();
    
    if (versions.length < 2) {
      throw new Error(`Cannot rollback ${packName}: only one version available`);
    }
    
    const rollbackVersion = targetVersion || versions[1]; // Second most recent
    pack.promoteVersion(rollbackVersion);
    
    console.log(`🔄 [PromptGovernance] Rolled back ${packName} to v${rollbackVersion}`);
    
    return rollbackVersion;
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(packName) {
    const pack = this.getPromptPack(packName);
    
    return {
      name: pack.name,
      currentVersion: pack.currentVersion,
      canaryVersion: pack.canaryVersion,
      totalVersions: pack.versions.size,
      availableVersions: pack.getVersions()
    };
  }

  /**
   * Save prompt packs to disk
   */
  async savePromptPacks() {
    const data = Object.fromEntries(
      Array.from(this.promptPacks.entries()).map(([name, pack]) => [name, pack.toJSON()])
    );
    
    await fs.writeFile(
      path.join(this.config.promptDir, 'prompt-packs.json'),
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Load prompt packs from disk
   */
  async loadPromptPacks() {
    try {
      const data = await fs.readFile(
        path.join(this.config.promptDir, 'prompt-packs.json'),
        'utf8'
      );
      
      const packs = JSON.parse(data);
      
      for (const [name, packData] of Object.entries(packs)) {
        this.promptPacks.set(name, PromptPack.fromJSON(packData));
      }
      
      console.log(`📦 [PromptGovernance] Loaded ${Object.keys(packs).length} prompt packs`);
    } catch (error) {
      console.warn(`⚠️ [PromptGovernance] Could not load prompt packs: ${error.message}`);
    }
  }
}

// Export default governance manager
export default {
  PromptVersion,
  PromptPack,
  EvaluationTest,
  PromptGovernanceManager
};
