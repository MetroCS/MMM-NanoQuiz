#!/usr/bin/env node
import { runPreviewQuizCli } from "../src/cli/runPreviewQuizCli.js";

const exitCode = await runPreviewQuizCli(process.argv.slice(2), {
    writeLine: (line) => console.log(line),
    writeErrorLine: (line) => console.error(line)
});

if (exitCode !== 0) {
    process.exitCode = exitCode;
}
