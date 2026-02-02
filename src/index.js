import ora from 'ora';
import chalk from 'chalk';
import { getEnabledSources, listSources, config } from './config.js';
import { fetchAllSources } from './crawlers/index.js';
import { analyzeNews, analyzeDigest, deduplicateNews } from './llm/analyzer.js';
import { formatNews, formatDigest, formatSourceList, formatWarning, formatInfo } from './output/formatter.js';

export async function run(options) {
    // Handle --list-sources
    if (options.listSources) {
        formatSourceList(listSources());
        process.exit(0);
    }

    const limit = parseInt(options.limit) || config.defaults.limit;
    const verbose = options.verbose || false;
    const skipLLM = options.raw || false;
    const digestMode = options.digest || false;

    // Get enabled sources based on filters
    const enabledSources = getEnabledSources(options.sources, options.category);

    if (enabledSources.length === 0) {
        formatWarning('No sources enabled. Use --list-sources to see available sources.');
        process.exit(1);
    }

    console.log();

    // Step 1: Fetch from all sources
    let spinner;
    if (!verbose) {
        spinner = ora({
            text: digestMode
                ? `Crawling ${enabledSources.length} sources for weekly digest...`
                : `Crawling ${enabledSources.length} sources...`,
            color: 'cyan',
            spinner: 'dots',
        }).start();
    } else {
        console.log(chalk.cyan('  Fetching from sources:\n'));
    }

    const { items, errors, successCount, totalSources } = await fetchAllSources(
        enabledSources,
        verbose,
        (msg) => console.log(msg)
    );

    if (!verbose && spinner) {
        if (items.length > 0) {
            spinner.succeed(`Fetched ${items.length} items (${successCount}/${totalSources} sources)`);
        } else {
            spinner.fail('No items fetched');
        }
    } else if (verbose) {
        console.log(chalk.gray(`\n  Total: ${items.length} items from ${successCount}/${totalSources} sources`));
    }

    if (items.length === 0) {
        formatWarning('No items fetched. Check your network connection.');
        process.exit(1);
    }

    // Step 2: Deduplicate
    if (!verbose) {
        spinner = ora('Removing duplicates...').start();
    }

    const uniqueItems = await deduplicateNews(items);
    const dupeCount = items.length - uniqueItems.length;

    if (!verbose && spinner) {
        spinner.succeed(`${uniqueItems.length} unique items (${dupeCount} duplicates removed)`);
    } else if (verbose) {
        formatInfo(`Deduplicated: ${uniqueItems.length} unique (removed ${dupeCount})`);
    }

    // Step 3: LLM Analysis
    if (skipLLM) {
        const finalItems = uniqueItems.slice(0, limit).map(item => ({
            ...item,
            impact: 'NOTABLE',
            insight: null,
        }));
        formatInfo('Skipping LLM analysis (--raw mode)');
        formatNews(finalItems, verbose);
        process.exit(0);
    }

    if (!config.openai.apiKey) {
        formatWarning('OPENAI_API_KEY not set. Running in raw mode.');
        formatInfo('Set the environment variable or create a .env file.');
        const finalItems = uniqueItems.slice(0, limit).map(item => ({
            ...item,
            impact: 'NOTABLE',
            insight: null,
        }));
        formatNews(finalItems, verbose);
        process.exit(0);
    }

    // Digest mode vs regular mode
    if (digestMode) {
        if (!verbose) {
            spinner = ora(`Creating weekly digest with AI (${config.openai.model})...`).start();
        }

        const digest = await analyzeDigest(uniqueItems, limit + 5);

        if (!verbose && spinner) {
            spinner.succeed(`Digest ready: ${digest.themes?.length || 0} themes, ${digest.items?.length || 0} items`);
        }

        formatDigest(digest, verbose);
    } else {
        if (!verbose) {
            spinner = ora(`Analyzing with AI (${config.openai.model})...`).start();
        }

        const finalItems = await analyzeNews(uniqueItems, limit);

        if (!verbose && spinner) {
            spinner.succeed(`Analyzed and filtered to ${finalItems.length} impactful items`);
        }

        formatNews(finalItems, verbose);
    }

    // Show errors in verbose mode
    if (verbose && errors.length > 0) {
        console.log(chalk.gray('  Source errors:'));
        for (const err of errors) {
            console.log(chalk.gray(`    - ${err.source}: ${err.error}`));
        }
        console.log();
    }

    process.exit(0);
}
