# Ara Research Full Stack Take-Home

Version: 2.2
Last updated: July 31, 2026

## Purpose

This challenge evaluates end-to-end ownership, integration/debugging quality, and systems thinking in an inherited fullstack codebase.

## What you receive

You receive a zip file containing this starter repository (`fullstack-challenge/`) with:

- `server/`: Node.js + Express + TypeScript API
- `client/`: Next.js 14 + MUI dashboard
- `simulator/`: webhook event generator script
- MongoDB Docker Compose setup
- Partial auth and event pipeline implementation

## Ground rules

- Timebox your work and prioritize an end-to-end working flow over breadth or polish.
- AI tools are expected and encouraged.
- We evaluate decisions, prioritization, and communication quality, not whether you wrote code from memory.
- Verify both the local dev flow and the production build (`npm run build`) before submission.
- Not every issue appears in the hot-reload path; part of the exercise is choosing effective verification steps.
- All written deliverables are mandatory. A working solution without required written artifacts will be scored significantly lower, regardless of code quality.

## Challenge: The Integration Puzzle

You inherited a first-pass webhook-driven notification system. It is incomplete and messy. Your job is to make the core flow work, implement the missing pipeline logic, fix the issues you consider most important, and explain your design decisions.

## Required deliverables

1. `FIXES.md`
   Include for each fix:
   - what was broken
   - how you identified and verified the issue
   - root cause
   - your fix and why you chose it

   Also note any important issue you deliberately left out of scope and why.

2. `DESIGN.md` (max two pages)
   Include:
   - the event-to-notification flow and its key boundaries
   - rule evaluation and handling of multiple matching rules or conflicts
   - reliability and error handling, including partial failures or duplicate events
   - one meaningful alternative you considered and why you rejected it
   - the first two changes you would make if traffic grew to 10,000 events per minute

Anchor the document in your implementation. We value specific tradeoffs over exhaustive prose.

## Suggested time budget

- Timebox: 6-8 focused hours
- Deadline window: 4 days
- If you reach the timebox, submit your strongest end-to-end solution and document remaining tradeoffs rather than extending the exercise.

## Submission

- Submit as a zip or private Git repository.
- Include `FIXES.md` and `DESIGN.md`.
- Keep setup instructions working.

## Live walkthrough (scored)

Duration: 30 minutes

1. 10 min: demo and key fixes
2. 15 min: design deep-dive and requirement twist questions
3. 5 min: your questions

The walkthrough contributes to your final evaluation.
