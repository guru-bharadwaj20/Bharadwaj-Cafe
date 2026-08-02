/**
 * The admin console.
 *
 * Migrated from admin.css. Everything here is used by pages/AdminDashboard.jsx;
 * it lives in its own module rather than at the top of that file because the
 * dashboard is four components in one file and the strings would bury them.
 *
 * Two things this file has to encode that admin.css did not say out loud:
 *
 * 1. The tab buttons were styled by two stylesheets at once. admin.css declared
 *    `.admin-tabs .tab-btn` and profile.css declared `.tab-btn` bare, so the
 *    admin tabs quietly inherited `flex: 1`, `min-width: 200px`,
 *    `justify-content: center`, `font-weight: 500` and an icon size from the
 *    account page's stylesheet. Reading admin.css alone would have lost four
 *    declarations and changed the layout. See `adminTab`.
 *
 * 2. Anywhere a base and a state set the same property, they are kept in
 *    separate strings rather than concatenated. Tailwind resolves two utilities
 *    for one property by emission order, not by the order they appear in a
 *    className, so `${base} font-bold` is not a reliable override.
 */

/* ------------------------------------------------------------- page shell -- */

export const adminPage = 'min-h-screen bg-dark pb-[50px] pt-10';

export const adminHeader = 'mb-10 text-center text-white';
export const adminHeaderTitle = 'mb-2.5 text-xxl text-secondary';
export const adminHeaderText = 'text-m opacity-80';

export const adminTabs = 'mb-10 flex flex-wrap justify-center gap-2.5';

/*
 * `flex-1`, `min-w-[200px]`, `justify-center` and the icon size come from
 * profile.css's bare `.tab-btn`, not from admin.css — see the note above.
 * Colour and weight are split into the two state strings below because both
 * states set both properties.
 */
const adminTabBox =
  'flex min-w-[200px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-s border-2 border-solid px-[30px] py-3 text-m transition-all duration-300';

export const adminTabIdle = `${adminTabBox} border-transparent bg-[#2a2a2a] font-medium text-white hover:border-secondary hover:bg-[#3a3a3a]`;

/* The hover border applies to the active tab too — `.admin-tabs .tab-btn:hover`
   set it and `.active` never overrode it — though amber on amber is invisible.
   Carried anyway so the port is exact rather than merely indistinguishable. */
export const adminTabActive = `${adminTabBox} border-transparent bg-secondary font-bold text-black hover:border-secondary`;

export const adminTabIcon = 'text-l';

/* ------------------------------------------------------------- stat cards -- */

export const statsGrid =
  'mx-auto mb-10 grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[25px] to-768:grid-cols-1';

export const statCard =
  'flex items-center gap-5 rounded-xl bg-[#2a2a2a] p-[25px] transition-transform duration-300 hover:-translate-y-[5px]';

const statIconBox =
  'flex h-[60px] w-[60px] items-center justify-center rounded-xl text-[24px] text-white';

/** Four fixed gradients, one per metric. Written out in full so Tailwind's
    source scan can see each class name. */
export const statIcon = {
  revenue: `${statIconBox} bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]`,
  orders: `${statIconBox} bg-[linear-gradient(135deg,#f093fb_0%,#f5576c_100%)]`,
  users: `${statIconBox} bg-[linear-gradient(135deg,#4facfe_0%,#00f2fe_100%)]`,
  menu: `${statIconBox} bg-[linear-gradient(135deg,#43e97b_0%,#38f9d7_100%)]`,
};

export const statValue = 'mb-[5px] text-xl text-secondary';
export const statLabel = 'text-n text-[#ccc]';

/* ---------------------------------------------------------------- section -- */

export const adminSection = 'mx-auto max-w-[1200px] px-5';
export const adminSectionTitle = 'mb-5 flex items-center gap-2.5 text-xl text-white';
export const sectionHeader = 'mb-5 flex items-center justify-between';

/* ------------------------------------------------------------------ table -- */

