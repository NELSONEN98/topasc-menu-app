import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Identidades habilitadas para administrar. Se configura del lado del
 * servidor, no en el codigo. Acepta emails y/o user IDs de Clerk:
 *
 *   npx convex env set --prod ADMIN_EMAILS "vos@mail.com,user_2abc123..."
 *
 * Se admiten las dos formas porque Clerk NO garantiza el claim `email`: los
 * campos que devuelve getUserIdentity dependen de como esten configurados los
 * claims de la integracion. El `subject` (el user ID) si esta siempre. El
 * email es mas legible; el user ID es el que nunca falta.
 *
 * Si esta vacia NO PASA NADIE. Es a proposito: un sistema de autorizacion que
 * cuando no esta configurado deja entrar a todos no protege nada. El costo de
 * olvidarse de cargarla tiene que ser "no entro yo", nunca "entra cualquiera".
 */
const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((entrada) => entrada.trim().toLowerCase())
  .filter(Boolean);

/**
 * Modo abierto: cualquier sesion valida administra, sin allowlist.
 *
 *   npx convex env set --prod ADMIN_ABIERTO true
 *
 * Con esto la pregunta "¿quien administra?" la responde enteramente Clerk:
 * tener cuenta es ser admin. Va de la mano de como este configurado el
 * registro alla — si esta abierto, cualquiera que se registre administra.
 *
 * Es una variable aparte y no la ausencia de ADMIN_EMAILS a proposito:
 * abrir el panel tiene que ser un acto deliberado, nunca la consecuencia de
 * olvidarse de configurar algo. Para volver a la allowlist alcanza con
 * borrarla (`npx convex env remove --prod ADMIN_ABIERTO`): ADMIN_EMAILS
 * sigue cargada y vuelve a aplicarse sola.
 */
const MODO_ABIERTO =
  (process.env.ADMIN_ABIERTO ?? "").trim().toLowerCase() === "true";

/**
 * Exige una sesion valida —y, si hay allowlist, que sea una cuenta habilitada.
 *
 * Convex expone cada query y cada mutation como un endpoint publico: el
 * `/admin` del front no es una barrera, es una pantalla. Cualquiera puede
 * abrir la consola en la pagina del menu — que ya tiene el ConvexReactClient
 * conectado a produccion — y llamar `items:borrar` sin pasar por ningun login.
 *
 * Por eso la autorizacion vive aca y no en React.
 *
 * Y ojo con la diferencia: `getUserIdentity()` responde "¿sos alguien?", no
 * "¿sos alguien que puede estar aca?". Si en Clerk el registro esta abierto,
 * cualquiera se crea una cuenta y pasa ese chequeo. Autenticacion no es
 * autorizacion — de ahi la allowlist.
 */
export async function requerirAdmin(ctx: QueryCtx | MutationCtx) {
  const identidad = await ctx.auth.getUserIdentity();

  if (identidad === null) {
    throw new Error("No autorizado: iniciá sesión para realizar esta acción.");
  }

  // Ventana de onboarding: alcanza con tener sesion. Ver MODO_ABIERTO.
  if (MODO_ABIERTO) {
    return identidad;
  }

  // Falla cerrado: sin allowlist no entra nadie. Si Clerk permite registro
  // abierto —o alguien reactiva el registro mas adelante— cualquiera con un
  // mail se crea una cuenta y pasa el chequeo de arriba. Tener sesion no es
  // tener permiso.
  if (ADMINS.length === 0) {
    throw new Error(
      "Panel sin configurar: falta la variable ADMIN_EMAILS en el deployment de Convex."
    );
  }

  const email = identidad.email?.trim().toLowerCase();
  const userId = identidad.subject?.trim().toLowerCase();

  const habilitado =
    (email !== undefined && ADMINS.includes(email)) ||
    (userId !== undefined && ADMINS.includes(userId));

  if (!habilitado) {
    // Sin este log no hay forma de saber por que rebota una cuenta: el cliente
    // solo recibe un "Server Error" generico —Convex oculta los mensajes a
    // proposito— y quedan indistinguibles "no estas en la lista" y "el token
    // no trae el dato con el que te busco".
    console.warn(
      `[auth] rechazado. email=${email ?? "(sin claim email)"} subject=${
        identidad.subject ?? "(sin subject)"
      } | habilitados=${ADMINS.length}`
    );

    throw new Error("No autorizado: esta cuenta no tiene permisos de administración.");
  }

  return identidad;
}
