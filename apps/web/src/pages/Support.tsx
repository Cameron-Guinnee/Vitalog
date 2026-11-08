import { ChevronDown, Mail } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** Where support requests go. Change it here; it's used for the link and the text. */
export const SUPPORT_EMAIL = 'support@vitalog.app'

const A = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-primary hover:underline">
    {children}
  </Link>
)

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: 'How do I log food?',
    a: (
      <>
        In the <A to="/diary">diary</A>, choose <strong>Food</strong>. Search for a food, or pick one from Frequent, Meals or Recipes, set the amount and the
        group, and add it. You can also log from Foods → <A to="/foods/search">Search foods</A>.
      </>
    ),
  },
  {
    q: 'How do I add a food that isn’t in the database?',
    a: (
      <>
        Go to Foods → <A to="/foods/custom-foods">Custom foods</A> and choose <strong>New custom food</strong>. Enter the serving size and the nutrition facts
        per serving, just as they’re printed on the label. It then shows up when you search.
      </>
    ),
  },
  {
    q: 'What’s the difference between a meal and a recipe?',
    a: (
      <>
        A <A to="/foods/custom-meals">meal</A> is a set of foods you often eat together, logged all at once. A <A to="/foods/custom-recipes">recipe</A> is
        something you cook that makes several servings; you log how many servings you ate, and Vitalog works out the nutrition.
      </>
    ),
  },
  {
    q: 'How do I set my calorie goal?',
    a: (
      <>
        Go to More → <A to="/more/targets">Targets and profile</A>. Vitalog estimates your maintenance calories from your profile and suggests a daily goal for
        your weight goal, which you can change.
      </>
    ),
  },
  {
    q: 'How do I log my weight or other measurements?',
    a: (
      <>
        In the <A to="/diary">diary</A>, choose <strong>Biometric</strong>, pick what you’re measuring and enter the value. See how it changes over time in
        Trends → <A to="/trends/charts">Charts</A>.
      </>
    ),
  },
  {
    q: 'How does the fasting tracker work?',
    a: (
      <>
        Go to More → <A to="/more/fasting">Fasting</A>, or use the card on the dashboard. Pick a target, such as 16:8, and start the fast. The timer keeps running
        even if you close Vitalog; end the fast when you eat.
      </>
    ),
  },
  {
    q: 'What are repeat items?',
    a: (
      <>
        Foods → <A to="/foods/repeat-items">Repeat items</A> lists the foods and recipes you’ve logged most over the last week, month or more, and lets you log
        one again in a click.
      </>
    ),
  },
  {
    q: 'How are streaks counted?',
    a: 'A day counts toward your streak when you log any food, exercise or biometric that day. Today still counts until midnight, so your streak isn’t broken until a whole day goes by with nothing logged.',
  },
  {
    q: 'Can I change what the dashboard and diary show?',
    a: (
      <>
        Yes. In More → <A to="/more/display">Display settings</A> you can turn dashboard cards on and off, rename or hide diary groups, and set your water goal
        and units.
      </>
    ),
  },
  {
    q: 'How do I delete my account?',
    a: (
      <>
        Go to More → <A to="/more/account">Your account</A> and choose <strong>Delete account</strong>, then type DELETE to confirm. This permanently deletes your
        account and everything in it, and can’t be undone.
      </>
    ),
  },
]

export function Support() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <section aria-label="Frequently asked questions" className="flex flex-col gap-2 rounded-xl bg-surface p-5">
        <h2 className="font-medium">Frequently asked questions</h2>
        <div className="divide-y divide-border">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-label="Contact support" className="flex flex-col gap-3 rounded-xl bg-surface p-5">
        <h2 className="font-medium">Contact support</h2>
        <p className="text-sm text-muted">Can’t find your answer? Email us and we’ll get back to you as soon as we can.</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Mail size={16} /> {SUPPORT_EMAIL}
        </a>
      </section>
    </div>
  )
}
