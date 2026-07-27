// El issuer de Clerk se lee de una variable de entorno DEL DEPLOYMENT de
// Convex, no del .env.local del front. Se setea con el CLI:
//
//   npx convex env set CLERK_FRONTEND_API_URL https://holy-pony-5.clerk.accounts.dev
//   npx convex env set --prod CLERK_FRONTEND_API_URL <la URL de la instancia Production>
//
// Ojo: cada instancia de Clerk (Development y Production) tiene su propia
// Frontend API URL y emite tokens distintos. El deployment de dev de Convex va
// con la de Development y el de prod con la de Production. Cruzarlas hace que
// el token no valide y el login falle sin un error claro.
//
// `applicationID: "convex"` corresponde al claim `aud: "convex"` que la
// integracion de Clerk agrega al session token. No hay que crear ningun JWT
// template a mano: activar la integracion en el dashboard ya lo mapea.
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};
