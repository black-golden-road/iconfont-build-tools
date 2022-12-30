#!/usr/bin/env node
const yargs = require('yargs');
const path = require('path');
const chalk = require('chalk');
const { IconFontTools } = require('../dist');

const argv = yargs
    .command({
        command: 'build',
        desc: '构建iconfont',
    })
    .options({
        config: {
            alias: 'c',
            describe: '配置文件路径，默认为 iconfont.config.js',
        },
    })
    .help().argv;

async function main(argv) {
    if (argv._[0] === 'build') {
        const configPath = path.isAbsolute(argv.config)
            ? argv.config
            : path.join(process.cwd(), argv.config);
        console.log(chalk.blue('配置文件 '), configPath);
        const config = require(configPath);
        const tool = new IconFontTools(config);
        await tool.build();
    } else {
        yargs.showHelp();
    }
}

main(argv);
