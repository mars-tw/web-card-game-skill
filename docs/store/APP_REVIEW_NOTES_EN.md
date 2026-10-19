# App Review Notes — draft only

PREPARED, 15 October 2026. This is a local draft for the R74 web implementation (0.7.0), not a response sent to Apple. The existing native build 1.0.0/build 1 has not been replaced by this work. Do not attach these instructions to that older build.

## Three-minute route available to every player

No account, purchase or network service is needed after the game files are installed/cached.

1. Open the game at its normal entry. The harbor is titled **裂潮卡牌**. Select **開始潮汐試航** (Start tide trial), then **開始試航** (Begin).
2. This explicitly labeled, fixed tactical scenario starts with four of six tide points. Select one friendly **見習士兵** (Footman), then one enemy **弓箭手** (Archer). On touch controls confirm the selected target if prompted. Repeat with the second pair. Each friendly casualty adds one tide point; both enemy Archers are left with one health.
3. Select **觀潮** (Tide chart). The chart shows both sides' charge rules and a forecast. **漲潮破陣** (Flood) deals one damage to every enemy minion and two to the enemy hero. Select **確認施放** (Confirm). This completes the trial through the same combat rules used in ordinary battles.
4. The result offers **開始五站航程** (Start the five-stop voyage), **重玩試航** (Replay), and **返回港口** (Harbor). This fixed trial grants no coins or normal battle wins. It is normal public content, not a reviewer-only mode.

The alternative **退潮護航** (Ebb) spends the same six points to give friendly minions Divine Shield and restore up to three hero health. Ebb is useful for preserving a board in ordinary games; Flood is the solution to this trial. The original quick tide button always casts Flood; the chart explicitly confirms the chosen direction.

During a player turn, **觀潮／暫停** in the action menu opens the chart. **儲存返回港口** stores a safe player-turn checkpoint. **繼續上次對局** at the harbor restores it. Closing during an enemy action resumes from the last completed player-turn checkpoint. Completion, collections and voyage progress are local to the device. The game has no cloud sync.

## Product and provenance information for the previous questions

1. Function: a single-player tactical card game where friendly casualties charge a separate six-point resource. Players choose between an offensive wave and protecting surviving minions. The short trial makes the cost of that decision observable immediately.
2. Audience: players who want deliberate solo card tactics and local progression, rather than realtime movement or children's education.
3. Distinction: the specific trial, five-stop voyage, opponent charging affinities, and Flood/Ebb decision are this game's implemented combination. We do not claim that cards, shields, sacrifice mechanics or offline play are inventions unique across the entire market.
4. Testing: local automated Chromium tests cover cold launch, the public trial, its victory, return/resume, offline completion and phone/tablet layouts. These are not human beta results. **Real TestFlight feedback and physical-device recordings have not been supplied by this engineering round.**
5. Other apps: this is a standalone card game. The full per-app comparison, including all account titles listed in the work order, is in `DIFFERENTIATION.md`.
6. Consolidation: the existing products have different action, RTS, educational and survival loops. That alone does not establish why a separate App Store listing is necessary. The owner must make the distribution decision with the account-level rejection in view; this round does not establish that consolidation is impossible.
7. Shared implementation: this game uses HTML/CSS/JavaScript, browser storage/Web Audio, and a standard Capacitor native wrapper. Historical SKILL/art-config production structure is shared with other projects. Runtime/assets SHA-256 comparison found no byte-identical files within the documented source scope; this is not a compiled-binary or exhaustive semantic-code audit. See `SHARED_ASSETS_AUDIT.md`.
8. Third parties: native manifest dependencies include Capacitor 8.5.2 (core/iOS/Android), App 8.1.2 and Preferences 8.0.1. Playwright is a development test dependency. Runtime fonts are device/system fonts. No ad or analytics SDK is present in the inspected source/dependency list. Existing artwork provenance remains in the asset records and credits; this round generated no artwork.
9. Submission identity: the account owner/content provider must attest ownership and whether any client or partner is involved. Repository metadata alone cannot establish these legal or business facts. No answer is fabricated here.

## Before any submission

Apple 4.3 risk remains high. This round has not uploaded a build, replied to a review message, changed store metadata or run TestFlight. A new signed native package, source/binary readback, device QA, verified ownership/provenance and genuine beta evidence remain outstanding. The publisher's earlier record also listed this card game as not resubmitting to Apple; the present task prepares improvements and does not reverse publication decisions automatically.
