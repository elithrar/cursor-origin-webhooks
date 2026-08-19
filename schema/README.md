# Origin OpenAPI snapshot

`origin-openapi.yaml` was downloaded from Cursor's published Origin API
specification on August 19, 2026:

```text
https://cursor.com/docs/api/origin/openapi.yaml
```

To refresh the generated webhook types:

```sh
curl -fsSL https://cursor.com/docs/api/origin/openapi.yaml \
  -o schema/origin-openapi.yaml
npm run generate:types
```

The generator follows schema references from the documented webhook payload
families and writes only their transitive type dependencies to
`src/generated/origin-openapi.ts`.
