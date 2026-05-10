---
title: Findest du was dazu?
Validate Svelte 5 native federatation build patterns (esbuild-svelte + NF RC10) against real OSS examples 

author: lutzleonhardt
share_url: https://lutzleo.sourcegraph.app/deepsearch/0e20aeec-b8a1-4b70-a546-b9c978cc02a9
created: 2026-05-10T10:50:54Z
updated: 2026-05-10T10:59:22Z
---

# Findest du was dazu?
Validate Svelte 5 native federatation build patterns (esbuild-svelte + NF RC10) against real OSS examples


Jetzt habe ich ein vollstandiges Bild. Lass mich die Kernfunde zusammenfassen - mit besonderem Fokus auf Svelte 5 + esbuild-svelte + NF RC10.

---

## Ergebnis der Recherche

**Kurze Antwort:** Es gibt **kein einziges OSS-Beispiel**, das Svelte 5 + `esbuild-svelte` + Native Federation RC10 kombiniert. Hier ist der vollstandige Befund:

---

### Was gefunden wurde

#### 1. Native Federation RC10 / v4.x - Core Repository

Das offizielle Repository ist [github.com/native-federation/native-federation-core](https://lutzleo.sourcegraph.app/r/github.com/native-federation/native-federation-core/) (v4 / aktuelle Generation). RC10 wurde am 2026-04-06 getaggt ([`v4.0.0-RC10`](https://lutzleo.sourcegraph.app/r/github.com/native-federation/native-federation-core@16d2387/-/blob/packages/core/package.json)), inzwischen ist `v4.1.3` stabil.

**RC10-relevante Änderungen** (vs. RC9):
- esbuild bump `^0.27.x` → **`^0.28.0`** in [`packages/core/package.json`](https://lutzleo.sourcegraph.app/r/github.com/native-federation/native-federation-core/-/blob/packages/core/package.json)
- `@softarc/native-federation-runtime` wechselt auf `workspace:^` (kein fester RC-Pin mehr)
- Verdaccio-Abhangigkeit aus dem Workspace entfernt

#### 2. Das esbuild-Adapter-Pattern (das du validieren willst)

Der kanonische Build-Flow stammt aus dem Legacy-Repo [github.com/angular-architects/module-federation-plugin](https://lutzleo.sourcegraph.app/r/github.com/angular-architects/module-federation-plugin/-/tree/libs/native-federation-esbuild/). Das zentrale Muster lautet ([`build-common.ts`](https://lutzleo.sourcegraph.app/r/github.com/manfredsteyer/native-federation-core-example/-/blob/build/build-common.ts)):

```typescript
// 1. Init
await federationBuilder.init({
  options: { workspaceRoot, outputPath, tsConfig, federationConfig },
  adapter: esBuildAdapter
});

// 2. Dein esbuild-Build (mit externals!)
await esbuild.build({
  entryPoints: [...],
  external: federationBuilder.externals,  // <-- kritisch
  bundle: true, format: 'esm', splitting: true,
  // plugins: [...] hier kamen esbuild-svelte rein
});

// 3. NF-Build (shared + exposed modules)
await federationBuilder.build();
```

Der [`esBuildAdapter`](https://lutzleo.sourcegraph.app/r/github.com/angular-architects/module-federation-plugin/-/blob/libs/native-federation-esbuild/src/lib/adapter.ts?L19-L21) akzeptiert ein `plugins`-Array:

```typescript
export function createEsBuildAdapter(config: EsBuildAdapterConfig) {
  // config.plugins wird in den esbuild.context()-Aufruf gereicht (Zeile 78)
  // -> hier würde esbuild-svelte als Plugin eingehängt
}
```

Das bedeutet: `esbuild-svelte` kann in **zwei** Positionen eingehängt werden:
- Im eigenen `esbuild.build()`-Call (Step 2) - für den App-Code
- Im `createEsBuildAdapter({ plugins: [sveltePlugin()] })` - für die shared/exposed Bundles

#### 3. Referenz-Beispiele und ihre Grenzen

| Repo | Svelte | NF-Version | esbuild-svelte | Status |
|---|---|---|---|---|
| [manfredsteyer/native-federation-core-example](https://lutzleo.sourcegraph.app/r/github.com/manfredsteyer/native-federation-core-example/) | Nein (React) | `^0.9.2-beta.4` (veraltet) | Nein | Zeigt Grundmuster |
| [Aukevanoost/native-federation-examples](https://lutzleo.sourcegraph.app/r/github.com/Aukevanoost/native-federation-examples/) | Nein (Angular) | aktuell | Nein | Angular-only |
| [native-federation/angular-examples](https://lutzleo.sourcegraph.app/r/github.com/native-federation/angular-examples/) | Nein | v4 | Nein | Angular-only |
| Svelte + NF | **nicht vorhanden** | - | - | **Lücke** |

Das NF-README selbst verweist fur Svelte auf ein **Vite**-basiertes Beispiel (`gioboa/svelte-microfrontend-demo`) - kein esbuild-svelte.

---

### Was das fur dein Build-Pattern bedeutet

Da keine echten OSS-Referenzen existieren, muss die Validierung gegen die bekannten Constraints erfolgen:

**Funktionieren sollte:**
- `esbuild-svelte` als Plugin im `esbuild.build()`-Step (App-Code) - das ist reines esbuild-Plugin-Interface
- `.svelte`-Dateien als `exposes`-Entries in `federation.config.js`

**Kritische Stolperstellen ohne OSS-Beleg:**

1. **Adapter-Plugin fur shared dependencies**: Der `createEsBuildAdapter` verarbeitet `node_modules`-Pakete via Rollup (`prepareNodePackage`), nicht via esbuild-Plugin. `esbuild-svelte` wird dort nicht aufgerufen - d.h. `.svelte`-Dateien in `node_modules` (unwahrscheinlich, aber moglich) werden nicht transformiert.

2. **Svelte 5 + ESM**: Svelte 5 liefert native ESM aus - das passt gut zu NFs Import-Map-Ansatz. `svelte` selbst muss aber korrekt in `shared` konfiguriert sein (singleton!), da sonst zwei Svelte-Runtimes geladen werden.

3. **esbuild `^0.28.0` (ab RC10)**: `esbuild-svelte` muss mit esbuild `0.28.x` kompatibel sein - pruf das in deinem `package.json`.

4. **`splitting: true` im App-Build**: Notwendig fur NF, aber esbuild-svelte muss damit umgehen konnen (tut es normalerweise).

**Empfohlene `federation.config.js`-Grundstruktur fur Svelte:**

```js
// remote/federation.config.js
const { withNativeFederation, shareAll } = require('@softarc/native-federation/build');

module.exports = withNativeFederation({
  name: 'svelte-remote',
  exposes: {
    './MyComponent': './src/MyComponent.svelte',
  },
  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
      includeSecondaries: false,
    }),
  },
  skip: ['esbuild-svelte'], // Build-Tool nicht sharen
});
```

**Fazit:** Das Pattern ist technisch ableitbar und konsistent mit der NF-Architektur, aber es gibt **keinen verifizierten OSS-Referenzfall** fur genau diese Kombination (Svelte 5 + esbuild-svelte + NF RC10/v4). Du bewegst dich auf Neuland - ein eigenes Minimal-Beispiel ware derzeit die beste Validation.

## Sources

- [type:commit (message:"native federation" OR message:"svelte 5" OR message:esbuild-svelte) repo:github.com count:50 timeout:60s](/search?q=type:commit%20%28message:%22native%20federation%22%20OR%20message:%22svelte%205%22%20OR%20message:esbuild-svelte%29%20repo:github.com%20count:50%20timeout:60s)
- [native-federation svelte esbuild](/search?q=patterntype:keyword%20native-federation%20svelte%20esbuild)
- [svelte 5 native federation esbuild plugin build](/search?q=patterntype:nls%20svelte%205%20native%20federation%20esbuild%20plugin%20build)
- [github.com/angular-architects/module-federation-plugin](/github.com/angular-architects/module-federation-plugin)
- [github.com/angular-architects/module-federation-plugin](/github.com/angular-architects/module-federation-plugin)
- [github.com/native-federation/native-federation-core](/github.com/native-federation/native-federation-core)
- [github.com/manfredsteyer/native-federation-core-example](/github.com/manfredsteyer/native-federation-core-example)
- [github.com/angular-architects/module-federation-plugin](/github.com/angular-architects/module-federation-plugin)
- [github.com/manfredsteyer/native-federation-core-example](/github.com/manfredsteyer/native-federation-core-example)
- [github.com/Aukevanoost/native-federation-examples](/github.com/Aukevanoost/native-federation-examples)
- [github.com/manfredsteyer/native-federation-core-example/build/build-remote.ts@8945fc1](/github.com/manfredsteyer/native-federation-core-example@8945fc1fe54b3f4e39d961d43c507c6038fa09c2/-/blob/build/build-remote.ts)
- [github.com/manfredsteyer/native-federation-core-example/build/build-common.ts@8945fc1](/github.com/manfredsteyer/native-federation-core-example@8945fc1fe54b3f4e39d961d43c507c6038fa09c2/-/blob/build/build-common.ts)
- [github.com/angular-architects/module-federation-plugin](/github.com/angular-architects/module-federation-plugin)
- [github.com/angular-architects/module-federation-plugin/libs/native-federation-esbuild/src/lib/adapter.ts@281bb91](/github.com/angular-architects/module-federation-plugin@281bb918f1478156aa12089aecac2c2be7bf6037/-/blob/libs/native-federation-esbuild/src/lib/adapter.ts)
- [github.com/manfredsteyer/native-federation-core-example/package.json@8945fc1](/github.com/manfredsteyer/native-federation-core-example@8945fc1fe54b3f4e39d961d43c507c6038fa09c2/-/blob/package.json)
- [github.com/manfredsteyer/native-federation-core-example](/github.com/manfredsteyer/native-federation-core-example)
- [github.com/manfredsteyer/native-federation-core-example/remote/federation.config.js@8945fc1](/github.com/manfredsteyer/native-federation-core-example@8945fc1fe54b3f4e39d961d43c507c6038fa09c2/-/blob/remote/federation.config.js)
- [github.com/native-federation/native-federation-core/README.md@a56b11a](/github.com/native-federation/native-federation-core@a56b11aa1f1d281291231f61ce8ce4694c26b317/-/blob/README.md)
- [github.com/Aukevanoost/native-federation-examples](/github.com/Aukevanoost/native-federation-examples)
- [github.com/angular-architects/module-federation-plugin](/github.com/angular-architects/module-federation-plugin)
- [type:commit (message:RC10 OR message:rc10 OR message:"release candidate 10") (repo:github.com/native-federation/native-federation-core OR repo:github.com/angular-architects/module-federation-plugin) count:50 timeout:60s](/search?q=type:commit%20%28message:RC10%20OR%20message:rc10%20OR%20message:%22release%20candidate%2010%22%29%20%28repo:github.com%2Fnative-federation%2Fnative-federation-core%20OR%20repo:github.com%2Fangular-architects%2Fmodule-federation-plugin%29%20count:50%20timeout:60s)
- [github.com/native-federation/native-federation-core](/github.com/native-federation/native-federation-core)
- [github.com/native-federation/native-federation-core (diff 16d23873e598739ff0560a3002b4fa7600453ed0~1...16d23873e598739ff0560a3002b4fa7600453ed0)](/github.com%2Fnative-federation%2Fnative-federation-core/-/compare/16d23873e598739ff0560a3002b4fa7600453ed0~1..16d23873e598739ff0560a3002b4fa7600453ed0)


---

# Ich habe noch zwei Repos hinzugefügt. Vielleicht findest du was über Modul Federation. Versuch's nochmal, bitte.Ob du vielleicht noch mehr rausbekommst?

Jetzt habe ich alles. Ich sehe das vollstandige Bild - lass mich die Ergebnisse klar und vollstandig zusammenfassen.

---

## Vollstandiger Befund - alle verfugbaren Repos

### Was die neuen Repos liefern

---

### 1. `module-federation/module-federation-examples` - Svelte + MF (Vite, nicht esbuild)

Das einzig echte Svelte+Federation-Beispiel im neuen Repo ist [`module-federation-vite-svelte`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/tree/module-federation-vite-svelte/). Es nutzt aber **nicht** esbuild-svelte oder Native Federation - sondern `@module-federation/vite` (Webpack-MF-Konzept, Vite-Adapter).

**Remote [`vite.config.ts`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/blob/module-federation-vite-svelte/remote/vite.config.ts):**
```typescript
import { federation } from '@module-federation/vite';     // <-- Webpack MF, nicht NF
import { svelte } from '@sveltejs/vite-plugin-svelte';    // <-- vite-plugin-svelte, nicht esbuild-svelte

export default defineConfig({
  plugins: [
    svelte(),
    federation({
      filename: 'remoteEntry.js',
      name: 'remote',
      exposes: { './remote-app': './src/App.svelte' },
    }),
  ],
  build: { target: 'chrome89' },
});
```

**Host [`App.svelte`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/blob/module-federation-vite-svelte/host/src/App.svelte?L7-L8) - Remote-Mounting-Pattern (Svelte 4 Stil):**
```svelte
<script lang="ts">
  const app = await import("remote/remote-app");
  new app.default({ target: remoteAppTarget });  // <-- Svelte 4 Klassen-API!
</script>
<div bind:this={remoteAppTarget} />
```

> **Kritischer Befund fur Svelte 5**: Diese Zeile `new app.default({ target: ... })` ist **Svelte 4 API**. In Svelte 5 wurde `mount(Component, { target })` eingefuhrt - die `new Component()` Instantiierung ist deprecated. Dieses Beispiel ist **nicht Svelte-5-kompatibel** und wurde mit `svelte: ^4.2.19` gebaut.

**Svelte-Konfiguration [`svelte.config.js`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/blob/module-federation-vite-svelte/remote/svelte.config.js):**
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default { preprocess: vitePreprocess() };
```

---

### 2. `module-federation/module-federation-examples` - `native-federation-react` (esbuild + NF v3)

Das [`native-federation-react`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/tree/native-federation-react/) Beispiel ist das aktuell beste OSS-Referenzbeispiel fur **esbuild + Native Federation** - aber fur React, nicht Svelte. Es enthalt wichtige Muster:

**Eigener Custom Adapter** ([`esbuild-adapter.ts`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/blob/native-federation-react/build/esbuild-adapter.ts)) - schlankere Alternative zum `@softarc/native-federation-esbuild`:
```typescript
export const esBuildAdapter: BuildAdapter = async options => {
  const { entryPoint, external, outfile } = options;
  await esbuild.build({
    entryPoints: [entryPoint], external, outfile,
    bundle: true, minify: true, format: 'esm', target: ['esnext'],
    // <-- kein plugins Array hier! Svelte-Plugin musste hier rein
  });
};
```

**CJS-zu-ESM-Workaround** ([`build-cjs.ts`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/blob/native-federation-react/build/build-cjs.ts)) - ein komplett eigener Post-Processing-Schritt nach `federationBuilder.build()`. Das Repo lost damit das CommonJS-Problem fur React - fur Svelte (das native ESM ausliefert) ware das **nicht notwendig**.

**Wichtige Beobachtung in [`build-common.ts`](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/blob/native-federation-react/build/build-common.ts?L54-L61):**
```typescript
await federationBuilder.build();
// Manifest should be ready by now! Apparently federationBuilder.build() does
// not wait until all internal promises are fulfilled.
await waitForManifest(workspaceRoot, outputPath);  // <-- expliziter Polling!
```
Das ist ein **dokumentierter Bug/Timing-Issue** in NF v3: `federationBuilder.build()` resolved bevor alle internen Promises erledigt sind. Nicht bekannt ob in v4/RC10 behoben.

**NF-Version:** `@softarc/native-federation: 3.3.1` (v3, **nicht v4/RC10**).

---

### 3. `manfredsteyer/native-federation-core-microfrontend` - Vanilla esbuild + NF v1

Zeigt das Grundmuster mit NF `^1.0.0` + esbuild `^0.15.5` - sehr veraltet, aber Vanilla-JS (Web Components). Kein Svelte.

---

### Gesamtbild aller Repos

| Repo | NF-Version | Build-Tool | Svelte | Svelte-Version | Status fur dich |
|---|---|---|---|---|---|
| [native-federation-core-example](https://lutzleo.sourcegraph.app/r/github.com/manfredsteyer/native-federation-core-example/) | `0.9.2-beta.4` | esbuild `0.15` | Nein (React) | - | Grundmuster, veraltet |
| [native-federation-core-microfrontend](https://lutzleo.sourcegraph.app/r/github.com/manfredsteyer/native-federation-core-microfrontend/) | `1.0.0` | esbuild `0.15` | Nein (Vanilla) | - | Grundmuster, veraltet |
| [native-federation-react](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/tree/native-federation-react/) | `3.3.1` | esbuild `0.25.9` | Nein (React) | - | **Aktuellstes esbuild+NF Beispiel** |
| [module-federation-vite-svelte](https://lutzleo.sourcegraph.app/r/github.com/module-federation/module-federation-examples/-/tree/module-federation-vite-svelte/) | n/a (MF/Vite) | Vite | Svelte 4 | `^4.2.19` | Svelte-MF-Pattern, aber falsche Toolchain |
| `NF v4/RC10 + esbuild-svelte + Svelte 5` | **nicht vorhanden** | - | - | - | **Lücke bleibt bestehen** |

---

### Konsolidierte Erkenntnisse fur dein Build-Pattern

Aus allen realen OSS-Beispielen lassen sich jetzt konkrete Ableitungen machen:

**1. Custom Adapter ist besser kontrollierbar als `esBuildAdapter` aus dem Package**

Das `native-federation-react`-Beispiel schreibt den Adapter selbst. Fur Svelte 5 + `esbuild-svelte` ware das:

```typescript
import sveltePlugin from 'esbuild-svelte';
import { BuildAdapter } from '@softarc/native-federation/build';

export const svelteBuildAdapter: BuildAdapter = async options => {
  const { entryPoint, external, outfile } = options;
  await esbuild.build({
    entryPoints: [entryPoint],
    external,
    outfile,
    bundle: true,
    format: 'esm',
    target: ['esnext'],
    plugins: [sveltePlugin({ compilerOptions: { runes: true } })], // Svelte 5 Runes
  });
};
```

**2. Svelte 5 Remote-Mounting im Host ist anders als im Vite-Beispiel**

Das Vite-Svelte-Beispiel nutzt `new app.default({ target })` - das ist Svelte 4. Fur Svelte 5 muss der Host so mounten:

```svelte
<!-- Svelte 5 Host -->
<script lang="ts">
  import { mount } from 'svelte';
  let container: HTMLElement;
  (async () => {
    const { default: RemoteApp } = await import('remote/remote-app');
    mount(RemoteApp, { target: container });
  })();
</script>
<div bind:this={container} />
```

**3. Der Timing-Bug bei `federationBuilder.build()`** ist in `native-federation-react` explizit mit einem Polling-Workaround umgangen. Pruf ob das in NF v4.x behoben ist (laut Changelog nicht explizit erw ahnt).

**4. CJS-Problem existiert fur Svelte nicht** - Svelte 5 liefert natives ESM, der `build-cjs.ts`-Workaround aus dem React-Beispiel entfallt komplett.

**5. `shared`-Konfiguration fur Svelte**: `svelte` muss zwingend als Singleton geteilt werden - zwei Svelte-Runtimes crashen garantiert.

## Sources

- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/manfredsteyer/native-federation-core-microfrontend](/github.com/manfredsteyer/native-federation-core-microfrontend)
- [svelte repo:github.com/module-federation/module-federation-examples](/search?q=patterntype:keyword%20svelte%20repo:github.com%2Fmodule-federation%2Fmodule-federation-examples)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/manfredsteyer/native-federation-core-microfrontend/build.ts@eb0232c](/github.com/manfredsteyer/native-federation-core-microfrontend@eb0232c8688d32a9a59a7ad25df6d8ffad4eedcb/-/blob/build.ts)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/manfredsteyer/native-federation-core-microfrontend](/github.com/manfredsteyer/native-federation-core-microfrontend)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/remote/vite.config.ts@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/remote/vite.config.ts)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/host/vite.config.ts@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/host/vite.config.ts)
- [github.com/manfredsteyer/native-federation-core-microfrontend/build/build-common.ts@eb0232c](/github.com/manfredsteyer/native-federation-core-microfrontend@eb0232c8688d32a9a59a7ad25df6d8ffad4eedcb/-/blob/build/build-common.ts)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/remote/package.json@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/remote/package.json)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/remote/svelte.config.js@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/remote/svelte.config.js)
- [github.com/manfredsteyer/native-federation-core-microfrontend/package.json@eb0232c](/github.com/manfredsteyer/native-federation-core-microfrontend@eb0232c8688d32a9a59a7ad25df6d8ffad4eedcb/-/blob/package.json)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/manfredsteyer/native-federation-core-microfrontend](/github.com/manfredsteyer/native-federation-core-microfrontend)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/remote/src/App.svelte@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/remote/src/App.svelte)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/host/src/App.svelte@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/host/src/App.svelte)
- [github.com/manfredsteyer/native-federation-core-microfrontend/mfe1/federation.config.js@eb0232c](/github.com/manfredsteyer/native-federation-core-microfrontend@eb0232c8688d32a9a59a7ad25df6d8ffad4eedcb/-/blob/mfe1/federation.config.js)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/host/package.json@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/host/package.json)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/host/svelte.config.js@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/host/svelte.config.js)
- [github.com/manfredsteyer/native-federation-core-microfrontend/mfe1/component.ts@eb0232c](/github.com/manfredsteyer/native-federation-core-microfrontend@eb0232c8688d32a9a59a7ad25df6d8ffad4eedcb/-/blob/mfe1/component.ts)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/module-federation/module-federation-examples/native-federation-react/package.json@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/native-federation-react/package.json)
- [github.com/module-federation/module-federation-examples/native-federation-react/build/esbuild-adapter.ts@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/native-federation-react/build/esbuild-adapter.ts)
- [github.com/module-federation/module-federation-examples/native-federation-react/build/build-common.ts@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/native-federation-react/build/build-common.ts)
- [github.com/module-federation/module-federation-examples/native-federation-react/build/build-cjs.ts@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/native-federation-react/build/build-cjs.ts)
- [github.com/module-federation/module-federation-examples/native-federation-react/build/build-remote.ts@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/native-federation-react/build/build-remote.ts)
- [github.com/module-federation/module-federation-examples](/github.com/module-federation/module-federation-examples)
- [github.com/module-federation/module-federation-examples/native-federation-react/remote/federation.config.js@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/native-federation-react/remote/federation.config.js)
- [github.com/module-federation/module-federation-examples/module-federation-vite-svelte/README.md@5a6a91e](/github.com/module-federation/module-federation-examples@5a6a91ec39515699e8c45fe0cf22f5c788a019a2/-/blob/module-federation-vite-svelte/README.md)
- [svelte5 OR "svelte 5" repo:github.com/module-federation/module-federation-examples](/search?q=patterntype:keyword%20svelte5%20OR%20%22svelte%205%22%20repo:github.com%2Fmodule-federation%2Fmodule-federation-examples)

