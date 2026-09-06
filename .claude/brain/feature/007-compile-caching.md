# Compile Caching

- **Category:** Performance
- **Entry point:** `src/lib/validate.ts (compile)`
- Caches compiled ajv validators keyed by draft+schema so realtime typing doesn't recompile every keystroke.
