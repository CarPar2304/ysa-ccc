

## Plan de Corrección: Login de Stakeholder con Pantalla en Blanco

### Problema Identificado

El usuario stakeholder `itc-ysa@ccc.org.co` está experimentando una pantalla en blanco al intentar ingresar a la aplicación. Esto ocurre porque hay un **loop de redirección infinito**.

### Causa Raíz

En `src/pages/Dashboard.tsx`, el código actual tiene las siguientes condiciones que no incluyen a los stakeholders:

```typescript
// Línea 40: No extrae isStakeholder
const { isBeneficiario, isAdmin, loading: roleLoading, userId } = useUserRole();

// Línea 49: No carga datos para stakeholders
if (isBeneficiario || isAdmin) {
  fetchPosts();
}

// Línea 136: Redirige stakeholders a RoleRedirect
if (!isBeneficiario && !isAdmin) {
  return <RoleRedirect />;
}
```

El problema es que cuando un stakeholder entra:
1. No es beneficiario ni admin, entonces se activa `RoleRedirect`
2. `RoleRedirect` detecta que es stakeholder y lo redirige a `/` (Dashboard)
3. El Dashboard vuelve a activar `RoleRedirect`
4. Loop infinito → pantalla en blanco

### Solución Propuesta

Actualizar `Dashboard.tsx` para incluir correctamente el rol stakeholder:

1. **Extraer `isStakeholder` del hook**
   ```typescript
   const { isBeneficiario, isAdmin, isStakeholder, loading: roleLoading, userId } = useUserRole();
   ```

2. **Incluir stakeholder en la carga de datos**
   ```typescript
   if (isBeneficiario || isAdmin || isStakeholder) {
     fetchPosts();
     fetchUserAvatar();
   }
   ```

3. **Incluir stakeholder en la verificación de acceso**
   ```typescript
   if (!isBeneficiario && !isAdmin && !isStakeholder) {
     return <RoleRedirect />;
   }
   ```

4. **Excluir a stakeholder de la verificación de cupo aprobado**
   Los stakeholders no necesitan tener cupo aprobado ya que su acceso es completo a YSA Conecta:
   ```typescript
   if (isBeneficiario && !isApproved) {
     // Mostrar mensaje de acceso restringido solo para beneficiarios
   }
   ```

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Dashboard.tsx` | Agregar `isStakeholder` a las verificaciones de acceso y carga de datos |

### Verificación

Después de implementar estos cambios:
- El usuario `itc-ysa@ccc.org.co` podrá iniciar sesión correctamente
- Tendrá acceso completo a YSA Conecta (Dashboard) como se especificó en los requisitos del rol stakeholder
- Podrá crear y ver publicaciones sin necesidad de tener un cupo aprobado

