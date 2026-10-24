# AI Evals for Engineers

A practical course for software engineers who are new to evaluating LLM applications and agents. No ML or data-science background needed.

The course content lives in `docs/` as Markdown and is built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/).

## Read it locally

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/mkdocs serve
```

Then open http://127.0.0.1:8000.

## Structure

| Part | Modules |
|---|---|
| 1. Foundations | Why evals?, Graders |
| 2. Building evals | Define what matters and collect data, Error analysis, Build your first checks |
| 3. Trusting your judge | Measuring a judge, Validate your judges, Scores, calibration and thresholds |
| 4. Running evals for real | Run, monitor and re-run, Common pitfalls |
| 5. Putting it into practice | Tools, Your first eval project |
| Appendices (optional) | Model migration playbook, Drift and model retirement |

Author: Camilo Pestana.
