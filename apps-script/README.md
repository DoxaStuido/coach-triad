# Apps Script foundation

[English](README.md) | [繁體中文](README.zh-TW.md)

These files are intended for a Google Apps Script project bound to the imported
Coach a Coach operations workbook.

Implemented in this foundation:

- header-based sheet reads and append-only writes;
- config parsing and validation;
- participant/language/availability assembly;
- deterministic draft matching with hard constraints and soft scoring;
- preflight issue generation;
- rematch option ranking that locks the remaining two members;
- an operations menu that never publishes or sends email automatically.

The matching core is environment-independent and covered by Node tests. Google
Sheet integration functions require a bound Apps Script project and therefore
remain dry-run only until a private staging Sheet is available.

For the current standalone Excel/browser workflow, see the
[matching rules](../docs/matching-review-v2.md) and [project README](../README.md).
