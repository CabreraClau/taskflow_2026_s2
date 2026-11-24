# Informe de estado · TaskFlow

**Fecha:** 22/11/2026 · **Base:** `2ef43c6` de `main` · **Para:** quien decide si se libera · **Equipo 4**

## Resumen

El build y el lint están en verde y los contratos entre el frontend y la API se cumplen. Pero **solo la mitad de los criterios de aceptación tiene un test en verde**. Hay **8 defectos abiertos** (4 de severidad alta) y **2 vulnerabilidades altas**. Con datos realistas, el listado de tareas tarda **30 veces más** que el objetivo.

## Estado contra los criterios de salida

| Criterio de salida | Objetivo | Hoy | Estado |
|---|---|---|---|
| Build servidor y cliente | Sin errores | Sin errores | ✅ |
| Lint | 0 errores | 0 errores | ✅ |
| Tests de integración (Jest) | Todos en verde | 43 de 46 | ❌ (BUG-06, 07, 08) |
| Tests E2E de historias (Playwright) | Todos en verde | 13 de 18 | ❌ (BUG-01 a 05) |
| Contratos (Pact) | Verificados | 3 de 3 | ✅ |
| Cobertura de ramas | ≥ 80 % (meta del curso) | 57,3 % | ❌ (pasa el gate actual de 40 %) |
| Performance: p95 del listado con 5.000 tareas | ≤ 500 ms | 15.409 ms | ❌ |

## Métricas elegidas (3) y descartada (1)

| Métrica | Valor | Por qué la elegimos |
|---|---|---|
| **Criterios con test en verde** | 59 de 113 (52 %); 45 sin test | Mide si el producto hace lo que pide la especificación, no cuánto código se ejecuta. |
| **Defectos abiertos por severidad** | 4 altos · 4 medios, más 2 vulnerabilidades altas (SEC-01, SEC-02) | Si baja, liberamos. Si sube, frenamos. |
| **p95 del listado con datos grandes** | 15,4 s (seed chica: 0,1 s) | El promedio esconde la cola. Con 12 tareas todo era rápido. |
| ~~Cantidad de tests~~ (descartada) | 72 (46 Jest + 18 E2E + 4 accesibilidad + 4 Pact) | Es *vanity*: subir de 46 a 100 tests no cambia ninguna decisión si no cubren criterios nuevos. |

## Defectos abiertos

| Severidad | Defectos |
|---|---|
| Alta | BUG-04 fecha corrida en UTC−3 (#13) · BUG-05 edición sin membresía (#14) · BUG-07 filtros no combinables (#16) · BUG-08 estado inicial distinto de TODO (#17) |
| Media | BUG-01, 02, 03 etiquetas (#10–#12) · BUG-06 nombre de proyecto corto (#15) |
| Seguridad | SEC-01 SQL injection lee tareas ajenas · SEC-02 un no miembro edita tareas ajenas |

## Riesgos sin mitigar

1. **Permisos:** la matriz muestra 8 criterios de permisos sin test, y SEC-02 y BUG-05 confirman que fallan.
2. **Borrados casi sin probar:** de US-10 y US-13 solo se prueba que el borrado devuelve 204. El borrado en cascada no tiene test (riesgo de dejar datos huérfanos).
3. **Volumen:** el listado no pagina bien. Con un equipo real de 20 usuarios, la app se vuelve inutilizable.
4. **El pipeline no bloquea:** `main` no tiene *branch protection*, así que el rojo se ve pero no frena el merge.

## Qué permiten concluir los números y qué no

- **Sí:** hay fallas reales y reproducibles contra la especificación. No son tests mal escritos: cada rojo tiene su issue.
- **No:** 52 % de criterios en verde **no** quiere decir que la mitad del producto anda. Los criterios sin test pueden estar bien o mal; no lo sabemos.
- **No:** el p95 se midió en una notebook con la API y k6 en la misma máquina. Sirve para comparar seed chica contra grande, no como número de producción.

## Recomendación: **No liberar**

Para pasar a "liberar con riesgos" hace falta, en este orden:

1. Corregir SEC-01, SEC-02 y BUG-05 (seguridad y permisos).
2. Corregir los 3 defectos altos restantes (BUG-04, 07 y 08).
3. Agregar tests del borrado en cascada (US-10 y US-13), y activar *branch protection* con Tests y Cobertura como checks obligatorios.

*Fuentes:* corridas locales de Jest, Playwright y Pact del 22/11/2026 · [matriz de trazabilidad](matriz-trazabilidad.md) · [performance/REPORT.md](../performance/REPORT.md) · [clase12-m2-reporte.md](clase12-m2-reporte.md) · issues #10 a #17.
