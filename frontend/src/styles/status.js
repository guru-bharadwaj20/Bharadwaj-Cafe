/**
 * Order status colours.
 *
 * The same six pairs were written out three times: twice in admin.css (once
 * for the pill, once for the `<select>`) and once in order-history.css. The
 * order history page then ignored all of it and set a background from a
 * `getStatusColor` map in the component instead, which is a fourth copy and the
 * only one that shipped -- with no foreground colour, so a "READY" pill was
 * black-on-amber by luck and "CONFIRMED" was black on #2196f3.
 *
 * One map, used by both pages.
 */
export const ORDER_STATUS = {
  pending: 'bg-[#ffa500] text-black',
  confirmed: 'bg-[#2196f3] text-white',
  preparing: 'bg-[#9c27b0] text-white',
  ready: 'bg-[#ff9800] text-black',
  delivered: 'bg-[#4caf50] text-white',
  cancelled: 'bg-[#f44336] text-white',
};

/** An unrecognised status still needs to be legible. */
export const ORDER_STATUS_FALLBACK = 'bg-[#666] text-white';

export const statusColours = (status) => ORDER_STATUS[status] ?? ORDER_STATUS_FALLBACK;
