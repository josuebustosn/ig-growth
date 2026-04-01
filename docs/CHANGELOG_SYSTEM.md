# Sistema de Changelog

Este documento describe cómo implementar un sistema de changelog en proyectos web.

---

## Estructura de Archivos

```
proyecto/
├── public/
│   └── changelog.json      # Datos del changelog
├── app/
│   └── changelog/
│       └── page.tsx        # Página de changelog
```

---

## Formato del JSON

```json
[
  {
    "version": "X.Y",
    "date": "YYYY-MM-DD",
    "title": "Título descriptivo de la versión",
    "changes": [
      {
        "type": "feature|fix|deploy",
        "description": "Descripción del cambio"
      }
    ]
  }
]
```

### Tipos de cambios

| Tipo | Emoji | Uso |
|------|-------|-----|
| `feature` | ✨ | Nueva funcionalidad |
| `fix` | 🔧 | Corrección de bugs o mejoras |
| `deploy` | 🚀 | Cambios de infraestructura/deployment |

---

## Versionado

Usar **Semantic Versioning simplificado**:

- **Major.Minor** (ej: 1.0, 1.1, 2.0)
- **Major**: Cambios disruptivos o rediseños completos
- **Minor**: Nuevas features o mejoras significativas

---

## Integración en UI

1. **Badge de versión** en el header que linkea a `/changelog`
2. **Título** incluye la versión actual

```tsx
<h1>NombreApp {VERSION}</h1>
<a href="/changelog">v{VERSION}</a>
```

---

## Proceso para agregar nuevas versiones

1. Editar `public/changelog.json`
2. Agregar nuevo objeto al inicio del array
3. Actualizar versión en:
   - `app/layout.tsx` (metadata.title)
   - `app/page.tsx` (título visible)
   - `app/changelog/page.tsx` (título visible)
4. Commit con mensaje: `release: vX.Y - Descripción`

---

## Ejemplo de commit para nueva versión

```bash
git add .
git commit -m "release: v1.2 - Sistema de notificaciones"
git push
```
