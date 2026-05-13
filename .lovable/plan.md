## Objetivo

Reducir el **Cached Egress** de Supabase Storage sin romper la carga ni la revisión de entregas. Actualmente las entregas (`entregas` bucket) ya se firman bajo demanda (al hacer clic en `EntregaFileLink`), por lo que el mayor consumo proviene de **imágenes públicas servidas a tamaño original** (avatares, post-images, lab-images, mentor-images, noticias) y de **subidas sin compresión ni límite**.

## Diagnóstico clave

- `entregas` bucket: ya es privado y los archivos solo se firman al hacer clic. ✓
- Buckets **públicos** (`avatars`, `post-images`, `lab-images`, `mentoria-images`): se renderizan con `getPublicUrl()` a resolución original en cards, listas, feed y módulos → cada vista repetida = egress completo del archivo.
- Subida sin validación de tamaño máximo ni compresión → se almacenan PDFs/imagenes de 10–50MB que después se sirven enteros.
- Listados de entregas hacen `select("*")` que trae solo metadata JSON (no bytes), pero es buena práctica limitar columnas.

## Cambios a implementar

### 1. Helper único de imágenes con transformaciones de Supabase
Crear `src/lib/imageUrl.ts` con dos funciones:

- `getThumbUrl(bucket, path, { width, quality })` → usa `getPublicUrl` con `transform: { width, quality, resize: 'cover' }` para devolver una variante optimizada (Supabase la cachea en CDN).
- `getOriginalUrl(bucket, path)` → solo para vistas de detalle/lightbox.

Tamaños sugeridos:
- Avatares (32–48px UI): `width=96, quality=70`
- Post images en feed cards: `width=720, quality=75`
- Lab/módulo images en cards: `width=480, quality=75`
- Mentor cards: `width=400, quality=75`
- Noticias en listados: `width=720, quality=75`
- Vista detalle (modal/post abierto): `width=1280, quality=80`

### 2. Reemplazar usos de `getPublicUrl` directos por el helper
Archivos a tocar:
- `src/components/dashboard/PostCard.tsx` — avatar autor (96px) + imagen del post (720px en card, original solo si se abre).
- `src/pages/Dashboard.tsx` — avatares en feed.
- `src/components/dashboard/CreatePost.tsx` — preview local (sin egress) ya está bien.
- `src/components/news/NewsCard.tsx` y `src/pages/News.tsx` — thumb 720px; `NewsDetail.tsx` puede usar 1280px.
- `src/components/lab/*` (`ModuleEditor`, `ClassEditor`, `TaskEditor`) — al subir, guardar la **ruta** (no la URL pública) y al renderizar usar el helper. Para módulos/clases listados: 480px.
- `src/components/mentor/AsesoriasManager.tsx`, `MisAsesorias.tsx`, mentor cards — 400px en listados.
- `src/components/profile/*` y header/sidebar avatars — 96px.

### 3. Compresión y validación al subir
Crear `src/lib/uploadImage.ts`:
- Aceptar `File`, redimensionar a max 1600px lado mayor con `<canvas>` y exportar como JPEG `quality=0.82` (o WebP si lo soporta el navegador).
- Validar tipo y tamaño:
  - Imágenes: max 5MB después de comprimir → reject si entrada >25MB.
  - PDFs/docs (entregas): max 15MB por archivo, max 50MB por entrega.
- Mostrar toast claro al usuario cuando excede.

Aplicar en:
- `TaskSubmission.tsx` (entregas) — solo validación de tamaño + cantidad; no comprimir documentos no-imagen, pero si el archivo es imagen, comprimirla.
- `CreatePost.tsx`, `NewsEditor.tsx`, `ModuleEditor.tsx`, `ClassEditor.tsx`, `TaskEditor.tsx`, `AsesoriasManager.tsx`, edición de avatar de perfil → siempre comprimir antes de subir.

