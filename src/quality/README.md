# Frontend architecture invariants

The executable gate in `architecture-gates.mjs` keeps routing, navigation, permissions, financial UI semantics, and runtime logging from drifting apart.

The SideNav is a renderer only; navigation policy lives in the declarative manifest and its route permission requirements must mirror the central route registry. Lazy page imports remain outside the route registry. Raw `console.*` is restricted to the environment bootstrap and the sanitized client logger, and the largest legacy pages have no-growth budgets until they are decomposed.

The GitHub Actions workflow runs the gate plus the dependency-free frontend contract suite on every push and pull request.
