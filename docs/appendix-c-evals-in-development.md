# Appendix C. Evals during development { #evals-in-development }

!!! abstract "About this appendix"
    **Read this if you use evals during the development cycle:** while you build a prototype, tune a prompt, swap a model or change retrieval. It shows how a small eval set turns each change into a measured step instead of a guess.

    **Reading time:** about 5 minutes.

Most of this course builds evals for a system that already has traffic. You can use the same tools much earlier. Each change you make while building can help one failure and break another. Without evals you only notice the break later, often in production.

[Andrew Ng](https://learn.deeplearning.ai/courses/agentic-ai/lesson/fwxyds/component-level-evaluations) describes the habit plainly: with a small eval set, check whether the metric goes up as you tweak your prompts or other parts of the system. Hamel Husain and Shreya Shankar give the [trigger for a deeper look](https://hamel.dev/blog/posts/evals-faq/how-often-should-i-re-run-error-analysis-on-my-production-system.html): "Re-run error analysis when making significant changes: new features, prompt updates, model switches, or major bug fixes."

## The development loop { #dev-loop }

1. **Build a small eval set.** Start with 20 to 50 realistic inputs, including the hard cases you already know about. Grow it as you find new failures. (These numbers are illustrations.)
2. **Run it on the current prototype.** Keep the outputs and traces, not just a score.
3. **Do error analysis.** Read the failed traces with the domain expert, name the failure modes, and record the first step that failed in each trace ([Module 4](04-error-analysis.md#first-failure-by-step)).
4. **Fix the step with the most first failures**, if you have an idea to improve it ([Module 4](04-error-analysis.md#first-failure-by-step)). Make one change at a time, so you know what caused any difference.
5. **Re-run the evals** on the same inputs. Check the step you changed first, then the whole system. Recount first failures per step (or the transition failure matrix) and compare with the last run.
6. **Check for regressions.** Compare per failure mode and per input: which inputs flipped from pass to fail? A better total can hide a new failure.
7. **Repeat.** Turn each new failure mode into a check ([Module 5](05-build-checks.md#step-4)) and add its inputs to the set.

Step 5 has two parts for a reason. Ng recommends **component-level evals** while you tune one part, because they show quickly whether that part got better. He then recommends an **end-to-end eval** before you call the job done, to confirm the whole system improved.

## What to change, and what to watch { #what-to-watch }

| Change | Examples | What to watch |
|---|---|---|
| **The prompt** | Reword an instruction, add an example, add a rule about escalation | Every failure mode, not only the one you targeted. A new rule can change tone or length elsewhere. |
| **The model** | A different model or provider, a smaller or cheaper model | Pass rate per failure mode, cost per request, and p50 and p95 latency. Re-check your judges on the new outputs. The [migration playbook](appendix-a-model-migration.md#migration-playbook) has the full procedure. |
| **Retrieval (RAG)** | Chunk size, embedding model, number of retrieved documents, adding or changing reranking | The retrieval checks first: was the stale `policy-2022-refunds` kept out ([Module 5](05-build-checks.md#check-worked-example)), and did the current policy come back? Then the grounded-in-context check on the replies ([Module 5](05-build-checks.md)). More documents also means more tokens, so watch cost and latency. |
| **A tool** | Add a tool, change its description or arguments | Whether the agent calls the right tool with the right arguments, and whether it still escalates when it should. Point write tools (refunds, emails) at stubs while you test. |

!!! tip "Keep the old outputs"
    Save each run's outputs and verdicts with the version that produced them. Then you can compare paired results for every change, and roll back to a version you know.

## A worked iteration { #worked-iteration }

The refund agent has an eval set of 80 inputs. Error analysis on the first run found 40 failures, and retrieval caused the most first failures (17). The notes show why: the "30 days" sentence often lands in a chunk without its heading, so the old 60-day document ranks above the current one. The team suspects the chunks are too small. They increase the chunk size and re-run. The numbers are illustrative.

| First failed step | Before | After | Change |
|---|---|---|---|
| Understand the request | 4 | 4 | 0 |
| Retrieve the policy | 17 | 6 | **-11** |
| Look up the order | 6 | 6 | 0 |
| Write the reply | 9 | 14 | **+5** |
| Escalate to a human | 4 | 4 | 0 |
| **Total failures (of 80)** | **40** | **34** | **-6** |

**Reading the result.** Retrieval improved a lot, and the total fell from 40 to 34. But the reply step got worse. The team compares the two runs input by input (loop step 6). Five inputs that passed before now fail at the reply step. The larger chunks now include the neighbouring section on exchanges, and the agent quotes the exchange window instead of the 30-day refund window. The grounded-in-context check passes, because the claim *is* in the retrieved text. The `uses_current_policy` judge catches it, because the stated window is not the current refund window.

A rise in a later step can also be failures that the fixed step used to hide. Only an input-by-input comparison tells the two apart.

**The decision.** The total is better, but this is a new failure on a "cannot accept" item (a wrong refund window). Under the [release gate](09-run-and-monitor.md#step-6), that blocks release. So the team does not ship this version. They change one more thing: split chunks at section headings, so each chunk holds one section. They re-run. Retrieval stays at 6 and the reply step returns to 9. Now the change passes the gate, and the team adds more inputs that mix exchanges and refunds to the eval set.

!!! warning "A better total is not a pass"
    Always look at what got worse, not only at the total. One new failure on something you cannot accept outweighs several fixes elsewhere.

## Before a change goes live { #before-live }

After a significant change, run the full suite and decide with the release gate ([Module 9](09-run-and-monitor.md#step-6)). Small changes during the day can use the fast CI checks. A new model, a retrieval redesign or a new tool deserves the full comparison: old and new versions on the same inputs, per failure mode, with cost and latency alongside.

## Key takeaways

- **Run evals during development, not only after launch.** A small eval set turns each change into a measured step.
- The loop: **build a small set, run it, do error analysis, fix the step with the most first failures, re-run and recount, check for regressions, repeat.**
- **Change one thing at a time**, and check the changed step first, then the whole system.
- **Watch what the change could break:** every failure mode for a prompt change; cost and latency for a model change; retrieval checks for a RAG change.
- **A better total is not a pass.** Read the inputs that flipped from pass to fail, and let the release gate decide.

## Check your understanding

??? question "You change the chunk size and the total failures drop from 40 to 34. Can you ship?"
    Not yet. Check each failure mode and the inputs that flipped from pass to fail. If any new failure is on a "cannot accept" item, the release gate blocks the change, even though the total improved.

??? question "Why check the retrieval checks before the whole-system evals after a RAG change?"
    They show quickly whether the part you changed got better. The whole-system evals then confirm that the improvement reached the final replies and did not break anything else.

??? question "You want to try a new model and a new prompt. Why not change both at once?"
    If the results change, you cannot tell which change caused it. Change one, re-run, then change the other.

**Next:** [Glossary](glossary.md)
