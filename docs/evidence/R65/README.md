# R65 Evidence

Before baseline:
- `docs/AUDIT_full.md` Top 1-5 documents the pre-round failures: early damage settlement, tutorial demo-card injection, missing keyboard/AT paths, non-atomic import/commit, and missing/insufficient sound control.
- `docs/evidence/R64_controls/desktop_battle_controls_1366x600.png`
- `docs/evidence/R64_controls/desktop_battle_settings_1280x640.png`
- `docs/evidence/R64_controls/mobile_hand_drawer_controls_390x844.png`

After screenshots:
- `after_desktop_battle_accessible_combat_1366x768.png` - desktop battle field after R65 focus/semantic and combat pipeline hardening.
- `after_mobile_guide_no_extra_card_390x844.png` - mobile tutorial overlay with demonstration card drawn from the normal 20-card resources.
- `after_landscape_pack_save_audio_844x390.png` - landscape pack/save manager and audio-volume controls after staging/rollback and WebAudio work.

Automated gates carry the causal before/after checks for impact-frame damage, tutorial 20-card preservation, keyboard operation, and import rollback.
