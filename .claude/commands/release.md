# /release — GitHub Release Automático

Determina el bump de versión por conventional commits, actualiza archivos, commitea, tagea y crea el GitHub release.

## Uso
```
/release              # versión automática por tipo de commits
/release 2.0.0        # fuerza una versión específica
```

El argumento es: `$ARGUMENTS`

---

## Pasos

### 1. Verificar prerequisitos

```bash
gh auth status
```

Si falla, decirle al usuario que ejecute `! gh auth login` y detener.

Verificar también que no haya cambios sin commitear:
```bash
git status --short
```

Si hay cambios sin stagear, advertir y detener.

---

### 2. Leer estado actual

```bash
# Versión actual
node -e "console.log(require('./package.json').version)"

# Último tag (puede no existir)
git describe --tags --abbrev=0 2>/dev/null || echo "none"
```

Luego obtener commits desde el último tag (o todos si no hay tag):
```bash
# Si hay tag:
git log v<ultimo-tag>..HEAD --oneline --no-merges

# Si no hay tag:
git log --oneline --no-merges
```

---

### 3. Determinar nueva versión

**Si se pasó versión como argumento:** usar esa exactamente.

**Si no hay argumento — reglas de semver por conventional commits:**

Analizar los mensajes de commit:
- Contiene `BREAKING CHANGE` (en cuerpo) o `<tipo>!:` → bump **major**, resetear minor y patch a 0
- Contiene `feat:` o `feat(` → bump **minor**, resetear patch a 0
- Solo tiene `fix:`, `chore:`, `docs:`, `refactor:`, `build:`, `ci:`, `perf:`, `test:` → bump **patch**
- Si no hay commits o no se puede determinar → bump **patch**

Ejemplo: `1.0.0` + commits de fix → `1.0.1`
Ejemplo: `1.2.3` + `feat(search): ...` → `1.3.0`
Ejemplo: `1.2.3` + `feat!: ...` → `2.0.0`

---

### 4. Actualizar archivos de versión

**`package.json`** — campo `"version"`:
```json
"version": "NUEVA_VERSION"
```

**`android/app/build.gradle`** — dos campos:
```
versionCode <versionCode_actual + 1>
versionName "NUEVA_VERSION"
```

Usar la herramienta Edit para hacer los cambios exactos.

---

### 5. Commit, tag y push

```bash
git add package.json android/app/build.gradle
git commit -m "chore(release): v<nueva_version>"

> **IMPORTANTE:** Nunca agregar `Co-Authored-By: Claude` ni ninguna atribución de Claude en los mensajes de commit.
git tag v<nueva_version>
git push origin main
git push origin v<nueva_version>
```

---

### 6. Generar changelog

Agrupar los commits por tipo en este formato markdown:

```markdown
## What's Changed

### ✨ Features
- feat(scope): descripción (abc1234)

### 🐛 Bug Fixes
- fix(scope): descripción (def5678)

### 🔧 Other
- chore/docs/refactor/etc (ghi9012)

**Full Changelog:** https://github.com/<owner>/<repo>/compare/v<version_anterior>...v<nueva_version>
```

Si no hay tag anterior (primer release), omitir la línea "Full Changelog".

Para obtener owner/repo:
```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

---

### 7. Crear GitHub release

```bash
gh release create v<nueva_version> \
  --title "v<nueva_version>" \
  --notes "<changelog>"
```

---

### 8. Reportar resultado

Mostrar resumen:
- Bump: `1.0.0` → `1.0.1` (patch — N commits de fix)
- versionCode: `1` → `2`
- Tag creado: `v1.0.1`
- Release URL: <url devuelta por gh>

---

## Notas

- El APK se buildea y adjunta **automáticamente** — el workflow `.github/workflows/release-apk.yml` se dispara al publicar el release y adjunta el APK al mismo release
- `versionCode` debe ser siempre mayor al anterior en Google Play — este comando lo incrementa en 1 por release
- Los commits de estilo `fix(build):` o `feat(ui):` siguen contando como fix/feat respectivamente
- Asegurarse de que `gh release create` **no** use `--draft` para que el workflow se dispare
