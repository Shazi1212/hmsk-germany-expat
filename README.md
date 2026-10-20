# Germany Expat Toolkit

Moving to Germany for work means three things at once: checking whether the job offer is enough for a visa, registering your address in time, and a pile of German paperwork. This toolkit does all three in your browser.

**Use it free:** https://hmsk.life/tools/germany-expat/

## What it does

- **EU Blue Card salary check.** Enter your gross salary (per year or per month), your qualification and the job. It compares against the 2026 minimums of § 18g AufenthG (€50,700, or €45,934.20 for shortage occupations, new graduates and IT specialists without a degree), says whether the Federal Employment Agency has to approve, and lists the alternatives (skilled worker visa, Chancenkarte, the 45+ rule).
- **Anmeldung guide.** What to bring (passport, Wohnungsgeberbestätigung), the two-week deadline from your move-in date (§ 17 BMG), how to get an appointment, and what you get afterwards (Meldebescheinigung, Steuer-ID by post).
- **First 90 days checklist.** 14 steps (Anmeldung, bank account, health insurance, Steuer-ID, Rundfunkbeitrag, Haftpflicht, residence permit, SIM, ...), each with the German term explained and a due date counted from your move-in date. Saved in localStorage, printable.
- English and German (`?lang=de`). Every figure has an official source and an "as of" date.

## Quick start

Static page, no build step, no dependencies.

```sh
python3 -m http.server 8080 --directory public   # then open http://localhost:8080
```

Or copy `public/` to any web server. Site links (tool page, imprint, email signup) point to `https://hmsk.life`;
change `siteBase` in `public/config.js` for your own copy.

## Tests

The salary check and date helpers live in `public/logic.js` (no DOM) and are tested with Node's built-in runner (Node 18+):

```sh
node --test tests/
```

The tests pin the 2026 figures to the BMI notice, check both thresholds to the cent (standard, reduced, monthly × 12),
the degree and IT-experience rules, the 45+ note, number parsing (German and English formats) and the Anmeldung deadline.

## Updating the figures

Each January the Federal Ministry of the Interior publishes the new minimums in the Bundesanzeiger. Add the year to
`YEARS` in `public/logic.js` (pension contribution ceiling, 50 % and 45.3 % of it), set `CURRENT_YEAR`, update the
texts in `public/i18n.js` and the first test.

## Sources (as of 19 October 2026)

- BMI, Bekanntmachung zu § 18g AufenthG über die Mindestgehälter für die Blaue Karte EU, 2 Dec 2025, BAnz AT 18.12.2025 B3
- § 18, § 18g, § 20a AufenthG; § 17, § 19, § 54 BMG; § 29 FeV (gesetze-im-internet.de)
- make-it-in-germany.com, bzst.de, rundfunkbeitrag.de

Not legal advice.

## License

MIT, see [LICENSE](LICENSE). Fonts: Newsreader and Public Sans (SIL Open Font License), in `public/fonts/`; the shared hmsk.life look is in `public/letterpress.css`.
