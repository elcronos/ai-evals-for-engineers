# Module 4. Error analysis

!!! abstract "In this module"
    **You will learn:** how to find the specific ways your system fails by reading real traces with a domain expert, how to group what you find into failure modes, and how labelling works in practice. This is Step 3 of the lifecycle.

    **Reading time:** about 5 minutes.

## Step 3: Look at the data and label it { #step-3 }

This is the highest-return step in the lifecycle, and the one most often skipped. Before you write a single metric or rubric, **read real traces.**

Teams that grab an off-the-shelf framework and use its default metrics (helpfulness, coherence, hallucination) get dashboards that look reasonable but are too generic to show what is actually breaking. A helpfulness score of 4.1 out of 5 tells you nothing about *why* users are leaving.

The process has four parts:

1. **Sample.** Take about 100 diverse traces (30 to 50 is a workable minimum for a first pass). Include ones with negative feedback, and some ordinary ones.
2. **Annotate with free text ("open coding").** The domain expert reads each trace and writes a short note about the *first thing that went wrong*, in their own words: "used the old refund policy", "cheerful tone to an angry customer", "didn't escalate". Not a score; a note. ("Coding" here means tagging text with labels, not programming.)
3. **Group the notes ("axial coding").** Cluster the notes into **failure modes**: named, specific ways your system goes wrong. "Used the old policy", "quoted a price from the wrong region" and "cited an outdated document" might become one failure mode: *stale source*. Do not aim for a fixed number; keep going until new traces stop revealing new kinds of failure.
4. **Count them.** Now you know what actually breaks and how often. This is your priority list.

!!! tip "Run the session like this"
    **Format:** 90 minutes. The expert reads and writes notes; one engineer scribes and shows each trace in a *readable* view (not raw JSON).

    **Pace:** aim for 2 to 3 minutes per trace, so 100 traces take two to three sessions.

    **Rules:** note only the first thing that went wrong; write "ok" if nothing did; no scoring; no fixing during the session.

    **Afterwards:** the engineer clusters the notes into failure modes and the expert approves the grouping in a 30-minute review.

    **Done when** the last 20 traces added no new failure mode.

The result is a set of **domain-specific failure modes** ("Cited a non-existent policy", "Failed to escalate to a human") that are far more useful than generic scores. In the next module you will build one check for each.

## How labelling works in practice { #labelling }

Later (when you build checks and validate judges, Modules [5](05-build-checks.md#labelled-pool) and [7](07-validate-judges.md)) you will label examples pass or fail *per failure mode*, with a short reason:

| trace_id | failure_mode | label | reason |
|---|---|---|---|
| t-8f21 | uses_current_policy | **fail** | Used the 60-day policy; the current one is 30 days |
| t-8f21 | tone_appropriate | pass | Polite and clear |
| t-9a07 | escalates_when_required | **fail** | Customer mentioned a legal complaint; agent kept chatting |

An expert's verdict on an example is called a **label**, and the set of labels is treated as **ground truth**: the correct answers everything else is measured against.

The labels come from the one lead domain expert, the [benevolent dictator](glossary.md#benevolent-dictator) from [Module 3](03-define-and-collect.md#step-1). In practice even one expert's time is hard to get, so several annotators are rarely practical.

Before labelling, write a short **labelling guide**: for each failure mode, a definition and two clear pass examples and two clear fail examples. If the expert hesitates on a case, add it to the guide. The guide keeps the expert consistent with themselves over time, and lets anyone see why a trace was labelled the way it was.

??? note "Optional: measuring how reliable your labels are"
    Your judges are only as good as the labels you test them against (and so is any system that learns from those labels). When a set of evals is critical, there are techniques to make labels more reliable.

    **Inter-observer reliability** (also called inter-rater or inter-annotator reliability) compares labels from two or more experts on the same traces, for example a second person labelling the same 30 or so traces. If they agree on fewer than roughly 80 to 90% of labels (a rule of thumb), tighten the definition before building a judge. If equally expert people disagree, the task may be genuinely hard or ambiguous, or the definition is unclear. Either way, the disagreements are useful input for refining the labelling guide.

    **Raw agreement can flatter you.** If 95% of traces pass, two labellers who mark *everything* "pass" agree 95% of the time without catching a single failure. So check that they agree on the **failures** specifically, or use a measure that corrects for chance agreement.

    **Intra-observer reliability** (also called intra-rater or test-retest reliability) checks one expert against themselves. They re-label a random sample of traces they labelled earlier, for example a week before, without seeing their earlier labels. You expect the same verdicts, so any inconsistency shows how reliable that annotator is. Fatigue, stress or time pressure can make the same person label differently on different days.

    Other related techniques, in one line each:

    - **Chance-corrected agreement statistics:** Cohen's kappa for two labellers; Fleiss' kappa or Krippendorff's alpha for more than two.
    - **Adjudication:** a third expert, or a discussion, resolves each disagreement, and the resolution goes into the labelling guide.

    For most eval work, especially when speed matters or you are starting out, the single lead expert (Hamel Husain's benevolent dictator) with a labelling guide is the way to go. Start simple and add these techniques later, only when the evals are critical, the resources are available and your eval practice is mature.

You can start in a shared spreadsheet with columns `trace_id | link to trace | input | output | failure_mode | label | reason | labeller | date`, where `label` is pass or fail. An annotation tool is much better than raw JSON in a spreadsheet; [Module 11](11-tools.md) describes the workflow and the minimum features to look for.

!!! warning "Who labels matters"
    Do not hand labelling to whoever is available. A non-expert will mark confidently wrong answers as correct. The domain expert's time is the scarcest input to the whole process, so spend it on reading real traces, not on writing long rubrics.

**Done when:** you have a ranked list of failure modes with counts, approved by the lead expert and the product owner.

## Key takeaways

- **Read real traces before writing any metric or rubric.** Generic scores hide what is actually breaking.
- The expert notes the **first thing that went wrong** on each trace; you group the notes into **failure modes** and count them.
- Keep going until new traces stop revealing new failure modes.
- **Labels come from one lead domain expert** (the "benevolent dictator"), guided by a written labelling guide. Checks with several labellers are worth adding later, and only when the evals are critical and you have the resources.

## Check your understanding

??? question "Why does the expert note only the first thing that went wrong?"
    Later problems are often consequences of the first one, and noting everything slows the session down. The first failure is usually the one to fix, and it keeps the notes easy to group.

??? question "If you do add a second labeller and you agree on 95% of traces, is the labelling guide good enough?"
    Not necessarily. If 95% of traces pass, you could agree 95% of the time by both marking everything "pass". Check your agreement on the failures, or use a chance-corrected measure such as Cohen's kappa.

??? question "When do you stop reading traces?"
    When new traces stop revealing new kinds of failure, for example when the last 20 traces added no new failure mode.

**Next:** [Module 5. Build your first checks](05-build-checks.md)
