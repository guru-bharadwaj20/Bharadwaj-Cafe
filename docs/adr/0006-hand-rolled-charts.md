# 6. Hand-rolled SVG charts

**Status:** Accepted · **Date:** 2026-07-22

## Context

The analytics dashboard needs three chart forms: a revenue line/area over
time, horizontal bars for best sellers, and columns for orders by hour.

Recharts, Chart.js and similar libraries would each add roughly 100–200KB to
a bundle that is currently ~90KB gzipped.

## Decision

Write the three forms as inline SVG and CSS. No charting dependency.

## Consequences

**Good.** The bundle grows by a few kilobytes rather than doubling. Each chart
is a few dozen lines of path arithmetic that can be read in full. Light and
dark are two separately chosen palettes rather than whatever the library
inverts to.

**Cost.** No axis auto-scaling, no zoom, no brush selection, no animation.
Adding a fourth chart form means writing it. If this dashboard grows past
about five forms or needs interaction beyond hover, adopting a library becomes
the right call and this ADR should be superseded.

**Constraint carried through.** One value axis per chart — revenue and order
count are never plotted on two y-scales; order count lives in the tooltip
instead. A dual-axis chart lets the author imply any correlation they like by
choosing the scales, which is why it is excluded rather than merely avoided.
