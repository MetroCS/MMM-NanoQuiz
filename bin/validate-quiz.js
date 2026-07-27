#!/usr/bin/env node
import { runValidateQuizCli } from "../src/cli/runValidateQuizCli.js";

const exitCode = await runValidateQuizCli(process.argv.slice(2), {
    writeLine: (line) => console.log(line),
    writeErrorLine: (line) => console.error(line)
});

process.exitCode = exitCode;
