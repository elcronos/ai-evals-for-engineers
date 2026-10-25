# Module 9. Run, monitor and re-run

!!! abstract "In this module"
    **You will learn:** where to run each kind of eval (CI, on a schedule, in production), how to set a release gate, what to watch in production and what each signal means, and when to re-run the suite. This covers Steps 6 and 7 of the lifecycle.

    **Reading time:** about 15 minutes.

## Step 6: Run the evals { #step-6 }

| Where | What runs | Purpose |
|---|---|---|
| **Pull request / CI** | Code checks, the regression set and a small set of judges | Catch regressions before release. Keep it fast (for example under 10 minutes) and inside an agreed cost cap. |
| **Scheduled (nightly or weekly)** | Larger judge suites, **red-team** scans, and the regression set **even when nothing in your repository changed** | Slow, costly checks; catch drift that no commit triggers |
| **Production (online)** | Judges on a sample of live traces; guardrails on live traffic | Catch failures your test set did not anticipate; track quality over time |
| **Before a big change** (a new model, including a forced migration when a provider retires your model; a major prompt, tool or retrieval change) | Old and new versions on the same inputs | Make the change a measured decision: see the [migration playbook](appendix-a-model-migration.md) |

Practical rules:

- **Define a release gate with the product owner.** For example: no regression on any code check; the share of regression cases that a judge marks as passing must not drop by more than an agreed margin compared with the last release; any new failure on a "cannot accept" item blocks release. The margin is in **percentage points**: with a margin of 3 points, a judge that passed 92% of cases at the last release must stay at or above 89%. Choose the margin based on how noisy the judge is and how costly a miss would be. On a small set a few cases can swing more than 3 points by chance, so pick a margin larger than the run-to-run variation you observe.
- **Expect LLM judges to vary between runs.** Classifiers and decision models that you self-host with pinned weights usually give the same answer for the same input (a hosted decision model can change when its provider updates it); LLM judges often vary even at low temperature. Use low temperature where the model allows it; some models, including several reasoning models, do not let you set it.
- **Handle flips.** Re-run a failing case once before failing the build; for gating decisions, use a majority vote over several runs. If the failure disappears on re-run, let the build pass but log it as a flaky check; repeated flips mean the criterion is ambiguous and needs tightening. When it is the system's output that changes between runs, not the judge's verdict, a pass on re-run is really pass@2 and can hide unreliability; for critical cases see [repeated runs](#repeated-runs) below.
- **Name an owner.** Someone triages a red build within a day (or whatever your context needs).
- **Red teaming** is the adversarial part: deliberately attacking the system with prompt injection, jailbreaks, requests that bypass access controls, tool misuse and attempts to extract the system prompt. Use a tool that generates those attacks ([Module 11](11-tools.md)) rather than inventing them by hand. **Agree it with your security team before you start:** red teaming sends hostile traffic at a system, so agree the scope, the target environment (usually not production) and who has authorised it, and choose attack categories that match your system's real risks.

### When the system itself varies: pass@k and pass^k { #repeated-runs }

The rules above deal with the **judge** giving different verdicts on the same output. A separate question is whether the **system under test** gives different outputs for the same input: an agent that handles a refund correctly on one run may call the wrong tool on the next. One run per input cannot show this, because a single pass may have been luck. To see it, run the same input k times (each run is a *trial*), grade every run, and summarise the k results with one of two metrics:

| | **pass@k** ("pass at k") | **pass^k** ("pass hat k", or informally "pass all k") |
|---|---|---|
| The input counts as passed when | at least one of the k runs passes | all k runs pass |
| Question it answers | Can the system do this at all? (capability) | Does it do this every time? (reliability, or consistency) |
| Use it when | one success is enough: a developer picks the working answer from several generated ones, or a user can simply retry | every run must be right: a customer-facing agent that handles the same request for many customers, each of whom expects it to work every time |
| As k grows | rises towards 100% for any input that sometimes passes | falls towards 0% for any input that sometimes fails |

At k = 1 both are the ordinary pass rate. Report the share of inputs that pass, as with any other check.

*Worked example.* Each run of an input passes 90% of the time. With 3 runs, and runs that are independent of each other:

- **pass@3** is 1 minus the chance that all three fail: 1 minus 0.1 × 0.1 × 0.1, which is **99.9%**.
- **pass^3** is the chance that all three pass: 0.9 × 0.9 × 0.9, which is **72.9%**. At 10 runs it is about 35%.

The same system looks nearly perfect by one metric, yet by the other, more than a quarter of the time at least one of three runs fails, because the two answer different questions.

These formulas assume each run of an input is independent and has the same chance of passing. Two things break this in practice. Inputs differ in difficulty, so never plug one overall pass rate into them: count passes per input and average (see the note below). And runs of one input can fail together, for example from a shared bad tool state, so treat the result as an estimate, not an exact figure.

This is not just theory. On the τ-bench benchmark of customer-service agents, gpt-4o passed 61.2% of retail tasks on a single run, but fewer than 25% when all 8 runs had to pass (Yao et al.).

**Which to use.** Anthropic's [guide to agent evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) puts it as "pass@k for tools where one success matters, pass^k for agents where consistency is essential", and adds that pass^k "especially matters for customer-facing agents where users expect reliable behavior every time." It also notes that for coding agents the usual interest is a correct solution on the first try, which is pass@1.

!!! tip "Start simple; add repeated runs only where criticality needs them"
    **The default is one run per input with a binary pass or fail** (pass@1). That is what the rest of this course uses, and it is enough to start. Hamel Husain and Shreya Shankar's [evals FAQ](https://hamel.dev/blog/posts/evals-faq/) does not discuss pass@k or pass^k, but its advice points the same way: start with error analysis, use binary labels and cheap code checks before LLM judges, and decide how often an eval should run from its cost and "the business value of catching this error". As they put it, "There are no bright-line rules."

    Reach for repeated runs (and pass^k, where the question is reliability) when:

    - **the behaviour is high-stakes or customer-facing**, for example a "cannot accept" failure mode such as promising a refund the policy does not allow;
    - **traces show flaky behaviour**: the same input passing on one run and failing on another;
    - **you are comparing two models or prompts** and the system varies, so average each input's runs before comparing, as in a [model migration](appendix-a-model-migration.md).

    **k runs cost k times as much** in tokens and judge calls, so use them on the cases that matter, not the whole suite. A small k, such as 3, is a reasonable start.

**Not the same as a "pass-all rate".** Husain and Shankar's FAQ suggests combining checks into a "pass all" rate: an example passes only if it passes **every check** (every failure mode) on one output. pass^k asks whether one check passes on **every run** of the same input. Both say "everything must pass", but along different axes, and you can use both.

??? note "For the curious: computing pass@k and pass^k from your runs"
    Run each input n times (n at least k) and count the c runs that pass. Then, for that input, with C(a, b) meaning "the number of ways to choose b items from a":

    - pass@k = 1 minus C(n minus c, k) / C(n, k)
    - pass^k = C(c, k) / C(n, k)

    In words: pass^k is the chance that k runs picked at random from your n all passed; pass@k is the chance that they did not all fail. **Compute this per input, then average across inputs.** Working out one overall pass rate first and then raising it to the power k gives a different, misleading answer.

    *Example:* n = 10 runs, c = 9 passes, k = 3 gives pass^3 = C(9, 3) / C(10, 3) = 84 / 120 = 0.70. That is a little below 0.9 × 0.9 × 0.9 = 0.729, because it picks 3 different runs from your 10 without putting any back, which matches what you actually ran. Raising the observed 0.9 to the power 3 tends to overstate pass^k.

    ```python
    from math import comb

    def pass_at_k(n, c, k):
        return 1 - comb(n - c, k) / comb(n, k)

    def pass_hat_k(n, c, k):
        return comb(c, k) / comb(n, k)
    ```

    Sources: pass@k was introduced by Kulal et al. (2019) and made popular by Chen et al. (2021), who gave the pass@k formula above. They ran 200 samples per problem, because computing pass@k from exactly k runs is very noisy, and showed that plugging a measured pass rate into 1 minus (1 minus p) to the power k is biased. pass^k, and its formula, come from Yao et al. (2024), the τ-bench paper. Both are listed in the [references](references.md).

**Done when:** a failing check blocks (or at least visibly flags) a release, and someone owns the response.

## Step 7: Monitor and refresh { #step-7 }

Users ask new things, the product changes, documents go stale, and models are upgraded and retired ([Module 1](01-why-evals.md#never-finish)). This step is how you keep up: it ends only when the system is switched off.

The things that can change are called kinds of **drift**:

| Kind of drift | What changes |
|---|---|
| **Data drift** | What users ask (the mix of inputs) |
| **Concept drift** | The correct answer for the same input, for example a new refund policy |
| **Criteria drift** | What your experts consider "good" |
| **Upstream drift** | Documents and tool or API responses your system reads |
| **Model change** | The model behind a name, when a provider repoints an alias |
| **Judge drift** | Your grader, which is a model too |

[Appendix B](appendix-b-drift-and-retirement.md#drift) has examples and evidence for each.

**Signals to watch, and what each may point to:**

| Signal | May indicate | Response |
|---|---|---|
| Pass rate of a failure mode trending down on sampled production traces | Any kind of drift, or an unnoticed change | Read the failing traces; find what changed |
| The input mix (topics, languages, length, share of new intents) moving away from the mix your datasets were built from | Data drift | Refresh error analysis on fresh traces; add new cases to the regression set. (Language and length are simple code metrics. Topic needs a tag per trace, from a cheap classifier or LLM call, or from clustering; then track the share of each tag week by week.) |
| Retrieval changes: different documents retrieved for the same questions, superseded documents retrieved, more "no results" | Upstream drift (documents or index changed) | Check with the document owners; run the regression cases that depend on those documents |
| More tool errors, schema validation failures or empty tool results | Upstream drift (a tool or API changed) | Contract-test the tool; add the cases to the regression set |
| Cost per request, tokens per request or p95 latency moving | A model, alias or prompt change, or longer inputs | Check the exact model version in the traces; compare against the baseline |
| More thumbs-down, edits or escalations to a human | Anything | Read those traces first |
| Judge agreement with the expert dropping on a fresh labelled sample | Judge drift or criteria drift | Re-validate or fix the judge; update the labelling guide |

Two common misreadings:

- **Break pass rates down by segment** (topic, language, customer type) before concluding the system got worse. If the mix moves towards harder questions, the overall pass rate drops even though the system behaves exactly as before on each kind of question, and a move towards easy questions can hide a real regression.
- **A change in the input mix is a reason to look, not proof of a problem.** Input drift is an early warning; quality on labelled or judged traces is what confirms it.

Practical rules:

- **Run the regression set on a schedule even when nothing changed.** A CI run against mocked tools and a frozen copy of the index is reproducible but blind to upstream drift, so keep at least one scheduled run against the live index and live (read-only) tools. A fixed regression set never sees new kinds of question, which is why online scoring and fresh-trace review are also on this list.
- **Score a sample of live traces continuously** (online evals), usually with judges that do not need a reference answer, and track each failure mode's pass rate with its confidence interval. When a production failure is new, add its input to the regression set so CI catches it next time (Husain and Shankar describe this loop).
- **Track the pass rate per failure mode** over time, not one global score. Give each a target and an owner (for example "at least 98% of sampled replies use the current refund policy"), and alert on a sustained drop beyond its confidence interval, not on one reading.
- **Review fresh production traces regularly**, with the expert joining for part of it. How often depends on how critical the system is: a high-risk customer-facing agent may deserve a weekly review, a low-risk internal tool a monthly or quarterly spot check. New failure modes become new checks.
- **Re-label fresh traces** now and then, not only the old golden dataset: if your labels come only from launch, they describe last year's users and last year's policy. The expert's labels on a fresh sample re-check the judge, and the rows join the labelled pool as new labelled rows, assigned to a split so each split stays stratified ([Module 5](05-build-checks.md#keep-pool-alive)).
- **Re-validate the judge** ([Module 7](07-validate-judges.md)) when its model or prompt changes, when the policy or labelling guide changes, when a new failure mode is added, when the input mix shifts, or when its agreement with the expert drops on a fresh sample.
- **Keep a model inventory**: a list of every model the system calls (including the judge), its exact version and its retirement date. Watch those dates.
- **Treat the eval suite like code:** version it, review changes to it, keep it in the repository.

## Evals are regression tests, for the life of the system { #lifetime-regression }

Steps 4 to 6 built a golden dataset, a regression set, validated judges and a release gate. The rule for using them: **run the eval suite whenever any part of the system changes, whether or not the change goes through your repository, and on a schedule even when nothing seems to have changed.**

Changes you can see coming (a migration, a planned document update, your own prompt edit) can be gated before release. Others (a shift in what users ask, an upstream edit nobody flagged) are live before any check runs, so the scheduled runs detect them rather than prevent them.

| Trigger | Example | What to run |
|---|---|---|
| **Model version change** (planned upgrade, provider retirement, alias moved) | Your model's retirement date is announced | Follow the [migration playbook](appendix-a-model-migration.md) |
| **Prompt change** | Wording tweak to fix one failure | The regression set in CI; the full suite for large changes |
| **Tool change** | New tool, changed tool description, upstream API response changes | The regression set, plus cases that exercise that tool; contract tests on the tool's responses |
| **Retrieval change** | Documents added or edited, re-indexing, new chunking or embedding model | The regression set, especially cases that depend on the changed documents; retrieval checks (expected document IDs) |
| **Business or policy change** (concept drift) | Refund window goes from 60 to 30 days | Update the stored references (policy text, expected answers) and have the expert relabel the affected golden rows **first**; re-check the judge; then run everything that touches the policy ([worked example](05-build-checks.md#data-worked-example)) |
| **Judge change** | New judge model or prompt, judge model retired | Re-validate the judge ([Module 7](07-validate-judges.md)) before trusting its scores |
| **Framework or SDK upgrade** | New version of your agent framework or provider SDK | The regression set |
| **Nothing changed** | A normal week | Scheduled regression runs and online scoring (Step 7 above) |

**Change one thing at a time:** if the system's model and the judge's model move in the same release, you cannot tell which one changed the score. The [migration playbook](appendix-a-model-migration.md) covers what to do when both are retired together.

## Key takeaways

- Run **fast checks in CI**, **slow checks and red teaming on a schedule**, and **judges on a sample of live traffic**.
- Agree a **release gate** with the product owner, with a margin larger than the run-to-run noise.
- When the **system** varies between runs, not just the judge, **pass@k** (at least one of k runs passes) measures capability and **pass^k** (all k runs pass) measures reliability. Start with one run per input; add repeated runs and pass^k only where inconsistency is costly.
- In production, **track each failure mode's pass rate** over time and break it down by segment before drawing conclusions.
- Treat the eval suite as a **regression suite for the life of the system**: re-run it on every change, including changes outside your repository, and on a schedule.

## Check your understanding

??? question "Your regression set passes in CI every day, against mocked tools and a frozen copy of the search index. What can it not catch?"
    Upstream drift: changes to the live documents, index or tool responses. Keep at least one scheduled run against the live index and live read-only tools, and score live traffic.

??? question "The overall pass rate dropped from 94% to 90% this month. Did the system get worse?"
    Not necessarily. Break it down by segment first. If users started asking harder kinds of question, the overall rate can drop while the system behaves the same on each kind. Then read the failing traces.

??? question "The refund policy changes from 60 to 30 days. What do you update first?"
    The stored references (the policy text and any expected answers), and the expert relabels the golden rows whose verdict depends on the window, so your evals encode the new correct answer. Re-check the judge against the relabelled rows, then run everything that touches the policy.

??? question "Your support agent passes a refund case on 90% of runs. The product owner asks whether it is reliable enough for customers. Which metric answers that, and what does it give for 3 runs?"
    pass^k. Each customer has a 90% chance of a correct answer (pass@1), but the agent handles this case again and again, and the product owner is asking whether it is right every time. If runs are independent, pass^3 is 0.9 × 0.9 × 0.9, about 73%, so in roughly a quarter of groups of three runs at least one goes wrong. pass@3 (99.9%) answers a different question: can the agent do it at all?

**Next:** [Module 10. Common pitfalls](10-pitfalls.md)
