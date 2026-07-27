import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, useAuth } from '@clerk/react'
import { App } from './App.jsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

/**
 * Si falta la clave de Clerk la app arranca igual, sin autenticacion.
 *
 * Podria parecer un agujero, pero es al reves: las funciones de admin ya
 * exigen sesion en el servidor (convex/guardias.ts), asi que sin Clerk el
 * panel simplemente no puede hacer nada. Lo que se evita es peor — que un
 * deploy sin la variable de entorno tire abajo el menu y deje al restaurante
 * sin poder tomar pedidos por un error de configuracion.
 *
 * Degradar la funcion de admin: aceptable. Degradar la venta: no.
 */
const Root = () => {
  if (!clerkKey) {
    console.warn(
      '[auth] Falta VITE_CLERK_PUBLISHABLE_KEY. El menu funciona, ' +
        'pero /admin no va a poder iniciar sesion.'
    )

    return (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    )
  }

  // ClerkProvider tiene que envolver a ConvexProviderWithClerk, nunca al
  // reves: Convex necesita leer el contexto de Clerk para conseguir el token.
  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
