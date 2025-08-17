#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const logger = require('../src/utils/logger');

class DeploymentConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  validateEnvironmentVariables() {
    logger.info('🔍 Validating environment variables...');

    // Required variables for MVP deployment
    const requiredVars = {
      'DATABASE_URL': 'PostgreSQL connection string',
      'PRIVATE_KEY': 'Deployer private key for blockchain transactions',
      'WEB3_PROVIDER_URL': 'Web3 provider URL for local development'
    };

    // Optional but recommended variables
    const recommendedVars = {
      'BASE_SEPOLIA_RPC_URL': 'Base Sepolia testnet RPC URL',
      'BASE_MAINNET_RPC_URL': 'Base mainnet RPC URL',
      'BASESCAN_API_KEY': 'Basescan API key for contract verification',
      'REDIS_URL': 'Redis connection string for rate limiting',
      'JWT_SECRET': 'JWT secret for authentication'
    };

    // MVP contract address variables (set after deployment)
    const contractVars = {
      'ACCESS_CONTROL_ADDRESS': 'AccessControl contract address',
      'PARTICIPANT_REGISTRY_ADDRESS': 'ParticipantRegistry contract address',
      'TOKEN_REGISTRY_ADDRESS': 'TokenRegistry contract address',
      'ESCROW_ADDRESS': 'Escrow contract address',
      'BATCH_LEDGER_ADDRESS': 'BatchLedger contract address',
      'DISTRIBUTOR_ADDRESS': 'Distributor contract address',
      'MOCK_USDC_ADDRESS': 'MockUSDC contract address (testnet)'
    };

    // Check required variables
    for (const [varName, description] of Object.entries(requiredVars)) {
      if (!process.env[varName]) {
        this.errors.push(`❌ Missing required environment variable: ${varName} (${description})`);
      } else {
        this.info.push(`✅ ${varName} is set`);
      }
    }

    // Check recommended variables
    for (const [varName, description] of Object.entries(recommendedVars)) {
      if (!process.env[varName]) {
        this.warnings.push(`⚠️  Missing recommended environment variable: ${varName} (${description})`);
      } else {
        this.info.push(`✅ ${varName} is set`);
      }
    }

    // Check contract addresses (informational)
    let contractsSet = 0;
    for (const [varName, description] of Object.entries(contractVars)) {
      if (process.env[varName]) {
        contractsSet++;
        this.info.push(`✅ ${varName} is set`);
      }
    }

