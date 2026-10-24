# Appendix A. Model migration playbook { #migration-playbook }

!!! abstract "About this appendix"
    **Read it when you need it:** when a provider announces that your model will be retired, or when you want to move to a new model. You do not need it to build your first evals.

    **Reading time:** about 5 minutes.

Hosted models are retired on the provider's schedule, typically within 12 to 18 months of their release ([Appendix B](appendix-b-drift-and-retirement.md#model-lifespans)). Your team chooses the replacement, and a ready eval suite turns that choice into a measured decision instead of a guess. Adapt this procedure to how critical the workflow is.

1. **Keep an inventory** in the repository: every model the system calls (agent, sub-agents, judge, guardrails, embeddings), the exact version ID, the platform (provider API or a cloud platform such as AWS Bedrock or Azure), its announced or "not sooner than" retirement date, and an owner.
2. **Watch for deprecation notices** on each provider's and platform's deprecation pages and account notifications, and put the dates in your team's backlog. Cloud platform dates can differ from the model provider's own, and can differ by region.
3. **Start early.** Evaluate candidate replacements as soon as they exist, not when the notice arrives; 45 to 60 days is not long for a critical workflow.
4. **Run old and new on the same inputs.**
    - Run the regression set and all your eval inputs (including the inputs behind the golden dataset) through both models, and score both with your validated judges and code checks. Golden *labels* were written for the old model's answers ([a label describes one output](05-build-checks.md#label-describes-output)), so use them to re-check the judge (item 5 below), not to score the new model.
    - Compare pass rates **per failure mode**, not one overall score, and also cost per request, token usage, p50 and p95 latency and refusal rate.
    - Compare the results **paired**: for each input, did it flip from pass to fail, or from fail to pass? That tells you much more than two overall rates.
    - Where the system or the judge varies between runs, run each input more than once (for example 3 times) and put a confidence interval on the *difference* between old and new. A paired bootstrap, which resamples the inputs and recomputes the difference many times, is enough.
    - With many failure modes, expect one or two to move by a few points by chance: treat a single small drop as a reason to read the traces, not as a verdict.
    - If you use a judge to compare two answers side by side, swap their order to control for [position bias](10-pitfalls.md#pitfall-2).
5. **Check the judge on the new model's outputs before trusting the comparison.** Your judge was validated on the old model's answers. The new model writes differently (length, style, hedging, refusals), so the judge's TPR and TNR may not carry over. Have the expert label a fresh sample of the new model's outputs (start with the cases where old and new got different verdicts) and confirm the judge still meets its targets. Add those labelled rows to the pool ([Module 5](05-build-checks.md#keep-pool-alive)). If the judge is from the same model family as the candidate, watch for [self-preference](10-pitfalls.md#pitfall-2).

    !!! tip "Change one thing at a time"
        Avoid changing the system's model and the judge's model in the same release. If both move, you cannot tell whether a score changed because the system got worse or because the judge changed. Sometimes both are retired together, for example when both come from the same provider. Then **migrate the judge first**: validate the new judge against the golden dataset ([Module 7](07-validate-judges.md)) while the system still runs the old model, and only then use the validated judge to compare the old and new system models. Likewise, when you retune the prompt for a new model, keep the results for "new model, old prompt", so you know how much of the difference came from the model and how much from the prompt.

6. **Read the differences.** Look at the traces where the old and new models disagree. Adjusting the prompt for the new model is common; it is a change too, so re-run the suite afterwards.
7. **Shadow, then canary.** Replay recorded or copied live traffic through the candidate while users still get the current model's answers (*shadow testing*), and score both. Then move a small share of real traffic (a *canary*), watched with judges and trace review, because wrong answers still return HTTP 200. If the agent has side effects (refunds, emails, database writes), point the candidate's write tools at stubs that record the intended call, and compare the intended calls as well as the answers. For multi-turn chats, a recorded session is valid only up to the first turn where the candidate answers differently; compare first turns, or use a simulated user.
8. **Decide with the product owner using the release gate** ([Module 9](09-run-and-monitor.md#step-6)). The new model must be at least as good on the failure modes that matter, within the agreed margin, at an acceptable cost and latency. The newest model does not have to win: a cheaper or older-generation candidate may be the right choice.
9. **Keep the previous version as the rollback** until the new one has proven itself in production, remembering that the rollback disappears on the retirement date.
10. **Record the decision**, the results and the new retirement date in the inventory.

## Key takeaways

- Keep a **model inventory** with retirement dates, and start evaluating replacements **early**.
- Compare old and new **on the same inputs, per failure mode, paired**, with cost and latency alongside quality.
- **Re-check the judge** on the new model's outputs, and never change the system's model and the judge's model at the same time.
- The newest model does not have to win. **Decide with the release gate.**

**Next:** [Appendix B. Drift and model retirement](appendix-b-drift-and-retirement.md)
