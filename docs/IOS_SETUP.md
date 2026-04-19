# iOS Build & Deploy — Complete Setup Guide

Posty is built with Capacitor as a **hybrid shell app**: the native iOS container loads `https://postyapp.ai` directly, preserving all SSR, API routes, Firebase, and Stripe behavior. No Mac is required — all iOS builds happen in GitHub Actions on a macOS runner.

This guide walks through every step from a clean Windows workstation to a TestFlight build.

---

## 0. Prerequisites

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer Program account | **99 USD / year** | Required to ship to App Store & TestFlight |
| GitHub repository | Free / paid | Private repos get 2000 macOS minutes/month free; public repos unlimited |
| This codebase with the Capacitor files | — | Already committed |

You do **not** need a Mac. Xcode, CocoaPods, and all signing happen in CI.

---

## 1. First-time local install (Windows)

```bash
npm install
```

That's it locally. The new Capacitor dependencies (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`, splash-screen, status-bar, etc.) are installed.

Optionally, scaffold the `ios/` folder once so it's committed:

```bash
npx cap add ios
git add ios
git commit -m "chore(ios): scaffold Capacitor iOS project"
```

If you skip this step, the CI workflow will scaffold `ios/` on every run automatically — it's stateless either way.

---

## 2. Apple Developer setup (one-time, ~30 min)

You need **five** things from Apple, which you'll later paste into GitHub Secrets.

### 2.1 — Join the Apple Developer Program

1. Go to <https://developer.apple.com/programs/enroll/>
2. Sign in with your Apple ID, enroll as Individual or Organization
3. Pay the 99 USD/year fee
4. Wait for approval (usually same-day)

### 2.2 — Create the App ID (bundle identifier)

1. <https://developer.apple.com/account/resources/identifiers/list>
2. Click **+** → **App IDs** → **App**
3. Description: `Posty`
4. Bundle ID (Explicit): **`ai.postyapp.mobile`**
   *(This must match `appId` in [capacitor.config.ts](../capacitor.config.ts).)*
5. Capabilities: leave defaults (add Push Notifications later if needed)
6. **Continue → Register**

### 2.3 — Create the App in App Store Connect

1. <https://appstoreconnect.apple.com/apps>
2. Click **+** → **New App**
3. Platform: iOS
4. Name: **Posty**
5. Primary Language: French (or English)
6. Bundle ID: select `ai.postyapp.mobile`
7. SKU: `posty-ios-001` (any unique string)
8. User Access: Full Access
9. **Create**

### 2.4 — Generate the Distribution Certificate (.p12)

The cleanest way from Windows is to let CI do it via `fastlane match`, but for a first setup the simplest path is:

**Option A — Use a Mac for 10 minutes** (borrow one, or use a free macOS VM like MacInCloud)

1. Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority
2. Save the `.certSigningRequest` file
3. Back on <https://developer.apple.com/account/resources/certificates/list>, click **+** → **Apple Distribution** → upload the `.certSigningRequest`
4. Download the `.cer` file → double-click to install in Keychain
5. In Keychain Access, right-click the "Apple Distribution: YOUR NAME" entry → **Export** → save as `posty-dist.p12` with a password
6. Remember the password — you'll need it for GitHub Secrets

**Option B — Generate from Windows via OpenSSL**

```bash
# 1. Generate a private key
openssl genrsa -out posty-private.key 2048

# 2. Generate a CSR
openssl req -new -key posty-private.key -out posty.csr -subj "/emailAddress=julien.robidet@aansa.fr/CN=Posty Distribution/C=FR"

# 3. Upload posty.csr to Apple Developer (see Option A step 3), download the resulting .cer

# 4. Convert the .cer + private key into a .p12
openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
openssl pkcs12 -export -out posty-dist.p12 -inkey posty-private.key -in distribution.pem -password pass:YOUR_P12_PASSWORD
```

### 2.5 — Create the App Store Connect API Key

This lets CI upload to TestFlight without your Apple ID password.

1. <https://appstoreconnect.apple.com/access/integrations/api>
2. Click **+** → Name it `Posty CI` → Access: **App Manager** → **Generate**
3. Download the `.p8` file (**you can only download it once**)
4. Note the **Key ID** (10-char string like `ABCD123456`)
5. Note the **Issuer ID** shown at the top of the page (UUID format)
6. Note your **Team ID** from <https://developer.apple.com/account> → Membership (10-char string like `1234ABCDEF`)

### 2.6 — Provisioning profile

The CI workflow pulls this automatically via `apple-actions/download-provisioning-profiles`. But you must create it once:

1. <https://developer.apple.com/account/resources/profiles/list> → **+**
2. **App Store Connect** distribution type
3. App ID: `ai.postyapp.mobile`
4. Certificate: select the distribution cert you just created
5. Name: `Posty App Store`
6. **Generate**

---

## 3. Configure GitHub Secrets

In your repo: **Settings → Secrets and variables → Actions → New repository secret**.

Add the following **seven** secrets:

| Secret name | Value | How to get it |
|-------------|-------|---------------|
| `APPLE_TEAM_ID` | 10-char team ID | developer.apple.com → Membership |
| `APPSTORE_ISSUER_ID` | UUID | App Store Connect → Users and Access → Integrations |
| `APPSTORE_KEY_ID` | 10-char key ID | Same page as above |
| `APPSTORE_PRIVATE_KEY` | Contents of the `.p8` file | Open `AuthKey_XXXX.p8` in a text editor, paste **entire content** including `-----BEGIN PRIVATE KEY-----` lines |
| `IOS_DIST_CERT_P12_BASE64` | Base64-encoded `.p12` | See below |
| `IOS_DIST_CERT_PASSWORD` | The password you set for the `.p12` | From step 2.4 |

