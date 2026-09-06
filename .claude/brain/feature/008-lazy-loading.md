# Lazy Loading

- **Category:** Performance
- **Entry point:** `src/App.tsx`
- EditorPane/SchemaBuilder/DiffView and heavy libs (jspdf, json-schema-faker, jsonrepair) load on demand, not in the main bundle.
