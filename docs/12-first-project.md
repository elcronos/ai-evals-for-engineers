# Module 12. Your first eval project

!!! abstract "In this module"
    **You will learn:** how to run the whole lifecycle on one real system in about two weeks, what to have ready before you start, and the core ideas of the course in one list.

    **Reading time:** about 5 minutes.

## Your first two weeks { #first-two-weeks }

A starting plan for one system that needs no special tooling. Adjust it to how critical the system is: a low-risk internal tool may need less, a system that handles money or safety more.

**Before day 1, check that you have:**

- [ ] a lead domain expert named, with roughly 8 hours booked;
- [ ] an answer from your privacy and security teams on storing traces (or you will start with synthetic inputs only);
- [ ] a script or notebook that calls the system with an input and saves the full trace to a file;
- [ ] access to a judge model (credentials and a budget);
- [ ] a place to put results (a spreadsheet or an annotation tool).

If any box is empty, stop and fix it first.

| When | Who | Do this | Output | Module |
|---|---|---|---|---|
| Day 1 | Engineer, product owner, expert | Agree purpose, unacceptable failures and the lead expert | One-page definition | [3](03-define-and-collect.md#step-1) |
| Days 2 to 3 | Engineers | Collect about 100 traces (or hand-write 50 realistic inputs and run them through the system) | A readable dataset | [3](03-define-and-collect.md#step-2) |
| Days 4 to 5 | Expert, scribe | Error analysis: notes on what went wrong, group into failure modes, count | Ranked list of failure modes | [4](04-error-analysis.md) |
| Week 2, first half | Engineers | Write code checks for every failure mode code can catch. Draft a binary LLM judge for the top one or two that need judgement. Add the regression set to CI. | Running checks | [5](05-build-checks.md) |
| Week 2, second half | Expert, engineers | Label enough examples for each judge (including enough failures), split them, measure on the dev set, then once on the test set. Fix or drop judges that miss targets. | Validated judges and a confusion matrix | [6](06-measuring-a-judge.md) and [7](07-validate-judges.md) |
| Then | Team | Turn on sampled production scoring, schedule a red-team run, and book a recurring "read fresh traces" session | A living process | [9](09-run-and-monitor.md) |

## Where to start tomorrow { #next }

1. **Name your core group:** an engineering owner, a product owner and a lead domain expert. Book the expert for two 2-hour sessions this week.
2. **Ask your privacy and security teams** whether you may store traces (or start with synthetic inputs).
3. **Run days 1 to 5** of the plan above and produce your ranked list of failure modes.
4. **Review the list** with the product owner before you build any judges, and decide how much rigour your system needs given how critical it is.

## The core ideas { #core-ideas }

You do not need to become an ML engineer. You need to internalise these:

1. **Use code checks first; use validated models or humans for meaning.** Code can check anything objectively checkable, including some semantic facts. Tone, faithfulness and helpfulness need a validated model or a human.
2. **Evals are a lifecycle, not a script.** Define what matters with product and domain experts, collect data, look at it, label it, build evals, validate the judges, run them, and refresh them with new failures.
3. **Evals are regression tests for the life of the system.** Quality can change without a code change (inputs, documents, APIs, the definition of "good" and the model behind a name all drift), and every hosted model is eventually retired. Re-run the suite on every change, whether or not it went through your repository, and on a schedule.
4. **Domain experts define "good", by reading real traces.** Dashboards of averages hide the failures that matter; failure modes come from error analysis, not off-the-shelf metrics.
5. **Your judge is software too.** It needs its own tests: the confusion matrix, TPR and TNR, F1 on the failure class, and a held-out test set.
6. **A score between 0 and 1 is not automatically a probability.** Calibrate before you act on it. An LLM's self-reported confidence is unreliable. **Never ask an LLM how confident it is and use that number to decide pass or fail.** Instead, validate the judge's PASS/FAIL verdicts against expert labels on a held-out test set ([Module 7](07-validate-judges.md#step-5)).
7. **[Zero-shot does not mean zero data work.](06-measuring-a-judge.md#zero-shot)** You skip training, but you still need expert-labelled data to validate the grader and, if it returns a score, to tune its [threshold](08-scores-and-thresholds.md#threshold).
8. **The threshold is a business decision**, not a default to accept.
9. **The method matters more than the tool.** Follow the lifecycle; the tool is replaceable.

## Going further

- When a model change is coming, read [Appendix A. Model migration playbook](appendix-a-model-migration.md).
- For the detail and evidence behind drift and model retirement, read [Appendix B](appendix-b-drift-and-retirement.md).
- For deeper reading, start with Hamel Husain's [AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/) and the rest of the [References](references.md).

**Optional next:** [Appendix A. Model migration playbook](appendix-a-model-migration.md)
