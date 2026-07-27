# Quiz Authoring Guide

This guide is for anyone writing or editing MMM-NanoQuiz quiz content, not just people modifying the module's code. If you just want to add, edit, or check a set of quiz questions, this is the page you need; you do not need to read `docs/Architecture.md` or the ADRs.

## Where quiz content lives

By default, the module reads `questions.json` from its own folder (the `dataFile` configuration option). You can point it at a different local file, or at a remote JSON URL via `dataUrl`, from `config/config.js` — see the main [`README.md`](../README.md) for those configuration options.

Whichever source you use, the content itself is a JSON array of quiz items in the same format.

## Item format

Each item is either a one-answer item:

```json
{
    "question": "Why is an algorithm required to terminate?",
    "answer": "Without termination, it does not produce a completed result.",
    "category": "Algorithms",
    "explanation": "Termination is one of the defining properties traditionally required of an algorithm."
}
```

or a multiple-choice item, identified by the presence of `choices`:

```json
{
    "question": "Which property ensures that an algorithm eventually stops?",
    "answer": "Finiteness",
    "choices": ["Finiteness", "Correctness", "Generality", "Efficiency"],
    "category": "Algorithms",
    "explanation": "Finiteness means that the algorithm completes after a finite number of steps."
}
```

### Field rules

| Field | Required? | Rules |
| --- | --- | --- |
| `question` | Yes | Non-empty string. |
| `answer` | Yes | Non-empty string. For a multiple-choice item, must match exactly one of `choices`. |
| `choices` | Only for multiple-choice | If present, must be an array of exactly four non-empty strings. |
| `category` | No | String, if present. |
| `explanation` | No | String, if present. Shown once the answer is revealed. |

An item with `choices` is treated as multiple-choice; an item without it is treated as one-answer. There is no separate `type` field to set yourself.

## Validating your quiz file

Before deploying a new or edited quiz file, you can check it without needing to run MagicMirror:

```sh
npm run validate -- path/to/questions.json
```

This runs the same validation logic the module applies at runtime, so anything it reports is exactly what would happen (or be skipped, or logged) when MagicMirror loads the file.

### Reading the output

For a file with two errors and one warning, `validate-quiz` prints one line per issue, followed by a summary:

```text
[error] path/to/questions.json, item 2, question: Quiz item must include a non-empty question.
[error] path/to/questions.json, item 3, choices: Multiple-choice item must include exactly four choices.
[warning] path/to/questions.json, item 4, category: Quiz item category must be a string when present.
2 valid item(s), 2 error(s), 1 warning(s).
```

Each line names the item by its position in the file (`item 2` is the second array entry), the field involved, and what's wrong.

For a clean file, you'll just see the summary line, and the command exits successfully:

```text
1 valid item(s), 0 error(s), 0 warning(s).
```

**Errors** mean the item is dropped entirely; it will not appear in the quiz. **Warnings** mean the item is still shown, but the flagged field was ignored (for example, a `category` that isn't a string is dropped, but the question and answer still display). The command's exit code is non-zero whenever there's at least one error, so you can use it as a pass/fail check in a script or CI job:

```sh
npm run validate -- questions.json || echo "quiz file has errors"
```

### Common issues and what they mean

| Diagnostic | What it means | Fix |
| --- | --- | --- |
| `Quiz item must include a non-empty question.` | `question` is missing, empty, or not a string. | Add non-empty question text. |
| `Quiz item must include a non-empty answer.` | `answer` is missing, empty, or not a string. | Add non-empty answer text. |
| `Multiple-choice item must include exactly four choices.` | `choices` is present but isn't an array of exactly four entries. | Provide exactly four choices, or remove `choices` for a one-answer item. |
| `Multiple-choice choices must be non-empty strings.` | One of the four `choices` entries is empty or not a string. | Make sure all four choices are non-empty strings. |
| `Multiple-choice answer must match exactly one choice.` | `answer` doesn't exactly match one (and only one) of the four `choices`. | Make `answer` match the text of exactly one choice, including punctuation and capitalization. |
| `Quiz item category must be a string when present.` (warning) | `category` is present but not a string. | Either fix the value or remove the field; the item still displays either way. |
| `Quiz item explanation must be a string when present.` (warning) | `explanation` is present but not a string. | Either fix the value or remove the field; the item still displays either way. |
| `Raw quiz definitions must be an array.` | The whole file isn't a JSON array at the top level. | Wrap your items in `[ ... ]`. |
| `Quiz item must be an object.` | One of the array entries isn't a JSON object (e.g. a string or number). | Make sure every array entry is a `{ ... }` item object. |

If you run into a diagnostic message not listed here, the message text itself is the authoritative description — this table covers the common cases, not every possibility.

### At runtime vs. before deploying

Invalid items don't crash the module: MagicMirror logs the same diagnostic messages to its console and simply skips the bad items, showing everything else. Running `npm run validate` beforehand just lets you catch and fix problems on your own schedule, instead of noticing later that a question silently never shows up.

## Related

- [`README.md`](../README.md): installation, configuration options, and styling.
- [`docs/Architecture.md`](Architecture.md): how validation fits into the framework, for contributors working on the module's code.
