# Module 1. Why evals?

!!! abstract "In this module"
    **You will learn:** why LLM outputs are hard to evaluate, why unit tests catch only part of what goes wrong, where code checks still win, and why evaluating an AI system never really finishes.

    **Reading time:** about 10 minutes.

If you build with LLMs, your first instinct is to write tests. That instinct is correct but incomplete. This module shows what is missing.

## Why LLM outputs are hard to evaluate { #why-hard }

Traditional code is deterministic: the same input gives the same output, and a test can state exactly what that output must be. LLM responses, in the words of Shankar and Husain quoted on the [welcome page](index.md), are "subjective, context-dependent, and multifaceted". Evaluation is also different from traditional machine learning, where each example usually has one correct label (spam or not spam) to compare against. An LLM reply has many acceptable forms, so before you can score it you must decide what "good" means.

Each of the three ambiguities in that quote points to a different way of checking. Here they are for the course's refund agent:

| The response might be... | Refund-agent example | Can code check it? |
|---|---|---|
| Factually accurate yet inappropriate | States the correct 30-day window, in a cheerful tone, to a customer who is angry about a double charge | **No.** Tone needs a reader: a model-based judge or a human. |
| Persuasive yet incorrect | Confidently says "you have 60 days" | **Sometimes.** If the correct answer is known (the current policy says 30 days), code can compare the number. If not, a judge checks the claim against the source documents. |
| Addresses most but not all of the question | Explains the refund window but ignores the question about the double charge | **Rarely.** Knowing what was asked and what was left out needs a reader. |

That split runs through the whole course. **Code-based evals** check what can be stated exactly: cheap, fast and repeatable. **Model-based evals** (and humans) judge meaning, and must themselves be validated. The rest of this module shows where code-only tests fall short, and [Module 2](02-graders.md) introduces the three kinds of grader.

## What code-only tests miss { #why-evals }

A traditional test checks that output matches something you can **specify in code**: an exact value, a schema, a pattern. LLM outputs often have many acceptable forms, and what makes them right or wrong is a judgement about **meaning**. A whole class of failures passes every assertion you can reasonably write and is still wrong:

| Scenario | Unit tests say | A model-based eval says | What actually happened |
|---|---|---|---|
| Chatbot response | <span class="eval-pass">Pass</span> Valid JSON, correct schema, under token limit | <span class="eval-fail">Fail</span> Hallucinated a $500 credit that doesn't exist | Customer got wrong information, support ticket filed |
| Code generation | <span class="eval-pass">Pass</span> Compiles, passes lint, signature matches | <span class="eval-fail">Fail</span> Uses a deprecated API, subtle race condition | Works today, breaks silently next release |
| Tone | <span class="eval-pass">Pass</span> Contains "sorry" and "apologise" (keyword match) | <span class="eval-fail">Fail</span> The message as a whole is passive-aggressive | Customer felt dismissed despite the "correct" keywords |
| RAG faithfulness | <span class="eval-pass">Pass</span> Response reuses keywords from the retrieved context | <span class="eval-fail">Fail</span> Added plausible-sounding facts that are not in the context | User acted on information that came from nowhere |
| Summarisation | <span class="eval-pass">Pass</span> Correct length, valid grammar, all fields present | <span class="eval-fail">Fail</span> Quietly omits the negative sentiment in the feedback | Decision-makers act on an incomplete picture |
| Customer reply | <span class="eval-pass">Pass</span> Factually accurate, includes required disclaimer | <span class="eval-fail">Fail</span> Condescending tone to a frustrated customer | Customer escalates |

The pattern is the same in every row: **structurally valid, semantically wrong.**

*RAG* (retrieval-augmented generation) means the system searches your documents, pastes the best matches into the prompt and asks the model to answer from them. *Faithfulness* means the answer says only what those documents support.

### So what is an eval?

An **eval** is any systematic way of measuring how good a model's or agent's output is. A unit test is one kind of eval. Evals also include checks that use a model or a human to judge meaning. Whatever decides pass or fail on one output is called a **grader**; [Module 2](02-graders.md) covers the three kinds.

### Can code only check structure?

Not quite, and it is worth being precise:

