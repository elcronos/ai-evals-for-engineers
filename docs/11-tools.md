# Module 11. Tools { #tools }

!!! abstract "In this module"
    **You will learn:** what jobs eval tools do, a few widely used open-source options for each job, and minimal working examples you can adapt.

    **Reading time:** about 5 minutes.

!!! info "The method is the point"
    Tools, ownership and licences change quickly, so check the current status of any tool before adopting it. Everything in this course can be done with another tool, or with scripts and a spreadsheet, **as long as you follow the lifecycle.** A team with a spreadsheet that reads traces and validates its judges will get better evals than a team with the best framework that does neither.

## Tools by job

| Job | Examples | Notes |
|---|---|---|
| Capturing traces, annotating them and building datasets | **Langfuse** (self-hostable), Arize Phoenix, LangSmith, Braintrust, MLflow tracing; or OpenTelemetry plus any backend | A spreadsheet is a fine start |
| LLM-as-judge for custom criteria | **DeepEval** with the G-Eval method, Promptfoo `llm-rubric`, RAGAS | Whatever you use, validate the judge ([Module 7](07-validate-judges.md)) |
| Red teaming and prompt-level regression tests | **Promptfoo**, NVIDIA garak, Microsoft PyRIT | Run red teaming on a schedule, not on every pull request |

The sections below show one example for each job.

## Traces, annotation and datasets (Langfuse or similar)

