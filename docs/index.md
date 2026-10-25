# AI Evals for Engineers

**A practical course for software engineers who are new to evaluating LLM applications and agents.**

*By Camilo Pestana. Last updated 24 October 2026.*

When your code calls a model, new failure modes appear that ordinary unit tests usually miss. A reply can be valid JSON, pass every assertion and still promise a refund your policy does not allow. This course teaches you how to find and measure failures like that: what data to collect, who needs to be involved, how to turn what you see into checks, and how to know whether you can trust the judge that scores your system.

!!! tip "If you remember one thing"
    *Look at real data, let domain experts define what "good" means, and validate your judge against human labels.*

## Who this course is for

- **Software engineers building with LLMs or agents**, or about to.
- **Engineers who use coding agents** and want to know how the quality of an AI system is measured.
- **No ML or data-science background needed.** If you write unit tests and use CI, you have the background you need. Every ML term is explained when it first appears, and the [Glossary](glossary.md) collects them.

## What you will learn

By the end of the course you will be able to:

1. Explain why unit tests are not enough for LLM systems, and where code checks still win.
2. Find the specific ways your system fails by reading real traces with a domain expert.
3. Turn each failure into a check: code first, then a model-based judge where you need one.
4. Measure whether a judge can be trusted, using a confusion matrix, TPR and TNR.
5. Run evals in CI, on a schedule and on live traffic, and keep them running for the life of the system.
6. Avoid the common mistakes that make an eval suite look good while it measures nothing.

## How the course is organised

The course has five parts and two optional appendices. Read Parts 1 to 3 in order; after that, use the rest as you need it. Reading times are approximate.

| Module | What you will learn | Reading time |
|---|---|---|
| **Part 1. Foundations** | | |
| [1. Why evals?](01-why-evals.md) | What unit tests miss, and why evals never finish | 10 min |
| [2. Graders](02-graders.md) | The three kinds of grader, and evals versus guardrails | 5 min |
| **Part 2. Building evals** | | |
| [3. Define what matters and collect data](03-define-and-collect.md) | The eval lifecycle, who decides what "good" means, and what to log | 10 min |
| [4. Error analysis](04-error-analysis.md) | Reading traces to find your real failure modes | 5 min |
| [5. Build your first checks](05-build-checks.md) | Turning failure modes into code checks and judges | 15 min |
| **Part 3. Trusting your judge** | The hardest part of the course: [what to focus on](06-measuring-a-judge.md#part-3-note) | |
| [6. Measuring a judge](06-measuring-a-judge.md) | Kinds of model-based grader, the confusion matrix, TPR and TNR | 15 min |
| [7. Validate your judges](07-validate-judges.md) | The procedure for testing a judge against expert labels | 10 min |
| [8. Scores, calibration and thresholds](08-scores-and-thresholds.md) | When a score is a probability, and how to pick a cut-off | 10 min |
| **Part 4. Running evals for real** | | |
| [9. Run, monitor and re-run](09-run-and-monitor.md) | CI, release gates, production monitoring and drift | 15 min |
| [10. Common pitfalls](10-pitfalls.md) | Six mistakes that make an eval suite mislead | 10 min |
| **Part 5. Putting it into practice** | | |
| [11. Tools](11-tools.md) | Widely used open-source tools, with examples | 5 min |
| [12. Your first eval project](12-first-project.md) | A two-week plan and a recap of the core ideas | 5 min |
| **Appendices (optional)** | | |
| [A. Model migration playbook](appendix-a-model-migration.md) | How to switch to a new model safely | 5 min |
| [B. Drift and model retirement](appendix-b-drift-and-retirement.md) | The detail and evidence behind "evals never finish" | 15 min |

Each module starts with what you will learn and ends with key takeaways and a few questions to check your understanding. Some modules also include optional "Try it yourself" boxes: small interactive calculators where you can change the numbers and watch a concept respond. They are collapsed by default, and the text makes sense without them.

## The running example

Most examples in the course use one system: a **customer-support agent that answers billing and refund questions**. It searches a set of policy documents, looks up orders with a tool, and replies to the customer. The refund policy allows refunds within 30 days of purchase. An older version of the policy allowed 60 days, and that old document is still in the search index. You will see that detail cause trouble more than once.

## A note on numbers

Numbers such as "about 100 traces", targets, margins and timings are **illustrations, not requirements**. The right values depend on how critical your system is, what could go wrong, how much traffic it has and what resources you have. A low-risk internal tool may need far less than this course describes; a system that handles money or safety may need more.

## Credits

Many of the ideas in this course follow the writing of Hamel Husain and Shreya Shankar, and the research and documentation listed in the [References](references.md).

**Start here:** [Module 1. Why evals?](01-why-evals.md)
