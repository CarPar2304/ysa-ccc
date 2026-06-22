## Root cause

Logs of `download-entregas-modulo` show:

```
hasAuth: true
getUser error: Auth session missing!
```

The function creates a Supabase client with the user's `Authorization` header in `global.headers` and then calls `userClient.auth.getUser()` with no argument. In current `@supabase/supabase-js@2`, that path requires a stored session and throws "Auth session missing!" even when a valid Bearer token is present in the headers. That is why even the admin (`carlosparedesmiranda@gmail.com`) gets `401 No autorizado: token inválido o expirado`.

`match-asistencia-ia` has the identical pattern, so once any user reaches the auth check it returns 401 and the frontend surfaces it as `Edge Function returned a non-2xx status code`.

## Fix

In both `supabase/functions/download-entregas-modulo/index.ts` and `supabase/functions/match-asistencia-ia/index.ts`:

1. Parse the JWT from the `Authorization` header (`token = authHeader.replace(/^bearer\s+/i, "")`).
2. Validate it explicitly by passing the token: `await admin.auth.getUser(token)` (service-role client + explicit JWT — this works without a session).
3. If invalid/expired, return 401 with the user's email when available for easier debugging.
4. Keep the existing permission check (`user_roles` + `mentor_operadores`) using the service-role client.

No frontend changes required — `Estudiantes.tsx` already sends `Authorization: Bearer <token>` and `apikey`, and `AttendanceManager.tsx` uses `supabase.functions.invoke` which sends the session token.

## Verification

After redeploying both functions:

1. Call `download-entregas-modulo` via `supabase--curl_edge_functions` with an explicit `Authorization: Bearer <admin token>` and the current `modulo_id`. Expect a ZIP response or a meaningful 4xx (e.g. "No hay entregas") — not 401.
2. Call `match-asistencia-ia` the same way with a small payload (`nivel`, one `not_found_emails` item) and confirm a 200 JSON with `suggestions` (OpenAI key is already present as `OPENAI_API_KEY`).
3. Inspect `supabase--edge_function_logs` for both functions to confirm no `Auth session missing!` errors.
4. Ask the user to retry "Descargar entregables" and "Analizar con IA" in the UI.

## Files touched

- `supabase/functions/download-entregas-modulo/index.ts` — switch auth validation to `admin.auth.getUser(token)`.
- `supabase/functions/match-asistencia-ia/index.ts` — same change.
