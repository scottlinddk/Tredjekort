import { createAddressesHandler } from '../server/addresses.js'

// Vercel and local Vite middleware use exactly the same implementation.
export default createAddressesHandler()
