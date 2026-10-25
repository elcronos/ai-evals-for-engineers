# Module 10. Common pitfalls

!!! abstract "In this module"
    **You will learn:** six mistakes that most often make an eval suite look good while it measures nothing useful, and how to avoid each. Use this module as a checklist before you rely on your evals.

    **Reading time:** about 10 minutes.

These lessons draw on Hamel Husain's writing on AI evals and on Jasmeet Kaur's *Production AI Evaluation & Assurance Playbook* (see the [references](references.md)).

## Pitfall 1: Using 1-5 scores instead of binary pass/fail { #pitfall-1 }

Asking an LLM judge for a 1 to 5 rating produces noisy averages that hide regressions. Use binary pass/fail, one judge per failure mode.

| Dimension | 1-5 scale | Binary pass/fail |
|---|---|---|
| Release decision | <span class="eval-fail">Ambiguous</span>: did 3.8 to 3.6 break production? | <span class="eval-pass">Clear</span>: a pass-rate threshold (for example 92% or more) |
| Agreement between reviewers | <span class="eval-fail">Low</span>: two experts often disagree between a 3 and a 4 | <span class="eval-pass">Higher</span>: easier to agree pass or fail |
| Finding the failure | <span class="eval-fail">Hidden</span> in an average | <span class="eval-pass">Direct</span>: you get the exact failing trace IDs |

**Avoid LLM judges that assign a value from 1 to 5 directly.** Those numbers are unstable, hard to validate and hard to act on. If you need more than a single pass or fail, use a **rubric** instead: break the criterion into several small yes/no questions, have the judge answer each one pass or fail on its own, and then compute the score by counting: **passes divided by total.** This is very different from asking the LLM to assign a value. The model only makes small binary decisions that you can validate against human labels, and the number is just arithmetic.

*Example.* Instead of "rate this reply's policy compliance from 1 to 5", ask five separate questions: Does it state the refund window? Does it match the current policy? Does it avoid promising an exception? Does it tell the customer the next step? Does it avoid unsupported claims? Each is judged pass or fail, ideally as its own judge call. A reply that passes 4 of 5 scores 80%, and the trace shows exactly which check failed.

Two rules keep this honest:

- **Treat each question as its own failure mode:** validate each one against human labels ([Module 7](07-validate-judges.md)). The passes-divided-by-total number is only a summary and is never validated on its own.
- **Never use the summary as the release gate.** A reply that passes 4 of 5 can still fail the one question you cannot accept (here, promising an exception). Gate on the individual critical questions and use the summary to explore and compare versions.

Hamel Husain's talk [The Revenge of the Data Scientist](https://hamel.dev/blog/posts/revenge/) makes the same point: a single vague "3/5" versus separate pass/fail checks, such as `is_polite` and `human_handoff`, that you can act on.

## Pitfall 2: Trusting the judge without auditing it for bias { #pitfall-2 }

An LLM judge can be swayed by things that have nothing to do with quality: **where** an answer appears, **how long** it is, or whether it **sounds like the judge's own writing**. These are **biases**. Unlike random noise, which averages out, a bias pushes results the same way every time, so your scores look precise but lean in one direction.

Some biases matter most in **pairwise judging**: the judge sees two answers side by side and picks the better one. You would do this when comparing your old model's reply with a new model's reply to the same question.

How strong each bias is depends on the judge, the task and the setup, so do not trust a published number. **Test your own judge on your own data**, using the checks in the last column below.

| Bias | What happens | What the research shows | What to do |
|---|---|---|---|
| **Position bias** | The judge favours an answer because of where it appears (first or last), not because of quality. | Zheng et al. (2023): same winner in both orders only 24 to 65% of the time, depending on the judge. | Run each pairwise comparison twice with the order swapped; count a win only if it holds in both orders (otherwise call it a tie). Measure your own judge's swap-consistency. |
| **Verbosity bias** | The judge scores longer answers higher even when they add nothing. | Saito et al. (2023): GPT-4 preferred longer answers more than human raters did. | State in the rubric that length is not quality and padding is penalised. Check the correlation between judge score and output length on your data. |
| **Self-preference bias** | A judge favours outputs that resemble its own writing. | Panickssery et al. (2024) link the effect to a model's ability to recognise its own text. | Use a judge from a different model family than the system under test, or a panel of diverse judges (Verga et al., 2024), and compare with a small human-labelled sample. |

