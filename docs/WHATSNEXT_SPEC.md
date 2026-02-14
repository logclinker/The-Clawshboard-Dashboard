# WHATSNEXT.md spec (Clawshboard)

Goal: standardize “what’s next” across sessions/projects/agents so Clawshboard can render it as actionable cards.

## File name
- Preferred: `WHATSNEXT.md`

## Locations (v1)
- Agent workspace root: `<agentWorkspace>/WHATSNEXT.md`
- Project/task folders (later): `<workspace>/projects/<name>/WHATSNEXT.md`

## Format
Markdown with a strict header block at the top.

### Required header fields

```
STATE: ACTIVE | BLOCKED | COMPLETED
TITLE: <short human title>
OWNER: <agentId|human>
UPDATED: <ISO-8601>
```

### Optional fields

```
LINKS:
- <url or path>
RELATED_SESSIONS:
- <sessionId or sessionKey>
BLOCKERS:
- <text>
NEXT:
- <text>
RESULTS:
- <text>
```

## Behavior
- STATE=ACTIVE/BLOCKED: show NEXT as checklist.
- STATE=COMPLETED: show RESULTS prominently; NEXT optional.
- If header missing: Clawshboard renders raw markdown and marks card “unstructured”.