    if (contractsSet === 0) {
      this.info.push(`ℹ️  No contract addresses set (normal for initial deployment)`);
    } else if (contractsSet < Object.keys(contractVars).length) {
      this.warnings.push(`⚠️  Only ${contractsSet}/${Object.keys(contractVars).length} contract addresses are set`);
    } else {
      this.info.push(`✅ All contract addresses are set`);
    }
  }

  validateFileStructure() {
    logger.info('🔍 Validating file structure...');

    const requiredFiles = [
      'contracts/hardhat.config.js',
      'contracts/scripts/deployMvp.js',
      'contracts/scripts/postDeployOps.js',
      'contracts/scripts/verifyAll.js',
      'package.json',
      'src/app.js',
      'src/config/database.js',
      'scripts/migrate-to-mvp.js'
    ];

    const requiredDirectories = [
      'contracts/contracts',
      'contracts/test_mvp',
      'src/services',
      'src/controllers',
      'tests/unit'
    ];

    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.info.push(`✅ Required file exists: ${file}`);
      } else {
        this.errors.push(`❌ Missing required file: ${file}`);
      }
    }

    // Check required directories
    for (const dir of requiredDirectories) {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        this.info.push(`✅ Required directory exists: ${dir}`);
      } else {
        this.errors.push(`❌ Missing required directory: ${dir}`);
      }
    }

    // Check for legacy files that should be renamed
    const legacyFiles = [
      'contracts/scripts/deployModular.js'
    ];

    for (const file of legacyFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.warnings.push(`⚠️  Legacy file exists and should be renamed: ${file} -> ${file.replace('.js', '.legacy.js')}`);
      }
    }
  }

  validatePackageJson() {
    logger.info('🔍 Validating package.json configuration...');

    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check MVP-specific scripts
      const requiredScripts = {
        'deploy': 'Default deployment (should use MVP)',
        'deploy:base-sepolia': 'Base Sepolia deployment',
        'test:contracts:mvp': 'MVP contract tests',
        'migrate:mvp': 'MVP database migration',
        'setup:mvp': 'MVP setup',
        'test:mvp': 'MVP test suite'
      };

      for (const [script, description] of Object.entries(requiredScripts)) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.info.push(`✅ Script exists: ${script} (${description})`);
          
          // Validate script content
          if (script === 'deploy' && packageJson.scripts[script].includes('deployMvp.js')) {
            this.info.push(`✅ Default deploy script uses MVP deployment`);
          } else if (script === 'deploy' && packageJson.scripts[script].includes('deployModular.js')) {
            this.warnings.push(`⚠️  Default deploy script still uses legacy deployment`);
          }
        } else {
          this.errors.push(`❌ Missing required script: ${script} (${description})`);
        }
      }

      // Check dependencies
      const requiredDeps = [
        '@openzeppelin/contracts-upgradeable',
        'express',
        'pg',
        'redis'
      ];

      for (const dep of requiredDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.info.push(`✅ Dependency exists: ${dep}`);
        } else {
          this.errors.push(`❌ Missing required dependency: ${dep}`);
        }
      }

    } catch (error) {
      this.errors.push(`❌ Error reading package.json: ${error.message}`);
    }
  }

  validateHardhatConfig() {
    logger.info('🔍 Validating Hardhat configuration...');

    try {
      const configPath = path.join(process.cwd(), 'contracts/hardhat.config.js');
      const configContent = fs.readFileSync(configPath, 'utf8');

      // Check Solidity version
      if (configContent.includes('0.8.25')) {
        this.info.push(`✅ Hardhat config uses correct Solidity version (0.8.25)`);
      } else {
        this.warnings.push(`⚠️  Hardhat config may not use correct Solidity version (should be 0.8.25)`);
      }

      // Check network configurations
      const requiredNetworks = ['baseSepolia', 'base', 'hardhat', 'localhost'];
      for (const network of requiredNetworks) {
        if (configContent.includes(network)) {
          this.info.push(`✅ Network configuration exists: ${network}`);
        } else {
          this.warnings.push(`⚠️  Missing network configuration: ${network}`);
        }
      }

      // Check etherscan configuration
      if (configContent.includes('etherscan')) {
        this.info.push(`✅ Etherscan configuration exists for contract verification`);
      } else {
        this.warnings.push(`⚠️  Missing Etherscan configuration for contract verification`);
      }

    } catch (error) {
      this.errors.push(`❌ Error reading hardhat.config.js: ${error.message}`);
    }
  }

  validateMVPContracts() {
    logger.info('🔍 Validating MVP contract files...');

    const mvpContracts = [
      'AccessControl.sol',
      'AccessControlRoles.sol',
      'ParticipantRegistry.sol',
      'TokenRegistry.sol',
      'Escrow.sol',
      'BatchLedger.sol',
      'Distributor.sol',
      'PlatformTimelock.sol',
      'ProxyImporter.sol',
      'MockUSDC.sol'
    ];

    const contractsDir = path.join(process.cwd(), 'contracts/contracts');

    for (const contract of mvpContracts) {
      const contractPath = path.join(contractsDir, contract);
      if (fs.existsSync(contractPath)) {
        this.info.push(`✅ MVP contract exists: ${contract}`);
      } else {
        this.errors.push(`❌ Missing MVP contract: ${contract}`);
      }
    }

    // Check for legacy contracts that should be removed
    const legacyContracts = [
      'AdChainPlatform.sol',
      'ChargeManager.sol',
      'AdTransactionRecorder.sol',
      'RevenueDistributor.sol',
      'PublisherRegistry.sol',
      'AdvertiserRegistry.sol',
      'AISearcherRegistry.sol',
      'PrepaymentManager.sol'
    ];

    for (const contract of legacyContracts) {
      const contractPath = path.join(contractsDir, contract);
      if (fs.existsSync(contractPath)) {
        this.warnings.push(`⚠️  Legacy contract still exists: ${contract} (should be removed)`);
      }
    }
  }

  generateReport() {
    logger.info('\n📊 Deployment Configuration Validation Report');
    logger.info('=' .repeat(50));

    if (this.errors.length > 0) {
      logger.error('\n❌ ERRORS (Must be fixed before deployment):');
      this.errors.forEach(error => logger.error(`   ${error}`));
    }

    if (this.warnings.length > 0) {
      logger.warn('\n⚠️  WARNINGS (Recommended to fix):');
      this.warnings.forEach(warning => logger.warn(`   ${warning}`));
    }

    if (this.info.length > 0) {
      logger.info('\n✅ PASSED CHECKS:');
      this.info.forEach(info => logger.info(`   ${info}`));
    }

    logger.info('\n📋 SUMMARY:');
    logger.info(`   ✅ Passed: ${this.info.length}`);
    logger.info(`   ⚠️  Warnings: ${this.warnings.length}`);
    logger.info(`   ❌ Errors: ${this.errors.length}`);

    if (this.errors.length === 0) {
      logger.info('\n🎉 Configuration validation passed! Ready for deployment.');
      logger.info('\n🚀 Next steps:');
      logger.info('   1. npm run deploy:hardhat (local testing)');
      logger.info('   2. npm run deploy:base-sepolia (testnet)');
      logger.info('   3. npm run post-deploy:base-sepolia');
      logger.info('   4. npm run verify:base-sepolia');
    } else {
      logger.error('\n❌ Configuration validation failed. Please fix errors before deployment.');
      return false;
    }

    return true;
  }

  async run() {
    logger.info('🔧 Starting deployment configuration validation...\n');

    this.validateEnvironmentVariables();
    this.validateFileStructure();
    this.validatePackageJson();
    this.validateHardhatConfig();
    this.validateMVPContracts();

    return this.generateReport();
  }
}

async function main() {
  try {
    const validator = new DeploymentConfigValidator();
    const success = await validator.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logger.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DeploymentConfigValidator };
