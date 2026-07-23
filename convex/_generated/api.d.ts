/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as categorias from "../categorias.js";
import type * as horarios from "../horarios.js";
import type * as items from "../items.js";
import type * as mesas from "../mesas.js";
import type * as migraciones from "../migraciones.js";
import type * as pedidos from "../pedidos.js";
import type * as salsas from "../salsas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categorias: typeof categorias;
  horarios: typeof horarios;
  items: typeof items;
  mesas: typeof mesas;
  migraciones: typeof migraciones;
  pedidos: typeof pedidos;
  salsas: typeof salsas;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
