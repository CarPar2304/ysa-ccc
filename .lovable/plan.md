

## Plan: Stakeholder Access Filters Management

### What this does
Allows admins to configure per-stakeholder data access restrictions based on filterable variables (e.g., municipio = "Buga"). Each stakeholder can have multiple filter rules, and they'll only see data matching those filters. Stakeholders with no filters see everything (current behavior preserved).

### Database Changes

**New table: `stakeholder_filtros`**
```
id          uuid PK
user_id     uuid NOT NULL (references the stakeholder's user ID)
campo       text NOT NULL (e.g., "municipio", "departamento", "ubicacion_principal")
valor       text NOT NULL (e.g., "Buga", "Valle del Cauca")
activo      boolean DEFAULT true
created_at  timestamptz DEFAULT now()
```
- Unique constraint on `(user_id, campo, valor)` to prevent duplicates.
- RLS: only admins can CRUD; stakeholders can SELECT their own rows.

**New SECURITY DEFINER function: `get_stakeholder_filtered_user_ids(uuid)`**
Returns the set of user IDs a stakeholder is allowed to see. Logic:
1. Query `stakeholder_filtros` for the given stakeholder.
2. If no active filters exist, return NULL (meaning "no restriction").
3. If filters exist on `municipio`/`departamento` (usuario fields): filter `usuarios` table.
4. If filters exist on `ubicacion_principal` (emprendimiento field): filter via `emprendimientos`.
5. Return intersection of all matching user IDs.

**Updated RLS policies** -- The existing stakeholder SELECT policies on tables like `emprendimientos`, `usuarios`, `equipos`, `financiamientos`, `diagnosticos`, `evaluaciones`, etc. currently use `is_stakeholder(auth.uid())`. These will be updated to additionally check the filter function. For example:
```sql
-- Before
USING (is_stakeholder(auth.uid()))
-- After  
USING (
  is_stakeholder(auth.uid()) 
  AND (
    get_stakeholder_filtered_user_ids(auth.uid()) IS NULL
    OR <table>.user_id = ANY(get_stakeholder_filtered_user_ids(auth.uid()))
  )
)
```
This preserves full access for stakeholders without filters and restricts those with filters.

### Admin UI Changes

**New component: `StakeholderAccessManager`**
- Added as a new tab "Stakeholders" in the Admin panel (visible only to admins).
- Lists all stakeholder users (fetched via `user_roles` where role = 'stakeholder').
- For each stakeholder, shows current active filters as badges.
- "Add Filter" form with:
  - Dropdown for field: `municipio`, `departamento`, `ubicacion_principal` (expandable later).
  - Text input or dynamic dropdown for value (populated from distinct values in the DB).
- Delete button per filter row.

### Files to create/modify
1. **Migration SQL** -- new table, function, and updated RLS policies.
2. **`src/components/admin/StakeholderAccessManager.tsx`** -- new component.
3. **`src/pages/Admin.tsx`** -- add "Stakeholders" tab for admins.

### Safety
- All existing RLS policies for non-stakeholder roles remain untouched.
- Stakeholders without any filter rows retain full access (backward compatible).
- The filter function uses `SECURITY DEFINER` to avoid recursion.
- Client-side filtering in Dashboard/Stats components will also respect these filters by querying only the data RLS allows.

