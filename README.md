# MMM-NanoQuiz

A [MagicMirror²](https://docs.magicmirror.builders/) module that displays brief, rotating educational quiz questions — one-answer or multiple-choice — with automatic timing, sequencing, and answer reveal. It's built as an educational quiz framework with MagicMirror as its first adapter; see [`VISION.md`](VISION.md), [`ROADMAP.md`](ROADMAP.md), and [`docs/Architecture.md`](docs/Architecture.md) if you're interested in the design behind it or want to contribute.

## Features

- One-answer and four-choice multiple-choice presentations, auto-detected from your quiz content.
- Automatic sequencing through a quiz collection, with optional randomized order and an "avoid immediate repeats" option.
- Configurable timing for how long a question is shown, how long multiple-choice elimination takes, and how long the answer is displayed.
- Quiz content from a local JSON file bundled with the module, or a remote JSON URL (fetched through MagicMirror's server, so it isn't subject to browser CORS restrictions), with optional periodic reloading.
- Structured validation of quiz content with clear log warnings for anything skipped or malformed, so a few bad entries don't take down the whole quiz.
- Manual control via MagicMirror notifications (`NANOQUIZ_NEXT`, `NANOQUIZ_RELOAD`).

## Installation

Clone this repository into your MagicMirror `modules` directory. MMM-NanoQuiz has no runtime dependencies, so no `npm install` is needed:

```sh
cd ~/MagicMirror/modules
git clone https://github.com/MetroCS/MMM-NanoQuiz.git
```
No `npm install` step is required.

Then add it to the `modules` array in `config/config.js`.

```js
{
    module: "MMM-NanoQuiz",
    position: "lower_third",
    config: {
        // see Configuration Options below; all are optional
    }
}
```

### Updating

Go to the module directory and pull the latest changes:

```sh
cd ~/MagicMirror/modules/MMM-NanoQuiz
git pull
```

## Quiz Content

By default, the module reads `questions.json` from its own folder (`dataFile: "questions.json"`). Each entry is either a one-answer item:

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

Rules:

- `question` and `answer` are required, non-empty strings.
- `category` and `explanation` are optional strings; if present but not a string, the field is dropped with a warning (the item is still shown).
- `choices`, if present, must be exactly four non-empty strings, and `answer` must match exactly one of them.
- Invalid items are skipped with a warning logged to the MagicMirror console; they don't prevent the rest of the collection from loading.

Instead of a local file, you can point at a remote JSON URL with the same content shape via `dataUrl` (see below).



## Configuration Options

All options are optional; the module works with an empty `config: {}` as long as `questions.json` exists in the module folder.

| Option | Default | Description |
| --- | --- | --- |
| `dataFile` | `"questions.json"` | Local JSON file to read, resolved relative to the module folder. Ignored if `dataUrl` is set. |
| `dataUrl` | `null` | Remote JSON URL to read instead of `dataFile`. Requested through MagicMirror's `node_helper.js`, so it isn't subject to browser CORS restrictions. |
| `reloadInterval` | `900000` (15 min) | How often (ms) to re-fetch quiz content when `dataUrl` is set. Set to `0` to disable. |
| `remoteRequestTimeout` | `30000` | Timeout (ms) for a `dataUrl` request before it's treated as a failure. |
| `randomizeQuestions` | `true` | Show questions in random order instead of the order they appear in the source. |
| `randomizeChoices` | `false` | Shuffle the order of a multiple-choice item's choices. |
| `avoidImmediateRepeats` | `true` | When randomizing, avoid showing the same question twice in a row. |
| `showCategory` | `true` | Show an item's `category`, if present. |
| `showExplanation` | `true` | Show an item's `explanation` once the answer is revealed, if present. |
| `showProgress` | `false` | Show a `current / total` counter. |
| `animationSpeed` | `600` | Fade duration (ms) used only when advancing to a new question; phase changes within a question (elimination ticks, revealing the answer) update instantly to avoid a "blinking" whole-module fade. |
| `eliminatedChoiceOpacity` | `0.22` | Opacity applied to eliminated multiple-choice choices, via the `--nanoquiz-eliminated-opacity` CSS custom property. |
| `explanationOpacity` | `1` | Opacity applied to the explanation text once revealed, via the `--nanoquiz-explanation-opacity` CSS custom property. |
| `timing.oneAnswer.questionDuration` | `12000` | How long a one-answer question is shown before the answer is revealed. |
| `timing.oneAnswer.answerDuration` | `7000` | How long the answer is shown before advancing to the next question. |
| `timing.multipleChoice.questionDuration` | `12000` | How long a multiple-choice question is shown before elimination begins. |
| `timing.multipleChoice.eliminationInterval` | `3000` | Delay between eliminating each incorrect choice. |
| `timing.multipleChoice.answerDuration` | `7000` | How long the correct choice is highlighted before advancing to the next question. |

### Sample Configuration

```js
  {
    module: "MMM-NanoQuiz",
      disabled: false,
      position: "lower_third",
      config: {
          dataFile: "questions.json",
          timing: {
            oneAnswer: {
                questionDuration: 10000,
                answerDuration: 10000
            },
            multipleChoice: {
                questionDuration: 9000,
                eliminationInterval: 3000,
                answerDuration: 10000
            }
          },
          randomizeQuestions: true,
          randomizeChoices: true,
          avoidImmediateRepeats: true,
          showCategory: false,
          showExplanation: true,
          animationSpeed: 1000
    }
  }
```


## NOTIFICATIONS

Send these with `MM.getModules()` or from another module via `this.sendNotification(...)`:

| Notification | Effect |
| --- | --- |
| `NANOQUIZ_NEXT` | Immediately advance to the next question, skipping any remaining time in the current phase. |
| `NANOQUIZ_RELOAD` | Re-fetch and re-validate quiz content from the configured source. |

## Styling

`MMM-NanoQuiz.css` ships with default styling (opacity states, spacing, colors). The visual design left for you to customize. The classes and custom properties available:

| Selector | Applies to |
| --- | --- |
| `.nanoquiz` | The module's outer wrapper. |
| `.nanoquiz-status`, `.nanoquiz-error` | The loading and error states. |
| `.nanoquiz-category` | The category line, if shown. |
| `.nanoquiz-question` | The question text. |
| `.nanoquiz-answer` | The one-answer answer text (always rendered, so its height is reserved). |
| `.nanoquiz-answer-visible` / `.nanoquiz-answer-placeholder` | Revealed vs. not-yet-revealed state of the answer. |
| `.nanoquiz-choices` | The multiple-choice choices container. |
| `.nanoquiz-choice` | An individual choice. |
| `.nanoquiz-choice-eliminated` | A choice that's been eliminated. |
| `.nanoquiz-choice-correct` | The correct choice, once revealed. |
| `.nanoquiz-explanation` | The explanation text (always rendered, so its height is reserved). |
| `.nanoquiz-explanation-hidden` | Applied before the answer phase, to hide the reserved explanation. |
| `.nanoquiz-progress` | The `current / total` counter, if shown. |
| `--nanoquiz-eliminated-opacity` | CSS custom property set from `eliminatedChoiceOpacity`. |
| `--nanoquiz-explanation-opacity` | CSS custom property set from `explanationOpacity`. |

## Development

This project follows an Intent → Documentation → Tests → Implementation → Verification process; see [`docs/architecture/ADR-002-increment-development-model.md`](docs/architecture/ADR-002-increment-development-model.md) for the full rationale, and [`docs/Architecture.md`](docs/Architecture.md) for how responsibilities are split between the quiz model/validation/engine framework code (`src/`) and the MagicMirror adapter (`MMM-NanoQuiz.js`, `node_helper.js`).

```sh
npm install    # installs eslint, the only (dev) dependency
npm run lint   # eslint
npm test       # node's built-in test runner
npm run check  # both
```

Note: `test/node_helper.test.js` requires MagicMirror's own `js/node_helper.js` and `js/alias-resolver`, so the full suite only passes when this module is checked out inside a real MagicMirror installation's `modules/` directory, not as a standalone clone.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

---

MMM-NanoQuiz, Copyright © 2026 Dr. Jody Paul, is licensed under the MIT License (MIT).

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