??? info "The research figures"
    - **Position bias.** Zheng et al. (2023): on one test set, judges returned the same winner in both orders only 24% (Claude-v1), 46% (GPT-3.5) and 65% (GPT-4) of the time. Shi et al. (2025) tested 15 judges: on MT-Bench most were consistent after a swap only about 57 to 82% of the time; consistency varied widely by judge and task (on DevBench from about 23% to 89%) and was worst when the two answers were of similar quality.
    - **Verbosity bias.** Zheng et al. padded answers with rephrased filler and fooled Claude-v1 and GPT-3.5 judges in 91% of 23 cases (GPT-4: 9%; a small sample).
    - **Self-preference bias.** Zheng et al.: GPT-4 favoured itself by about 10% in win rate and Claude-v1 by about 25% (they flagged the evidence as limited).

These mitigations reduce bias; they do not remove it. Always check against human labels from your own data.

## Pitfall 3: Writing rubrics before reading traces { #pitfall-3 }

Rubrics written first make your judge grade generic criteria while missing the failures users actually hit. Read real traces first ([Module 4](04-error-analysis.md)), and write the criteria afterwards.

## Pitfall 4: Running the LLM judge before the code checks { #pitfall-4 }

Never pay the latency, cost and variance of an LLM judge for something a code assertion can check in milliseconds. Layer your evaluation and follow the decision rule in [Module 5](05-build-checks.md):

| Layer | What it checks | Example tools |
|---|---|---|
| **Tier 1: code** (milliseconds) | Valid JSON or schema, SQL that parses and has the required filter, personal-data regex masks, valid citation IDs, URL status, exact-match on extracted fields, unit tests on generated code | pytest, SQLGlot (parses and normalises SQL), regex, an HTTP client |
| **Tier 2: model-based judges** | Faithfulness to retrieved context, context precision and recall, domain-rubric adherence, tone | DeepEval and G-Eval, RAGAS, Arize Phoenix evals, pre-trained classifiers |
| **Tier 3: adversarial red teaming** | Prompt injection, access-control bypass, multi-turn jailbreaks, tool misuse | Promptfoo, NVIDIA garak, Microsoft PyRIT |

Short-circuit at Tier 1 whenever you can. If a text-to-SQL response fails to parse or lacks the mandatory tenant filter, fail it in milliseconds without calling an LLM.

## Pitfall 5: Reading accuracy and pass rates at face value { #pitfall-5 }

Two separate traps:

- **Accuracy hides a broken judge.** If only 5% of production traces fail, a judge that stamps every output "pass" scores 95% accuracy while catching **none** of the real failures (its TNR is 0%). Always report TPR and TNR, or precision and recall on the failure class. If you need one number, F1 on the failure class also shows the problem: it is 0 here, because the judge catches no failures.
- **A 100% pass rate on your test suite is a warning, not a win.**