**Base64-encode the .p12 on Windows:**

```bash
# Git Bash / WSL
base64 -w 0 posty-dist.p12 > posty-dist.p12.base64
# Then open posty-dist.p12.base64 and copy the full string into the secret
```

Or PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("posty-dist.p12")) | Set-Clipboard
```

---

## 4. Run your first build

### Option A — Artifact-only build (.ipa downloadable)

1. Go to the repo on GitHub → **Actions** tab
2. Pick **iOS Build & Deploy** in the left sidebar
3. **Run workflow** → target = `artifact` → **Run**
4. Wait ~15-25 min for the macOS runner
5. When green, open the run and scroll down to **Artifacts** → download `Posty-iOS-1.0.0-<N>`

You can install this `.ipa` on registered test devices via Apple Configurator 2, or distribute via ad-hoc channels.

### Option B — Direct upload to TestFlight

1. Actions tab → **iOS Build & Deploy** → **Run workflow** → target = `testflight`
2. After the run succeeds, go to App Store Connect → your Posty app → **TestFlight** tab
3. The build appears within 5-15 min (after Apple's processing)
4. Add yourself/your testers as internal testers → install via the **TestFlight** app on iPhone

### Option C — Tag-triggered release

```bash
git tag ios-v1.0.1
git push origin ios-v1.0.1
```

Any tag starting with `ios-v` automatically triggers a TestFlight upload.

---

## 5. Versioning workflow

- **Marketing version** (`1.0.0`, user-visible): edit the `MARKETING_VERSION` env var in [.github/workflows/ios-build.yml](../.github/workflows/ios-build.yml). Bump for each public release.
- **Build number** (`1`, `2`, `3`... must be unique per upload): auto-set to `github.run_number`. Override via the `build_number` workflow input if needed.

Apple requires each TestFlight upload to have a higher build number than the last — the `run_number` scheme handles that automatically since it only ever increases.

---

## 6. First App Store submission

Once you've uploaded a build to TestFlight and tested it:

1. App Store Connect → Posty → **App Store** tab → **+** version
2. Fill in: description, keywords, screenshots (you need at least one screenshot per device size: 6.7", 6.5", 5.5")
3. Privacy policy URL: `https://postyapp.ai/legal/privacy`
4. Select the TestFlight build you want to ship
5. **Submit for Review**
6. Apple review usually takes 24-72h

**Likely rejection risks for a Capacitor shell app:**

- **"Just a website" (4.2)** — mitigate by ensuring native feel: splash screen, proper status bar, no obvious browser chrome, native back-gesture handling. Our config already handles the basics. Consider adding at least one native-only feature (push notifications, haptics on button press — the `@capacitor/haptics` plugin is already installed).
- **External payments (3.1.1)** — if your Stripe checkout processes digital goods consumed inside the app, Apple **requires** you to use StoreKit / In-App Purchase and takes 15-30%. For a productivity/SaaS tool where the subscription unlocks cross-platform access (web + mobile), you can often argue "Reader" app exemption. Consult Apple's Schedule 2 before submission.

---

## 7. Local iteration loop

Day-to-day, you work on the Next.js web app exactly like before (`npm run dev`, Vercel deploys). The iOS app automatically picks up changes because it just loads the live site.

You only need to rebuild the iOS app when you:

- Add a new Capacitor plugin
- Change `capacitor.config.ts`
- Bump native version / icons / splash
- Update iOS permissions in `Info.plist`

Trigger the GitHub Action and you're done.

---

## 8. Adding native features later

Common next steps:

```bash
# Push notifications
npm install @capacitor/push-notifications

# Secure local storage
npm install @capacitor/preferences

# Camera access (already declared in Info.plist once added)
npm install @capacitor/camera

# Biometric auth
npm install @capacitor-community/biometric-auth
```

After installing, run the iOS workflow — `npx cap sync ios` in CI picks up the new plugins.

To call Capacitor APIs from the web code, detect the runtime:

```ts
import { Capacitor } from "@capacitor/core";
if (Capacitor.isNativePlatform()) {
  // iOS/Android-only code
}
```

The exact same codebase runs on web (no-op) and native (feature enabled).

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `No profiles for 'ai.postyapp.mobile' were found` | The App ID in step 2.2 or the provisioning profile in step 2.6 isn't set up. Re-check bundle ID matches `capacitor.config.ts`. |
| `Code signing error: No signing certificate` | `IOS_DIST_CERT_P12_BASE64` is wrong or expired. Re-export and re-encode. |
| `Invalid API key` during TestFlight upload | `APPSTORE_PRIVATE_KEY` must include the full `-----BEGIN PRIVATE KEY-----` header and footer. |
| TestFlight upload succeeds but build doesn't appear | Wait 10-15 min. If still missing, check App Store Connect → TestFlight → Builds for a rejected processing error (usually missing export compliance info). |
| Build number already exists | Another run used the same number. Pass `build_number` manually or re-run to get a new `run_number`. |

---

## 10. Cost summary

| Item | Annual cost |
|------|-------------|
| Apple Developer Program | 99 USD |
| GitHub Actions (public repo) | 0 |
| GitHub Actions (private repo, <500 min/month iOS builds) | 0 (included in free tier) |
| GitHub Actions (private repo, heavy usage) | 0.08 USD/min macOS |
| **Total minimum to ship** | **99 USD/year** |

One iOS build takes ~15-25 min on `macos-14`. You can ship dozens of builds per month within the free GitHub tier.