Look for a tool whose workflow matches [Modules 3 and 4](03-define-and-collect.md#step-2). Langfuse is one example: traces are captured automatically; you **filter** to the interesting ones (negative feedback, errors, a random sample) and add them to an **annotation queue**; experts read each trace in a readable view and record a label from a pre-defined **score config** (for example pass/fail per failure mode) with a comment; labelled traces become a **dataset**; and you run **experiments** to rerun the dataset on each change. Langfuse can be self-hosted (the core is MIT-licensed; running it yourself means operating a database stack).

Whichever tool you choose, the data model matters more than the product. It should let you:

1. Capture traces in a standard format (OpenTelemetry where possible).
2. Filter and read them easily.
3. Record human labels with a fixed schema.
4. Turn labelled traces into versioned datasets.
5. Rerun the dataset on every change and compare.
6. Mask personal data and restrict access.

## LLM-as-judge: DeepEval and G-Eval

[DeepEval](https://deepeval.com/) is a Python framework that lets you write LLM evals as pytest-style tests. **G-Eval** is a method (Liu et al., 2023) for turning a plain-English criterion into a judge:

1. You give the **criteria** (or the evaluation steps directly).
2. The judge LLM writes its own **evaluation steps** (a chain of thought).
3. It fills in a **score form**; the score is weighted by the model's token probabilities where available.

By default G-Eval asks the judge for an integer score (1 to 5 in the paper) and probability-weights it. That graded behaviour is what [Pitfall 1](10-pitfalls.md#pitfall-1) discourages, so **set `strict_mode=True`**, which makes DeepEval return a binary 1 or 0 instead.

In the paper, G-Eval with GPT-4 reached only moderate agreement with human rankings on summarisation (Spearman correlation 0.514, where 1 means identical order; graded mode), another reason to validate against **your** labels. The example below follows the binary-judge rule (one narrow criterion, `strict_mode=True`, pinned evaluation steps). It was checked against DeepEval 4.3.1; names may change between versions (older versions use `LLMTestCaseParams` instead of `SingleTurnParams`).

```python
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

# One narrow criterion per failure mode. strict_mode=True makes the score binary (1 or 0).
# NOTE: the default judge is an OpenAI model and construction fails without OPENAI_API_KEY.
# To use another provider, pass your own judge via model=... (see below).
refund_policy = GEval(
    name="States the current refund window",
    evaluation_steps=[
        "Find the refund window stated in the actual output.",
        "Compare it with the refund window in the expected output.",
        "Fail if the output states a different window or promises an exception.",
    ],
    evaluation_params=[
        SingleTurnParams.INPUT,
        SingleTurnParams.ACTUAL_OUTPUT,
        SingleTurnParams.EXPECTED_OUTPUT,
    ],
    strict_mode=True,
    model=my_judge,   # required unless OPENAI_API_KEY is set
)

def test_refund_after_45_days():
    question = "Can I get a refund after 45 days?"
    test_case = LLMTestCase(
        input=question,
        actual_output=my_app(question),   # call your system here
        expected_output="No, refunds are only available within 30 days.",
    )
    assert_test(test_case, [refund_policy])
```

Run it with `deepeval test run test_refund.py`. Practical advice:

- **Keep it pass/fail.** Use `strict_mode=True` rather than reading a graded 0 to 1 score: nobody can say what 0.7 means. Validate the judge against your human pass/fail labels ([Module 7](07-validate-judges.md)).
- **Pin the evaluation steps.** If you give only `criteria`, the steps are regenerated on each run and scores can be inconsistent. G-Eval is not deterministic and adds an LLM call per judgement (cost and latency). It also has a documented tendency to favour LLM-written text.

??? info "Using your own judge model (for example through AWS Bedrock)"
    1. Write a small class extending DeepEval's `DeepEvalBaseLLM` that calls your provider. On AWS Bedrock, call the Converse API with an **inference profile ID** (a routing ID tied to one model version), not a base model ID.
    2. Implement `generate` and `a_generate` so they accept the optional Pydantic `schema` DeepEval passes for structured output, and pass the class as `model=`. Test the wrapper on a few cases before trusting scores.
    3. Keep `strict_mode=True`. Models on Bedrock generally do not return token probabilities, so non-strict G-Eval falls back to plain integer scores.
    4. Record the judge's exact model version with every result and keep it in your model inventory ([Module 9](09-run-and-monitor.md#step-7)): the judge's model will be retired too.

## Red teaming and rubric tests: Promptfoo

[Promptfoo](https://www.promptfoo.dev/) is a command-line tool for evaluating and red-teaming LLM applications, configured in YAML. A common use is to **generate adversarial attacks against your app and report which ones got through**. A minimal red-team configuration for a chat endpoint (check the Promptfoo docs for the options in your version):

```yaml
# promptfooconfig.yaml
targets:
  - id: https
    label: support-bot
    config:
      url: 'https://internal.example/chat'   # your app's endpoint
      method: POST
      headers: { 'Content-Type': 'application/json' }
      body: { message: '{{prompt}}' }
      transformResponse: 'json.reply'        # depends on your response shape

redteam:
  purpose: 'Customer support assistant. Users must only see their own orders.'
  numTests: 10
  plugins: [pii, rbac, bola, hijacking, excessive-agency]
  strategies: [jailbreak, crescendo]
```

```sh
npx promptfoo@latest redteam run      # generates attacks and runs them against your target
npx promptfoo@latest redteam report   # opens the results
```

Run red teaming on a **schedule** (nightly or weekly), not on every pull request: it is slow and costs money. Prompt injection is a *vulnerability category* these plugins probe, not a plugin name; indirect prompt injection has its own plugin that needs extra configuration (see the Promptfoo docs). Attack generation uses a separate model (OpenAI by default) and may send your `purpose` text to a hosted service, so check Promptfoo's data-handling documentation and agree it with your privacy team before pointing it at real systems.

For ordinary regression tests, Promptfoo supports model-graded assertions. Keep each `llm-rubric` to one narrow yes/no condition ([Pitfall 1](10-pitfalls.md#pitfall-1)). Promptfoo returns a 0 to 1 score; set the threshold so it acts as a plain pass/fail cut-off, and validate the judge on your labels like any other:

```yaml
prompts:
  - 'You are a support bot. Answer the customer: {{question}}'
providers:
  - id: https
    config:
      url: 'https://internal.example/chat'
      method: POST
      body: { message: '{{prompt}}' }
      transformResponse: 'json.reply'
tests:
  - vars: { question: 'Can I get a refund after 45 days?' }
    assert:
      - type: llm-rubric
        value: 'States that refunds are only available within 30 days and does not promise an exception.'
        threshold: 0.8   # cut-off on the 0-1 rubric score; validate this judge like any other
```

## Key takeaways

- **The method matters more than the tool.** A spreadsheet that follows the lifecycle beats a framework that does not.
- You need tools for three jobs: **traces and labels**, **LLM judges**, and **red teaming**.
- Configure judges as **binary**, with **pinned** evaluation steps, and **validate** them whatever the tool.
- Run **red teaming on a schedule**, with agreement from your security and privacy teams.

## Check your understanding

??? question "Your team has no budget for an eval platform. Can you still follow this course?"
    Yes. Save traces to JSONL files, label them in a spreadsheet, write code checks and judges as ordinary tests, and rerun them on every change.

??? question "Why set strict_mode=True in G-Eval?"
    To get a binary pass or fail instead of a graded score, which is easier to validate against expert labels and to act on.

**Next:** [Module 12. Your first eval project](12-first-project.md)
