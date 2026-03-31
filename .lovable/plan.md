

## Plan: Fix Co-founder Registration Edge Function

### Problem

Two issues identified:

1. **Function not processing requests**: Edge function logs show only boot events -- no request processing logs appear at all. This means the `serve()` handler never executes, likely due to incompatible esm.sh imports or deno.lock issues.
2. **Authorization too restrictive**: Current logic only allows the emprendimiento **owner** or an **admin** to create co-founders. User wants all beneficiarios and co-founders linked to the emprendimiento to be able to add new co-founders.

### Fix 1: Stabilize imports and redeploy

**File:** `supabase/functions/register-cofundador/index.ts`

- Replace `https://esm.sh/@supabase/supabase-js@2.38.4` with `npm:@supabase/supabase-js@2`
- Replace `https://deno.land/x/zod@v3.22.4/mod.ts` with `npm:zod@3`
- Replace `https://deno.land/std@0.168.0/http/server.ts` serve with `Deno.serve` (native, no import needed)
- Delete `deno.lock` if present

### Fix 2: Expand authorization to members

**File:** `supabase/functions/register-cofundador/index.ts`

- After checking if caller is owner or admin, also check if caller is a member of the emprendimiento via `emprendimiento_miembros` table.
- New logic: allow if `caller.id === emprendimiento.user_id` OR `isAdmin` OR caller exists in `emprendimiento_miembros` for that emprendimiento.

### Fix 3: Better error handling on client

**File:** `src/components/profile/ProfileCoFounders.tsx`

- When `supabase.functions.invoke` returns non-2xx, the `error` object has a generic message but `data` may contain the real error. Update `handleSubmit` to check `data?.error` before throwing `error`.

### Technical detail

The edge function will be rewritten with stable `npm:` imports and `Deno.serve()`:

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = { ... };

Deno.serve(async (req) => {
  // ... same logic but with expanded auth check:
  const { data: isMember } = await supabaseAdmin
    .from('emprendimiento_miembros')
    .select('id')
    .eq('emprendimiento_id', validatedData.emprendimiento_id)
    .eq('user_id', caller.id)
    .maybeSingle();

  if (emprendimiento.user_id !== caller.id && !isAdmin && !isMember) {
    return 403;
  }
});
```

