export const SUBSCRIPTION_TIERS = ['free', 'pro'] as const
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]

export function isPro(tier: string | null | undefined): boolean {
  return tier === 'pro'
}