- **Code can check some meaning.** If the right answer is objectively checkable, code is the best tool: the extracted order ID equals the correct one, generated SQL returns the same rows as a reference query, generated code passes its unit tests, a cited document ID exists, a required disclaimer is present, a URL returns 200. These are code-based evals. **Always use them first** ([Module 5](05-build-checks.md)).
- **Code struggles when many different outputs are acceptable.** Whether a reply is empathetic, whether a summary dropped something important, whether every claim is supported by the context: a regex or keyword match is either too strict (it rejects valid paraphrases) or too loose (it accepts wrong answers that contain the right words). These need a grader that can read, which means a model or a human.
- **Rigid code graders can also be wrong.** Anthropic's write-up on agent evals describes a benchmark where a model's score rose from 42% to 95% after fixing code graders that penalised correct answers for trivial formatting differences (for example `96.12` vs `96.124991`).

So use code checks wherever they work (they are cheap, fast and reproducible), and add validated model-based graders for meaning. You need both.

## Why evals never finish { #never-finish }

Most software engineers think of delivery as linear: build, test, ship, move on. An AI feature that passed its evals at launch can get worse **without a code change in your repository**, and if it uses a hosted model, that model will eventually be retired by its provider.

A deterministic function gives the same output for the same input until someone changes its code, config or dependencies. An AI system's quality also depends on the model, the documents it reads, the tools it calls and what users ask, and several of those can change without a commit, whoever owns them. When they do, the system still returns HTTP 200, with a fluent, wrong answer.

| Question | Traditional feature | AI feature or agent |
|---|---|---|
| What decides whether an output is correct? | Your code and its pinned dependencies | Your code, plus a model, a prompt, retrieved documents, tool responses, and what users ask |
| What can change it, without a commit in your repository? | Little: most changes are commits, config or dependency upgrades that CI tests | The model (the provider sets the retirement date; your team picks the replacement), documents and tool APIs (whoever owns them), what users ask, and what the business calls correct. Often no commit and no CI run, even when your team owns the documents and tools |
| Does a problem fail loudly? | Usually (exceptions, error rates, failed checks) | Usually not: wrong answers look like right ones |
| Will your existing tests notice? | Yes, if they cover the code path and their expected values are still current | Only if you **re-run** them, and only if they check meaning, not just structure |
| When is testing "done"? | At release, until the next change | Never, while the system is live |

This gradual change in the conditions a system runs under is called **drift**. [Appendix B](appendix-b-drift-and-retirement.md) describes the kinds of drift in detail; for now, the example below is enough.

!!! example "One year in the life of the refund agent (illustrative)"
    **Month 0:** evals pass and the agent ships, pinned to model X. **Month 2:** the policy team shortens the refund window and publishes a new document, but the old one stays in the search index. The right answer changed and the old document is still retrieved; there is no commit and no CI run. **Month 5:** a new product launches and a third of questions are about it. **Month 9:** the provider announces that model X retires in 90 days. **Month 10:** the candidate replacement costs 20% more per request and fails the "escalate on legal threat" check more often. Your code changed once that year, for the migration. Before that, the agent's behaviour had already changed twice with no commit at all, and nothing but evals, re-run on a schedule and on live traffic, would have told you.

!!! danger "Why this matters"
    Every model retirement is a **migration with a deadline**, possibly of a business-critical workflow, and for hosted models it now comes round roughly every 12 to 18 months ([Appendix B](appendix-b-drift-and-retirement.md#model-lifespans)). Without a ready eval suite you have two bad options: **slow** (weeks of manual re-testing, every time) or **risky** (switch and hope, and find out from customers). Anthropic's guide to agent evals makes the same observation: teams without evals face weeks of testing when a new model comes out, while teams with evals can upgrade in days.

That is why the rest of the course builds an eval suite you can re-run whenever anything changes, and keep running for as long as the system is live.

## Key takeaways

- LLM failures are often **structurally valid and semantically wrong**: they pass every assertion you can write.
- **Use code checks first** for anything objectively checkable, and add validated model or human graders for meaning.
- An AI system's quality can change **without a code change**, because the model, documents, tools and users change. Evals are not done at release; they run for the life of the system.

## Check your understanding

??? question "A reply passes JSON schema validation, stays under the token limit and contains the word 'sorry'. Is it a good reply?"
    You cannot tell. Those checks confirm structure and keywords, not meaning. The reply could still invent a credit, be condescending or cite the wrong policy. You need a grader that can judge meaning for those.

??? question "Should you check that a generated SQL query returns the right rows with an LLM judge?"
    No. If you have a reference query, run both and compare the rows in code. It is objectively checkable, so a code check is cheaper, faster and more reliable.

??? question "Your agent passed all its evals at launch and nobody has changed its code since. Why might it be worse today?"
    Because its quality also depends on things that change without a commit: the documents it retrieves, the APIs it calls, what users ask, what the business considers correct, and the model itself, which the provider can update behind an alias or retire.

**Next:** [Module 2. Graders](02-graders.md)
