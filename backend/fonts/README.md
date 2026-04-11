# Bundled Fonts

These fonts are baked into the production Docker image so LibreOffice can render
proposal templates with the same typefaces Word uses on the source machines.
Without them, LibreOffice falls back to Liberation Serif and the proposal
header (which uses Wingdings ornaments and a Copperplate variant) renders
visibly differently from the Word original.

## Files in this directory

| File | Internal font name | Used for |
|---|---|---|
| `Wingdings.ttf` | `Wingdings` | Header diamond ornaments (♦) |
| `Copperplate.ttc` | `Copperplate` family — `Regular`, `Light`, `Bold` subfamilies | Apex title text ("APEX CONSULTING & SURVEYING, INC.") |

**Filenames don't matter** — fontconfig (`fc-cache`) registers fonts by their
*internal* family/subfamily name from the file metadata, not by filename. The
fill pipeline rewrites the .docx XML so any reference to `Copperplate Gothic
Light` becomes `Copperplate Light`, which then matches subfamily index 1 of
the bundled .ttc.

## Where to grab them

| Font | Source |
|---|---|
| `Wingdings.ttf` | `C:\Windows\Fonts\wingding.ttf` on any Windows box (ships with Windows since 3.1) |
| `Copperplate.ttc` | `/System/Library/Fonts/Supplement/Copperplate.ttc` on macOS (ships with macOS) |

The Apex Word template's XML originally references `Copperplate Gothic Light`
(a Microsoft font that ships with some Office Pro SKUs), but Word on macOS
already substitutes it with the OS Copperplate font when displaying — so
matching what Mac Word actually shows means using the macOS .ttc, which is what
the team is doing here.

## Licensing

These are proprietary fonts (Microsoft Wingdings, Linotype Copperplate). They
live in this private single-tenant repo and are baked into the production
Docker image so Cloud Build can produce a working container without an
out-of-band font sync step. By committing them here you attest that:

- The repo is private and access is limited to authorized Apex personnel.
- The runtime environment (Cloud Run) is licensed via the same Microsoft
  Office / macOS license that grants access to these typefaces.
- The fonts are not redistributed beyond this deployment.

If the repo ever goes public or the licensing arrangement changes, move the
font files to a private GCS bucket and pull them in the Dockerfile build
stage instead.

## Enabling at runtime

The Dockerfile already:

1. Copies this directory to `/usr/share/fonts/truetype/apex/`
2. Runs `fc-cache -fv` to register the fonts
3. Sets `ENV APEX_BUNDLED_FONTS=1`

The proposal-fill pipeline (`backend/src/proposal-templates/proposal-fill.util.ts`)
auto-detects this flag and skips the Wingdings-PUA-to-Unicode and
Copperplate-uppercase fallback workarounds, so the templates render against
the real fonts instead of approximations.

For local dev with `npm run start:dev`:

1. Drop the same files into `~/Library/Fonts/` on macOS (or copy them — macOS
   already has them in `/System/Library/Fonts/Supplement/`).
2. Add `APEX_BUNDLED_FONTS=1` to your `.env` so the local backend matches the
   container behavior.
