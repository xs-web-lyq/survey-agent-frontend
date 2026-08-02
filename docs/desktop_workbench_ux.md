# Research Copilot Desktop Workbench — UX-D0

Status: approved information architecture for desktop implementation.

## Product model

The interface uses four user-visible objects:

- **Project** — one research scope and knowledge-base configuration.
- **Thread** — a conversation or branched exploration inside a project.
- **Run** — one retriable execution attempt with a persistent timeline.
- **Artifact** — a versioned research brief, evidence matrix, outline, survey,
  bibliography, or exported file.

Ordinary chat, brainstorming, evidence research, and survey writing share the
same shell, but expose different workspaces and completion gates.

## Desktop layout

The default 1440 x 960 layout contains:

1. 64 px global navigation rail.
2. 248–320 px project/thread sidebar.
3. Flexible run timeline and conversation canvas.
4. 320–420 px contextual artifact inspector.
5. Persistent 28 px connection/runtime status strip.

All three content panels are resizable. The inspector can collapse below
1180 px; the sidebar collapses below 900 px. Width preferences are local user
settings and are not synchronized into research data.

## Center timeline

The center surface renders run events, not transient component state:

- user request;
- plan and user-facing thinking summaries;
- retrieval rounds and research-question coverage;
- tool requests, approvals, starts, results, and failures;
- streamed answer;
- verification and quality gates;
- retry lineage and final status.

Completed low-level events collapse into a summary. Failed or approval-blocked
events remain expanded. Refreshing, switching threads, or restarting Electron
must reconstruct the same timeline from persisted events.

Raw private chain-of-thought is never displayed. The UI shows concise process
summaries, evidence decisions, tool inputs/outputs, and validation results.

## Context inspector

The right panel follows the selected run or artifact:

| Mode | Primary content |
| --- | --- |
| Brief | goals, constraints, research questions, handoff action |
| Evidence | question coverage, source diversity, gaps, retrieval rounds |
| Sources | bibliographic completeness, citation anchors, source preview |
| Outline | section status, dependencies, evidence readiness |
| Survey | editable artifact, references, quality report, versions |
| Tool | normalized input/output, risk, executor, approval decision |

The user may pin a mode so selection changes do not replace the panel.

## Navigation

Global rail: Home, Research, Survey, Artifacts, Automations, Settings.

Project sidebar groups: active threads, running tasks, recent artifacts,
archived items, and recycle bin. Each item has one predictable context menu;
menus close on outside click, Escape, navigation, and window blur.

## Visual system

The product keeps the existing deep-space blue and cyan/violet identity.
Neutral surfaces carry reading content; color communicates state:

- cyan: active/running;
- violet: model planning/generation;
- green: verified/completed;
- amber: waiting, incomplete evidence, or warning;
- red: failed, denied, or destructive.

Motion is semantic: a slow cyan-violet edge shimmer while a run is active,
short transitions for event insertion, and no continuous motion after a run
settles. `prefers-reduced-motion` disables shimmer and spatial transitions.

Typography follows the codebase: Inter/PingFang SC/Microsoft YaHei for UI and
JetBrains Mono/Cascadia Code for identifiers, commands, and event payloads.

## Required states

Every major view is designed and tested for:

- empty project;
- active streaming run;
- waiting for approval;
- partial evidence and quality warning;
- failed run with retry;
- disconnected remote core;
- local MCP server unavailable;
- restored session after application restart;
- dark and light themes;
- keyboard-only navigation and reduced motion.

## Implementation checkpoints

1. Build a read-only workbench shell around existing chat data.
2. Replace transient timeline state with `/api/runs/{id}/events` replay.
3. Add inspector routing and artifact selection.
4. Add approval cards and Electron preload bridge.
5. Add desktop command palette and keyboard shortcuts.
