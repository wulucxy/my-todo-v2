import { ConvexReactClient } from 'convex/react'

/**
 * Convex is provisioned by the platform. We assume VITE_CONVEX_URL is injected
 * by the orchestrator before runtime.
 */
const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  throw new Error('VITE_CONVEX_URL missing. This template expects a platform-injected Convex deployment.')
}

export const convexClient = new ConvexReactClient(convexUrl)
