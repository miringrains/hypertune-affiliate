# Hypertune Affiliate Portal — Integration Brief for hypertune.gg Dev Team

We're setting up our own affiliate + campaign tracking portal alongside GHL. **Nothing changes with GHL** — it keeps running as-is. We just need three small additions to hypertune.gg so our portal can track the full funnel.

## Portal URL

- Staging: `https://hypertune-affiliate.vercel.app`
- Production: `https://portal.hypertune.gg` (once DNS is set)

---

## 1. Persist `am_id` through Clerk signup

When a user lands on hypertune.gg with `?am_id=some-slug` in the URL (from an affiliate link or campaign link), the `am_id` value needs to survive through account creation.

**What to do:**

- On page load, if the URL contains `?am_id=X`, store it in a cookie:
  ```javascript
  const params = new URLSearchParams(window.location.search);
  const amId = params.get("am_id");
  if (amId) {
    document.cookie = `ht_am_id=${encodeURIComponent(amId)};max-age=${90 * 24 * 60 * 60};path=/;SameSite=Lax`;
  }
  ```
- When Clerk creates a user, save `am_id` in the Clerk user's `publicMetadata` or `unsafeMetadata` so it's available later:
  ```javascript
  // In your Clerk user.created webhook or post-signup logic:
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: { am_id: amIdFromCookie },
  });
  ```

This cookie is **completely separate** from GHL's cookie. They don't conflict.

---

## 2. POST to our lead webhook on user creation

When a new user account is created (via Clerk), fire a POST to our portal so we can track the signup as a "lead" event.

**Endpoint:**

```
POST https://hypertune-affiliate.vercel.app/api/track/lead-webhook
```

**Headers:**

```
Content-Type: application/json
X-Webhook-Secret: <shared secret — we'll provide this>
```

**Body:**

```json
{
  "email": "user@example.com",
  "am_id": "the-slug-from-cookie-or-metadata",
  "clerk_id": "user_abc123",
  "name": "John Doe"
}
```

**When to call:** After Clerk `user.created` completes. This can be a Clerk webhook handler or inline in your post-signup server action. Only call it if `am_id` is present (no point tracking users who came organically without a tracking link).

**Response:** `200 { tracked: true }` on success.

---

## 3. Pass `am_id` in Stripe checkout session metadata

When a user clicks "Start my free 7 day trial" or "Buy Hypertune" on the onboarding page, the Stripe checkout session needs to include `am_id` in its metadata.

**What to do:** In the code that creates the Stripe checkout session, read `am_id` from the Clerk user's metadata (or from the cookie) and add it:

```javascript
const session = await stripe.checkout.sessions.create({
  // ...all existing params stay the same...
  metadata: {
    ...existingMetadata,           // keep anything already there
    am_id: amIdFromClerkOrCookie,  // add this
  },
});
```

`am_id` can come from:
- Clerk user's `publicMetadata.am_id` (if you saved it in step 1), or
- The `ht_am_id` cookie

If neither exists (user came organically), just don't include it. Our webhook ignores sessions without `am_id`.

---

## Summary

| Step | When | What | Affects GHL? |
|------|------|------|:---:|
| Persist `am_id` | Page load with `?am_id` | Set `ht_am_id` cookie + Clerk metadata | No |
| Lead webhook | After Clerk `user.created` | POST to our `/api/track/lead-webhook` | No |
| Stripe metadata | Checkout session creation | Add `metadata.am_id` to session | No |

All three are additive — they layer on top of existing behavior without modifying or removing anything. GHL's `am.js`, its cookies, and its attribution flow are completely untouched.

---

## Testing

1. Visit `https://hypertune.gg/?am_id=test-campaign`
2. Create an account — our lead webhook should receive the POST
3. Start a trial or purchase — our Stripe webhook should receive `am_id` in the checkout session
4. Check `https://hypertune-affiliate.vercel.app/admin/campaigns` — events should appear

If anything doesn't look right, the `am_id` is probably not making it from the cookie into the checkout session metadata. Check browser cookies for `ht_am_id` and verify the Stripe session object in the Stripe dashboard under the session's metadata tab.
