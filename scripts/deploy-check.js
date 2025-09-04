#!/usr/bin/env node

/**
 * Pre-deployment check script
 * Validates that the project is ready for Render deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔍 Checking project readiness for Render deployment...\n');

let checks = 0;
let passed = 0;

function check(name, condition, message) {
  checks++;
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}: ${message}`);
  }
}

// Check required files exist
check(
  'render.yaml exists',
  fs.existsSync(path.join(rootDir, 'render.yaml')),
  'render.yaml blueprint file is missing'
);

check(
  'render.yaml follows best practices',
  (() => {
    try {
      const renderYaml = fs.readFileSync(path.join(rootDir, 'render.yaml'), 'utf8');
      return renderYaml.includes('rootDir') && 
             renderYaml.includes('buildFilter') && 
             renderYaml.includes('npm ci') &&
             renderYaml.includes('runtime: static');
    } catch (e) {
      return false;
    }
  })(),
  'render.yaml missing rootDir, buildFilter, or other best practices'
);

check(
  'API package.json has start script',
  (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'api', 'package.json'), 'utf8'));
      return pkg.scripts && pkg.scripts.start;
    } catch (e) {
      return false;
    }
  })(),
  'api/package.json missing start script'
);

check(
  'API has Node.js version specified',
  (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'api', 'package.json'), 'utf8'));
      return pkg.engines && pkg.engines.node;
    } catch (e) {
      return false;
    }
  })(),
  'api/package.json missing engines.node specification'
);

check(
  'Web package.json has build script',
  (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'web', 'package.json'), 'utf8'));
      return pkg.scripts && pkg.scripts.build;
    } catch (e) {
      return false;
    }
  })(),
  'web/package.json missing build script'
);

check(
  'API server has health check endpoint',
  (() => {
    try {
      const serverFile = fs.readFileSync(path.join(rootDir, 'api', 'config', 'server.js'), 'utf8');
      return serverFile.includes('/health') && serverFile.includes('pool.query');
    } catch (e) {
      return false;
    }
  })(),
  'API server missing /health endpoint'
);

check(
  'API uses PORT environment variable',
  (() => {
    try {
      const serverFile = fs.readFileSync(path.join(rootDir, 'api', 'config', 'server.js'), 'utf8');
      return serverFile.includes('process.env.PORT');
    } catch (e) {
      return false;
    }
  })(),
  'API server not configured to use PORT environment variable'
);

check(
  'Database configured for DATABASE_URL',
  (() => {
    try {
      const dbFile = fs.readFileSync(path.join(rootDir, 'api', 'config', 'database.js'), 'utf8');
      return dbFile.includes('DATABASE_URL') && dbFile.includes('connectionString');
    } catch (e) {
      return false;
    }
  })(),
  'Database not configured to use DATABASE_URL'
);

check(
  'Frontend API uses environment variable',
  (() => {
    try {
      const apiFile = fs.readFileSync(path.join(rootDir, 'web', 'src', 'utils', 'api.js'), 'utf8');
      return apiFile.includes('VITE_API_URL') && apiFile.includes('import.meta.env');
    } catch (e) {
      return false;
    }
  })(),
  'Frontend API not configured to use VITE_API_URL environment variable'
);

console.log(`\n📊 Results: ${passed}/${checks} checks passed\n`);

if (passed === checks) {
  console.log('🎉 Project is ready for Render deployment!');
  console.log('\nNext steps:');
  console.log('1. Push your code to GitHub/GitLab');
  console.log('2. Go to Render Dashboard > New > Blueprint');
  console.log('3. Connect your repository');
  console.log('4. Review and deploy the services');
  console.log('5. Configure any required environment variables');
  console.log('\nSee RENDER_DEPLOYMENT.md for detailed instructions.');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above before deploying.');
  process.exit(1);
}
