# References and further reading

## Hamel Husain and Shreya Shankar

Many of the ideas in this course follow their writing.

- Hamel Husain, [AI Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/). A good first read after this course.
- Hamel Husain, [Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) and [A Field Guide to Rapidly Improving AI Products](https://hamel.dev/blog/posts/field-guide/).
- Hamel Husain, [Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/).
- Hamel Husain, [The Revenge of the Data Scientist](https://hamel.dev/blog/posts/revenge/) (source of several pitfalls in [Module 10](10-pitfalls.md)).
- Hamel Husain and Antaripa Saha, [How To Use Decision Models for Evals](https://hamel.dev/blog/posts/decision-model-evals/).
- Hamel Husain, [Selecting The Right AI Evals Tool](https://hamel.dev/blog/posts/eval-tools/).
- Hamel Husain and Shreya Shankar, [How are evaluations used differently in CI/CD vs. monitoring production?](https://hamel.dev/blog/posts/evals-faq/how-are-evaluations-used-differently-in-cicd-vs-monitoring-production.html).

## Playbook

- Jasmeet Kaur, *Production AI Evaluation & Assurance Playbook* (source of the tiered evaluation layers and the starting TPR and TNR targets).

## Papers

- Shreya Shankar et al., [Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs with Human Preferences](https://arxiv.org/abs/2404.12272) (source of the term *criteria drift*).
- Yang Liu et al., [G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634).
- Lianmin Zheng et al., [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685).
- Lin Shi et al., [Judging the Judges: A Systematic Study of Position Bias in LLM-as-a-Judge](https://arxiv.org/abs/2406.07791).
- Saito et al., [Verbosity Bias in Preference Labeling by Large Language Models](https://arxiv.org/abs/2310.10076).
- Panickssery et al., [LLM Evaluators Recognize and Favor Their Own Generations](https://arxiv.org/abs/2404.13076).
- Verga et al., [Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models](https://arxiv.org/abs/2404.18796).
- Xiong et al., [Can LLMs Express Their Uncertainty? An Empirical Evaluation of Confidence Elicitation in LLMs](https://arxiv.org/abs/2306.13063).
- Tian et al., [Just Ask for Calibration: Strategies for Eliciting Calibrated Confidence Scores from Language Models Fine-Tuned with Human Feedback](https://arxiv.org/abs/2305.14975).
- D. Sculley et al., [Hidden Technical Debt in Machine Learning Systems](https://proceedings.neurips.cc/paper_files/paper/2015/file/86df7dcfd896fcaf2674f757a2463eba-Paper.pdf) (NeurIPS 2015; source of "Changing Anything Changes Everything").
- João Gama et al., [A Survey on Concept Drift Adaptation](https://dl.acm.org/doi/10.1145/2523813) (ACM Computing Surveys, 2014).
- Mark Chen et al., [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) (2021; the Codex and HumanEval paper, which made pass@k popular and gives its unbiased estimator. It credits Kulal et al., 2019, with introducing pass@k).
- Shunyu Yao et al., [τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045) (2024; source of pass^k).
- Evan Miller (Anthropic), [Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations](https://arxiv.org/abs/2411.00640) (2024; why evals should report confidence intervals).
- Lingjiao Chen, Matei Zaharia and James Zou, [How is ChatGPT's behavior changing over time?](https://arxiv.org/abs/2307.09009) (figures quoted from the current version of the paper).

## Drift and production monitoring

- Chip Huyen, [Data Distribution Shifts and Monitoring](https://huyenchip.com/2022/02/07/data-distribution-shifts-and-monitoring.html).
- Evidently AI, [What is data drift in ML](https://www.evidentlyai.com/ml-in-production/data-drift).
- Arvind Narayanan and Sayash Kapoor, [Is GPT-4 getting worse over time?](https://www.normaltech.ai/p/is-gpt-4-getting-worse-over-time) (the behaviour versus capability distinction).
- LangSmith, [Online evaluations](https://docs.langchain.com/langsmith/online-evaluations).
- AWS, [SageMaker shadow tests](https://docs.aws.amazon.com/sagemaker/latest/dg/shadow-tests.html) (the shadow-testing pattern).

## Model deprecation and retirement policies

Checked 24 October 2026; these pages change.

- OpenAI, [Deprecations](https://developers.openai.com/api/docs/deprecations).
- Anthropic, [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) and [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview).
- Anthropic, [A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) (September 2025; infrastructure bugs that degraded outputs with no change to the model ID).
- AWS, [Amazon Bedrock model lifecycle (models launched before 7 September 2026)](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html) and [Model lifecycle (newer models)](https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html).
- Microsoft, [Foundry Models lifecycle and support policy](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/model-retirements).
- Google, [Gemini API deprecations](https://ai.google.dev/gemini-api/docs/deprecations).
- OpenAI Developer Community, [GPT-4o default model will be updated to latest version on October 2nd, 2024](https://community.openai.com/t/reminder-gpt-4o-default-model-will-be-updated-to-latest-version-on-october-2nd-2024/962350).
- Jigsaw, [Perspective API](https://www.perspectiveapi.com/) (shutdown notice: 31 December 2026).

## "Newer is not automatically better"

- OpenAI, [OpenAI o3 and o4-mini System Card](https://openai.com/index/o3-o4-mini-system-card/) (April 2025; PersonQA accuracy and hallucination rates). Further reading: TechCrunch, [OpenAI's new reasoning AI models hallucinate more](https://techcrunch.com/2025/04/18/openais-new-reasoning-ai-models-hallucinate-more/).
- OpenAI, [Expanding on what we missed with sycophancy](https://openai.com/index/expanding-on-sycophancy/) (May 2025; the GPT-4o rollback). Further reading: TechCrunch, [OpenAI explains why ChatGPT became too sycophantic](https://techcrunch.com/2025/04/29/openai-explains-why-chatgpt-became-too-sycophantic/).
- OpenAI, [Reasoning models guide](https://developers.openai.com/api/docs/guides/reasoning) (reasoning tokens are billed as output tokens).

## Other guidance and documentation

- Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (see its section on non-determinism for pass@k and pass^k).
- Eugene Yan, [Task-specific LLM evals that do and don't work](https://eugeneyan.com/writing/evals/).
- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai).
- Tool documentation: [Promptfoo](https://www.promptfoo.dev/docs/), [DeepEval](https://deepeval.com/docs/metrics-llm-evals), [Langfuse annotation queues](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues).