export const tableWrap = 'overflow-hidden rounded-xl bg-[#2a2a2a] to-768:overflow-x-auto';
export const table = 'w-full border-collapse to-768:min-w-[800px]';

export const th = 'bg-[#1a1a1a] p-[15px] text-left font-bold text-secondary';

/*
 * The hairline under each cell, and the two row-level rules that go with it.
 * `border-b border-solid` alone would draw a full box: Preflight is off, so the
 * three sides not named fall back to the CSS initial `medium` width.
 */
export const td =
  'border-x-0 border-t-0 border-b border-solid border-[#3a3a3a] p-[15px] text-white';

/**
 * `tr:hover td` and `tr:last-child td`, as variants on the row.
 *
 * The pseudo-class goes inside the arbitrary selector, not in front of it.
 * `hover:[&>td]:bg-…` reads like "on hover, the cells", but Tailwind composes
 * it as `.class > td:hover` — the cell under the pointer, not every cell in the
 * hovered row — and `last:[&>td]:…` likewise becomes `> td:last-child`, the
 * rightmost cell of every row rather than the cells of the last row. Both would
 * have looked plausible and been wrong. Written `[&:hover>td]` the selector
 * comes out `.class:hover > td`, which is what the stylesheet said.
 */
export const tr = '[&:hover>td]:bg-[#3a3a3a] [&:last-child>td]:border-b-0';

/* ----------------------------------------------------------------- badges -- */

/**
 * Order status, as six fixed pairs.
 *
 * The pill and the `<select>` used the same six colours through two separate
 * rule blocks in admin.css; one map serves both, so they cannot drift apart.
 */
const STATUS = {
  pending: 'bg-[#ffa500] text-black',
  confirmed: 'bg-[#2196f3] text-white',
  preparing: 'bg-[#9c27b0] text-white',
  ready: 'bg-[#ff9800] text-black',
  delivered: 'bg-[#4caf50] text-white',
  cancelled: 'bg-[#f44336] text-white',
};

const badgeBox = 'rounded-[20px] px-3 py-[5px] text-[12px] font-bold';

export const statusBadge = (status) => `${badgeBox} uppercase ${STATUS[status] ?? ''}`;

export const statusSelect = (status) =>
  `cursor-pointer rounded-[5px] border-none px-3 py-2 font-bold ${STATUS[status] ?? ''}`;

export const roleBadge = (role) =>
  `${badgeBox} ${role === 'admin' ? 'bg-secondary text-black' : 'bg-[#2196f3] text-white'}`;

export const verified = 'text-[#4caf50]';
export const notVerified = 'text-[#f44336]';

/* ---------------------------------------------------------------- buttons -- */

const iconBtn =
  'cursor-pointer rounded-[5px] border-none px-3 py-2 text-white transition-all duration-300';

export const btnView = `${iconBtn} bg-[#2196f3] hover:bg-[#1976d2]`;
export const btnEdit = `${iconBtn} bg-[#ff9800] hover:bg-[#f57c00]`;
export const btnDelete = `${iconBtn} bg-[#f44336] hover:bg-[#d32f2f]`;

export const btnAdd =
  'flex cursor-pointer items-center gap-2 rounded-s border-none bg-secondary px-6 py-3 font-bold text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(243,150,28,0.3)]';

/* ------------------------------------------------------------- menu cards -- */

export const menuGrid =
  'grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5 to-768:grid-cols-1';

export const menuCard =
  'overflow-hidden rounded-xl bg-[#2a2a2a] transition-transform duration-300 hover:-translate-y-[5px]';

export const menuCardImage = 'h-[200px] w-full object-cover';
export const menuCardContent = 'p-[15px]';
export const menuCardTitle = 'mb-2 text-l text-secondary';
export const menuCardText = 'mb-[15px] text-s text-[#ccc]';
export const menuCardFooter = 'flex items-center justify-between';
export const menuCardPrice = 'text-l font-bold text-secondary';
export const menuActions = 'flex gap-2';