### 4. Listados de entregas más livianos
- `MentorEntregas.fetchEntregas` y `ModuleDeliverables.fetchAllEntregas`: cambiar `select("*")` por columnas explícitas (`id, tarea_id, user_id, comentario, archivos_urls, estado, feedback, nota, fecha_entrega`). No carga bytes pero reduce payload y aclara intención.
- Confirmar que **ningún componente** intenta `fetch()` o `<img src>` apuntando a archivos de `entregas` para preview en la lista. Hoy `EntregaFileLink` solo firma URL al `onClick` ✓ — mantener.
- Quitar regeneración de URLs firmadas en cada render: `EntregaFileLink` solo firma cuando el usuario hace clic ✓.

### 5. Auditar refetch / polling
- `MentorEntregas` → `useEffect([userId])` solo carga una vez ✓. Verificar que `updateEntrega` actualice estado local sin refetch ✓ (ya lo hace).
- `ModuleDeliverables` → tiene dos `useEffect` (tareas y entregas). Asegurar que al guardar feedback NO se llame `fetchAllEntregas` (ya usa update local ✓).
- Revisar `usePendingTasks` para que no re-consulte storage en intervalos.

### 6. Exportación a Excel — diferir generación de links
En `MentorEntregas.handleExportExcel` y `ModuleDeliverables.handleExport`: en vez de firmar URL de **cada archivo** de cada entrega (lo que multiplica llamadas a la API de signing), exportar **rutas** y un único link al panel de la entrega; o pedir confirmación y mostrar progreso. Mantener firma solo si el admin lo solicita explícitamente con un toggle "incluir enlaces firmados (7 días)".

### 7. Cache HTTP en imágenes públicas
- Confirmar (en migración) que los buckets públicos sirven con `Cache-Control: max-age=31536000` (Supabase ya lo hace por defecto). Asegurarse de que ningún componente concatene `?t=${Date.now()}` u otro buster. Buscar y eliminar.

### 8. Documentación
Actualizar `mem://tech-standards/file-download-system` con: "Para imágenes públicas, usar `getThumbUrl` (transformaciones de Supabase). Nunca renderizar `getPublicUrl` directo en listados. Siempre validar tamaño y comprimir imágenes antes de subir."

## Detalles técnicos

```text
src/
├── lib/
│   ├── imageUrl.ts          (NEW)  helper getThumbUrl / getOriginalUrl
│   ├── uploadImage.ts       (NEW)  compressImage + validateUpload
│   └── entregaStorage.ts    (sin cambios — ya lazy)
├── components/
│   ├── dashboard/PostCard.tsx, Dashboard.tsx, CreatePost.tsx
│   ├── news/NewsCard.tsx, NewsEditor.tsx
│   ├── lab/ModuleEditor.tsx, ClassEditor.tsx, TaskEditor.tsx,
│   │       TaskSubmission.tsx, ModuleDeliverables.tsx
│   ├── mentor/AsesoriasManager.tsx, MisAsesorias.tsx, MentorEntregas.tsx
│   └── profile/ProfileBasicInfo.tsx (avatar upload)
└── pages/
    ├── News.tsx, NewsDetail.tsx, Profile.tsx
```

API de transformaciones de Supabase (gratuita):
```ts
supabase.storage.from(bucket).getPublicUrl(path, {
  transform: { width: 480, quality: 75, resize: 'cover' }
})
```

## Validación

- Antes/después: comparar tamaño de payload de la pestaña Network al cargar Dashboard, News, Lab, Mentor entregas.
- Verificar que avatares y posts se ven nítidos en pantallas retina (subir width × 2 si hace falta).
- Verificar que TaskSubmission rechaza un archivo > 15MB con toast claro.
- Confirmar que abrir/cerrar modal de entrega NO genera nuevas llamadas a Storage.

## Fuera de alcance

- Migrar archivos de `entregas` a almacenamiento externo.
- Refactor del feed Conecta para evitar joins a `usuarios` (tema separado de seguridad).
- Cambio de plan de Supabase.
