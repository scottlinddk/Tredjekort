import { createAddressReportHandler } from '../server/address-report.js'

// Vercel and local Vite middleware use exactly the same implementation.
export default createAddressReportHandler()