!!! danger "The vanity suite trap"
    A 100% pass rate does not mean the system is perfect. It means **your test cases are too easy to guide engineering**. A suite that scores, say, 70% on adversarial and edge-case inputs gives your team headroom to measure improvements release over release. (Your **regression** cases are different: those should pass close to 100%, because they check that things which used to work still do. Anthropic's agent-evals guide draws the same line between hard "capability" evals and near-100% "regression" evals.)

**Which data does this apply to?** In Anthropic's guide, "capability evals" and "regression evals" are both tests of the **system**: you run inputs through it and score the new outputs. In this course they are two parts of the [regression set](05-build-checks.md#label-describes-output). They are not the golden dataset. The golden dataset holds expert-labelled outputs, and its job is to test the **judge**.

| Name | What it tests | Expected pass rate |
|---|---|---|
| **Golden dataset** (expert-labelled rows) | The judge: does it agree with the expert? | Not a pass rate; you measure TPR and TNR |
| **Regression cases** (regression set) | The system: does what used to work still work? | Close to 100% |
| **Capability cases** (regression set) | The system: can it handle inputs that still fail? | Well below 100%; track them, do not gate on them |

## Pitfall 6: Automating the part that defines "good" { #pitfall-6 }

!!! danger "One of the most common and tempting mistakes"
    It is tempting to ask a coding agent or an LLM to "write the evals for this feature": the criteria, the rubrics, the test cases and the labels, all at once. It feels fast. It produces a suite that looks complete and measures very little. Here is why:

    - **It invents generic criteria.** With no access to your traces or your experts, it falls back on "helpfulness", "coherence" and "relevance". Your real failure modes, such as "quotes the old 60-day refund window", come only from [error analysis](04-error-analysis.md).
    - **It grades with the same blind spots.** If a model labels outputs written by a similar model, it tends to miss the same mistakes the system made. The check is circular: what one model gets wrong, the other often accepts.
    - **It writes test cases that pass.** A model asked to produce tests usually produces cases the system already handles. You get the [vanity suite](#pitfall-5): a high pass rate that guides nothing.
    - **There is no ground truth.** Without expert labels you cannot measure the judge's TPR and TNR, so you cannot know whether it is right. Validating automated grading against expert labels is the only way to know whether a judge can be trusted ([Module 7](07-validate-judges.md#step-5)). Skip it, and the numbers are opinions from a model about a model.

    **What LLMs are good for:** writing the harness and CI code, drafting a judge prompt for the expert to edit, clustering the expert's notes into candidate failure modes, and generating candidate inputs for the expert to filter. In each case the expert defines what "good" means and checks the result.

Hamel Husain's *The Revenge of the Data Scientist* lists "bad data and labels" and "automating too much" among its five main pitfalls.

- **Bad data and labels.** If the people labelling lack the domain knowledge, every metric built on their labels inherits their mistakes. This is why the lead domain expert labels, not whoever is free.
- **Automating too much.** Asking a model to "find all errors, make no mistakes" gives it no definition of an error and no ground truth, so it measures nothing in particular.

The takeaway: **use LLMs to speed up the work, and keep a person responsible for deciding what a failure is and for checking that the automation agrees with them.** That is why validating judges against human labels is not optional. The post lists more pitfalls (misusing similarity scores, vague judge questions such as "is this helpful?", dashboards with little signal); read [the full post](https://hamel.dev/blog/posts/revenge/) for each.

## Key takeaways

1. Use **binary pass/fail** judges, one per failure mode; build rubric scores by counting.
2. **Audit judges for bias** (position, verbosity, self-preference) on your own data.
3. **Read traces before writing rubrics.**
4. **Run code checks before LLM judges.**
5. **Distrust accuracy and 100% pass rates.**
6. **Keep a person in charge of defining "good".**

## Check your understanding

??? question "A judge has 95% accuracy on production traces. What else do you need to know?"
    How common failures are, and its TNR. If 5% of traces fail, a judge that passes everything also scores 95% accuracy while catching nothing.

??? question "You compare two model answers with an LLM judge and model B wins 70% of the time. What check do you run before believing it?"
    Swap the order of the answers and re-run. Count a win only if it holds in both orders, to control for position bias.

??? question "Your new eval suite passes 100% on day one. Good news?"
    No. It means the cases are too easy to show improvements or regressions. Add hard, adversarial and edge-case inputs. (Regression cases that check old behaviour should pass close to 100%; capability evals should not.)

??? question "A teammate wants a judge that rates replies for policy compliance from 1 to 5. What do you suggest instead?"
    Break the criterion into small yes/no questions, judge each one pass or fail, and validate each against human labels. If you need a number, count passes divided by total. Gate releases on the critical questions, not on the summary.

??? question "You have a rubric ready before anyone has read a trace. What is the risk?"
    The judge will grade generic criteria and miss the failures your users actually hit. Read real traces first, find the failure modes, then write the criteria.

??? question "A text-to-SQL reply is missing the mandatory tenant filter. Should an LLM judge check this?"
    No. A code check catches it in milliseconds, at no model cost and with no variance. Fail it at Tier 1 and only send outputs that pass the code checks on to an LLM judge.

??? question "A coding agent offers to write the criteria, test cases and labels for your new feature. Why should you decline the labels?"
    The labels are the ground truth. If a model writes them, it brings generic criteria and the same blind spots as the system, and you have nothing independent to validate the judge against. Let the agent write the harness or draft prompts; the expert labels and defines "good".

**Next:** [Module 11. Tools](11-tools.md)
