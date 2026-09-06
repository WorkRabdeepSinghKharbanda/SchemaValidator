---
protected_branches: ["archive"]
---

# Branching strategy

Personal solo project. No feature-branch/PR workflow — commits go straight to `master`.

## Deploy

After every push to `master`, run the deploy CLI directly from the terminal — don't rely solely on Vercel's git-integration auto-deploy:

```
vercel --prod --yes
```

Then verify with a quick `curl -s -o /dev/null -w "%{http_code}\n" https://schema-validator-livid.vercel.app/` (expect `200`).
