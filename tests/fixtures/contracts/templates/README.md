# Contract Fixture Templates

These templates are consumed by `scripts/verify-contracts.mjs`.

## Baton Pack Templates
- `sim-output.shape.template.json`
- `draft-thresholds.template.json`
- `trade-thresholds.template.json`
- `chemistry.template.json`
- `rivalry.template.json`

Copy templates into `tests/fixtures/contracts/` (outside `templates/`) and keep one fixture object per file.

## Fixture Shape
```json
{
  "id": "sim.output.score_fields",
  "contractType": "shape",
  "owner": "claude",
  "expected": {
    "home": "number",
    "away": "number"
  }
}
```

Optional threshold fixture:
```json
{
  "id": "draft.threshold.r1elite",
  "contractType": "threshold",
  "owner": "claude",
  "expected": 80,
  "tolerance": 0
}
```
