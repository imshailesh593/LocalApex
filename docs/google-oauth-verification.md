# Google OAuth Verification — LocalApex by Maveric InfoTech

## App Information

| Field | Value |
|---|---|
| App Name | LocalApex |
| Developer | Maveric InfoTech |
| Homepage | https://localapex.mavericinfotech.in |
| Privacy Policy | https://localapex.mavericinfotech.in/privacy |
| Terms of Service | https://localapex.mavericinfotech.in/terms |
| Contact Email | privacy@mavericinfotech.in |

---

## Scope Requested

`https://www.googleapis.com/auth/business.manage`

---

## Justification for Scope

### What is LocalApex?

LocalApex is a Local SEO SaaS platform built for small and medium businesses in India to manage
their online reputation and local search presence. It is built and operated by Maveric InfoTech,
a web and software development company based in India.

### Why we need `business.manage`

LocalApex uses the Google Business Profile API to provide the following features to its users:

#### 1. Location Import (Read)
When a business owner signs up on LocalApex, they connect their Google account to automatically
import all their Google Business Profile locations — including name, address, phone number, and
website. This eliminates manual data entry and ensures accuracy.

**API calls used:**
- `GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`
- `GET https://mybusinessbusinessinformation.googleapis.com/v1/{account}/locations`

#### 2. Review Management (Read)
LocalApex displays the business's Google reviews in a unified dashboard, allowing owners to:
- Monitor incoming reviews in real time
- Filter by rating, sentiment, and date
- Assign reviews to team members for response
- Generate AI-powered reply suggestions

#### 3. Review Response / Post Updates (Write)
Business owners can post Google Business Profile updates (What's New, Offers, Events) directly
from LocalApex's Social Posting feature. Posts are scheduled and published via the API.

### Data Handling

- We store only the OAuth refresh token (encrypted at rest) to maintain connection without
  requiring the user to re-authorize on every session.
- Location data and review data fetched from the API is stored in a per-tenant isolated database.
- We never share, sell, or use Google data for advertising.
- Users can disconnect their Google account at any time from Settings, which immediately revokes
  the stored token.
- Full compliance with the Google API Services User Data Policy and Limited Use requirements.

---

## OAuth Flow Description (for verification video)

1. User clicks **"Import from Google"** on the Locations page
2. LocalApex redirects to Google OAuth consent screen requesting `business.manage` scope
3. User authorizes with their Google account
4. Google redirects back to `https://localapex.mavericinfotech.in/api/v1/gmb/callback` with an auth code
5. Backend exchanges the code for access + refresh tokens
6. Backend calls `GET /v1/accounts` to list GMB accounts
7. For each account, calls `GET /v1/{account}/locations` to fetch all locations
8. Locations are imported into the user's LocalApex dashboard
9. User is redirected to the Locations page with a success message showing the count imported

---

## Sensitive Scope Compliance Checklist

- [x] Privacy Policy is publicly accessible at `/privacy`
- [x] Terms of Service is publicly accessible at `/terms`
- [x] Only `business.manage` scope is requested — no additional Google scopes beyond `openid` and `email`
- [x] Data is used exclusively to provide the LocalApex service to the authorizing user
- [x] No Google data is sold or used for advertising
- [x] Google API Services User Data Policy compliance statement included in Privacy Policy
- [x] Users can revoke access at any time
- [x] Data deletion supported (Settings → Delete Account)
- [x] OAuth prompt includes `access_type=offline` and `prompt=consent` to ensure explicit user consent
