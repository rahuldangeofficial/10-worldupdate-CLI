#!/usr/bin/env node

import { Command } from 'commander';
import { run } from '../src/index.js';

const program = new Command();

program
  .name('worldupdate')
  .description('Crawl 20+ tech/hacker news sources and get AI-filtered impactful news')
  .version('1.0.0')
  .option('-s, --sources <list>', 'Comma-separated sources to include (e.g., hackernews,reddit,github)')
  .option('-l, --limit <number>', 'Maximum number of items to show', '15')
  .option('-r, --raw', 'Skip LLM filtering and show raw results')
  .option('-c, --category <category>', 'Filter by category: security, ai, dev, all', 'all')
  .option('-v, --verbose', 'Show detailed source information')
  .option('-d, --digest', 'Weekly digest mode: summarize major themes and must-know items')
  .option('--list-sources', 'List all available sources')
  .action(async (options) => {
    try {
      await run(options);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
