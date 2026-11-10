# Agent registry

`manifest.json` inventories the 16 scoped skills in `.agents/skills`. They are reusable instructions, not sixteen separately running AI instances. Supported host agent adapters may invoke them sequentially or concurrently according to verified capabilities; policy and evidence rules apply in either mode.

The CLI can run deterministic documentation checks without activating any AI skill. Runtime orchestration remains a planned host integration.
