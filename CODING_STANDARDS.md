# Coding standards

The `/code-review` Standards reviewer reads this file. Each rule is a judgement call that ESLint and `tsc` can't make, so cite the rule's heading in a finding. Judge only lines the diff adds or changes: most of this codebase predates these rules, and existing code elsewhere is not a finding. Where these rules and the review's built-in smell baseline disagree, these rules win.

Screens inside the POS app also follow the `ui-taste` skill (`.agents/skills/ui-taste/SKILL.md`).

Mechanical rules (import shapes, banned APIs, hook order, types) belong in ESLint, `tsc` or CI, not here.

## One owner per fact

A change that needs something the app already stores or computes gets it from the owner below. When the owner can't answer, the change extends the owner instead of adding a second copy.

| Fact | Owner |
| --- | --- |
| Requests to `base_backend` | `src/services/request.ts`: its default export, or `get`, `post`, `put`, `deleteRequest` |
| Signed-in user, in components | The Redux auth slice: `useAppSelector((state) => state.auth)` |
| Current branch | `getValidShopId` in `src/utils/shopValidator.ts` |
| Business's products | `useTenantModules`, or `getTenantModulesSync` outside React, in `src/hooks/useTenantModules.ts` |
| Shop VAT mode and rate | `src/utils/taxConfig.ts` |
| VAT amounts | `src/utils/vat.ts` |

Update this table in the same change that replaces an owner.

**Look for:**
- a new axios instance, or a direct `axios` import
- `localStorage` reads of `user`, `token`, `shopId` or `tenant`
- another `getShopId`
- an inline VAT, discount or total formula
- the same constant (a date, a colour, a URL) defined in two files

**Why:** the E-Sign, Duka and Pesa modules each built their own HTTP client. All three read a `token` key that nothing writes, so their requests go out without sign-in.

## Fix every copy

A change that fixes logic which exists in more than one place fixes every copy. If it leaves a copy alone, the PR description names it and says why. Until those copies are merged into one owner, watch these areas most:
- discount and VAT arithmetic
- checks for which products a business has
- page permissions

**Look for:** a fix to one formula, flag check or permission entry. Search `src/` for the same pattern; any copy left unfixed and unnamed is a finding.

**Why:** the discount-cap fix (`f152d288`) patched five of the seven discount calculations, so printed bills and order details still don't cap the discount.

## Six product names

New code asks whether a business has a product by its name: `duka`, `pesa`, `bandu`, `mteja`, `dala` or `esign`. These are the fields with those names on `TenantModules`.

**Look for:**
- new reads of any `has*` field on `TenantModules` (`hasPOS`, `hasAccounting`, `hasDuka` and so on)
- new reads of raw tenant flags (`pos_integration`, `accounting_database`, `tenant.modules.*`)

**Why:** billing settles on six product names with no aliases. Screens that read different aliases gave the same business different answers.

## Product code in its module

New screens and logic for one product go in `src/modules/<product>/`. Code that two or more products use goes in `src/shared/`. When one product module needs another's code, that code moves to `src/shared/`.

`src/pages/` and `src/components/` hold code that is still moving into modules. Fixing it in place is fine; starting a new product feature there is a finding.

**Look for:**
- a new single-product file under `src/pages/` or `src/components/`
- one product module importing another's internals, such as `@modules/pesa/pages/…` from Duka
- an import through the re-export files left in `src/pages/` instead of the module path

**Why:** the move into modules is half done, and Duka and Pesa already import each other's internals.

## One permission per page

A page's route guard and its nav entry require the same permissions. So do its `/` and `/admin` routes when it has both. When a page accepts several permissions, define the list once and use it in both places.

**Look for:**
- a new or changed path whose permission in `src/routes/Routers.tsx` differs from its entry in `src/components/navbar/defaultprops.tsx`
- a page added to only one route tree, with no reason given

**Why:** a November 2026 review found 15 paths where the route and the nav disagreed, so a role could see a nav item whose page then refuses it.

## Visible failures

A request function lets a failure reach its caller, so the screen can show an error that looks different from "nothing here". It doesn't return `[]`, `null` or a made-up success.

**Look for:** a `catch` in a service or query function that returns an empty value, or that logs the error and carries on.

**Why:** Document Center's folder request returns an empty list on any error, so a refused request looks like an empty folder.
