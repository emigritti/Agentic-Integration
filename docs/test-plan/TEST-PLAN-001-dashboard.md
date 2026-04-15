# TEST-PLAN-001: Agent Dashboard — Frontend

## Scope
React dashboard displaying agent cards and triggering execution feedback.

## Test Layers

### Unit Tests (primary quality signal)
| ID | Component | Scenario | Expected |
|----|-----------|----------|----------|
| U-01 | AgentCard | renders agent name | name text visible |
| U-02 | AgentCard | renders agent description | description text visible |
| U-03 | AgentCard | click triggers onRun callback | onRun called with agent object |
| U-04 | Dashboard | renders all 7 agent cards | all names visible |
| U-05 | Dashboard | click card → snackbar appears | alert role present in DOM |
| U-06 | Dashboard | snackbar message contains agent name | message includes agent name |

### Integration Tests (future)
- Docker container starts and serves the built app on port 3000
- Health check: HTTP 200 on `/`

### Non-functional
- Bundle size < 5 MB (gzipped < 1.5 MB)
- First Contentful Paint < 2 s on localhost

## Test Commands
```bash
# Run all unit tests
cd frontend && npm test

# Single test file
cd frontend && npm test -- AgentCard
```

## Traceability
- ADR-001 → this test plan
- U-01…U-06 → `frontend/src/__tests__/`
