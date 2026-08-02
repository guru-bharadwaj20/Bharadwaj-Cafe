import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { btnPrimary } from '../styles/buttons';
import { loadingContainer, spinner } from '../styles/feedback';
import { statusColours } from '../styles/status';
import { sectionContent } from '../styles/layout';

/*
 * Order history.
 *
 * Migrated from order-history.css, and this one is not a straight port.
 *
 * The stylesheet had been written against different markup from the markup
 * that shipped. Fifteen of the classes this component renders were declared in
 * no stylesheet in the project -- `.order-history-page`, `.order-header`,
 * `.order-body`, `.order-footer`, `.order-status-badge`, `.order-item`,
 * `.item-info`, `.detail-row`, `.no-orders`, `.modal-close`, `.modal-item`,
 * `.modal-total` among them -- while the file carried `.order-card-header`,
 * `.order-card-body`, `.order-card-footer`, `.order-status`, `.detail-item`,
 * `.empty-state` and `.btn-close-modal`, which nothing rendered. The two sets
 * are the same design under different names.
 *
 * So most of this page was unstyled: the heading was UA-default black on the
 * dark background, the status "badge" was a plain coloured block rather than a
 * pill, the card header and footer were neither dark nor laid out, the item
 * rows did not align (the stylesheet styles `.order-items li` and the markup
 * uses divs), and every `<p>` in the modal was black on #2a2a2a.
 *
 * The stepper was the clearest case. It needs a `.tracking-steps` flex row and
 * a `.tracking-line` behind it; the markup had neither, so five steps that were
 * designed to sit in a row with a progress line through them stacked vertically
 * instead, `flex: 1` inert on a non-flex parent. Both are restored here, and
 * the five hand-copied step blocks are one array, which is also what makes the
 * progress width derivable rather than guessed.
 *
 * The values are order-history.css's own throughout. What changed is that the
 * page now receives them.
 */

const page = 'min-h-screen bg-dark pb-[50px] pt-10';

const header = 'mb-10 text-center text-white';
const headerTitle = 'mb-2.5 text-xxl text-secondary';

const list = 'mx-auto max-w-[900px] px-5';

const card =
  'mb-[25px] overflow-hidden rounded-xl bg-[#2a2a2a] transition-transform duration-300 hover:-translate-y-[3px] hover:shadow-[0_5px_20px_rgba(243,150,28,0.2)]';

/** The header and footer bars are the same bar. */
const cardBar =
  'flex flex-wrap items-center justify-between gap-2.5 bg-[#1a1a1a] px-5 py-[15px] to-768:flex-col to-768:items-start';

const orderId = 'text-m font-bold text-secondary';
const orderDate = 'text-s text-[#ccc]';

/* `inline-block` so the vertical padding still reserves height when the pill is
   used inline, as it is inside the modal's "Status:" line. In the card header
   it is a flex item and blockified there anyway. */
const statusPill = (status) =>
  `inline-block rounded-[20px] px-[15px] py-1.5 text-[12px] font-bold uppercase ${statusColours(status)}`;

const cardBody = 'p-5';
const itemsBlock = 'mb-[15px]';
const itemsTitle = 'mb-2.5 text-m text-white';
const itemRow = 'flex justify-between py-[5px] text-[#ccc]';
const itemQuantity = 'mr-2.5 font-bold text-secondary';
const itemPrice = 'min-w-[80px] text-right text-white';

/* A single top rule. Preflight is off, so the three sides not named would fall
   back to the CSS initial `medium` width and draw a full box. */
const details =
  'mt-[15px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[15px] border-x-0 border-b-0 border-t border-solid border-[#3a3a3a] pt-[15px] to-768:grid-cols-1';

const detailItem = 'flex flex-col gap-[5px]';
const detailLabel = 'text-s uppercase tracking-[0.5px] text-[#999]';
const detailValue = 'text-n text-white';

/* ---------------------------------------------------------------- tracker -- */

const STEPS = [
  {
    label: 'Placed',
    icon: 'fa-check',
    reached: ['pending', 'confirmed', 'preparing', 'ready', 'delivered'],
  },
  {
    label: 'Confirmed',
    icon: 'fa-check-double',
    reached: ['confirmed', 'preparing', 'ready', 'delivered'],
  },
  { label: 'Preparing', icon: 'fa-fire', reached: ['preparing', 'ready', 'delivered'] },
  { label: 'Ready', icon: 'fa-box', reached: ['ready', 'delivered'] },
  { label: 'Delivered', icon: 'fa-truck', reached: ['delivered'] },
];

const tracking = 'my-5 rounded-s bg-[#1a1a1a] p-5';
const trackingSteps =
  'relative flex items-center justify-between py-5 to-768:flex-col to-768:gap-5';
const trackingStep = 'relative z-[1] flex-1 text-center';

const trackingIconBox =
  'mx-auto mb-2.5 flex h-[50px] w-[50px] items-center justify-center rounded-circle text-[20px] transition-all duration-300';

const trackingIconIdle = `${trackingIconBox} bg-[#3a3a3a] text-[#666]`;
const trackingIconDone = `${trackingIconBox} bg-secondary text-black shadow-[0_0_15px_rgba(243,150,28,0.5)]`;
const trackingIconActive = `${trackingIconBox} animate-track-pulse bg-secondary text-black`;

const trackingLabelIdle = 'mt-2.5 block text-s text-[#666] transition-all duration-300';
const trackingLabelDone =
  'mt-2.5 block text-s font-bold text-secondary transition-all duration-300';

/* The rail sits behind the icons; `top-[45px]` lines it up with their centres.
   It is hidden below 768px, where the steps stack and a horizontal rail would
   run across nothing. */
const trackingLine = 'absolute inset-x-0 top-[45px] z-0 h-[3px] bg-[#3a3a3a] to-768:hidden';
const trackingProgress = 'h-full bg-secondary transition-[width] duration-500';

/* ------------------------------------------------------------------ modal -- */

const overlay = 'fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.8)] p-5';

const modal =
  'relative max-h-[90vh] w-full max-w-[700px] overflow-y-auto rounded-xl bg-[#2a2a2a] to-768:max-h-[95vh]';

const modalHeader = 'sticky top-0 z-10 flex items-center justify-between bg-[#1a1a1a] p-5';

const modalTitle = 'text-xl text-secondary';

const modalClose =
  'flex h-10 w-10 cursor-pointer items-center justify-center rounded-circle border-none bg-transparent p-0 text-[30px] text-white transition-all duration-300 hover:rotate-90 hover:bg-[#3a3a3a]';

const modalBody = 'p-5';
const modalSection = 'mb-[25px]';
const modalSectionTitle = 'mb-[15px] flex items-center gap-2.5 text-l text-white';

/* Nothing declared a colour for the modal's paragraphs, so they inherited the
   UA default and rendered black on #2a2a2a. */
const modalText = 'py-1 text-n text-[#ccc]';
const modalRow = 'flex justify-between py-[5px] text-[#ccc]';
const modalTotal =
  'mt-2.5 flex justify-between border-x-0 border-b-0 border-t border-solid border-[#3a3a3a] pt-2.5 text-m text-secondary';

const emptyState = 'px-5 py-[100px] text-center text-white';

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.getMyOrders(user?.token);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={page}>
        <div className={loadingContainer}>
          <div className={spinner}></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={page} id="main-content">
      <div className={sectionContent}>
        <div className={header}>
          <h1 className={headerTitle}>
            <i className="fas fa-history" aria-hidden="true"></i> Order History
          </h1>
        </div>

        {orders.length === 0 ? (
          <div className={emptyState}>
            <i
              className="mb-5 text-[80px] text-secondary opacity-50 fas fa-shopping-bag"
              aria-hidden="true"
            ></i>
            <h2 className="mb-2.5 text-xl">No Orders Yet</h2>
            <p className="mb-[30px] text-[#999]">
              Start exploring our menu and place your first order!
            </p>
            <a href="/order" className={btnPrimary}>
              Browse Menu
            </a>
          </div>
        ) : (
          <div className={list}>
            {orders.map((order) => {
              // How far along the five steps this order is, which is both the
              // per-step state and the width of the progress rail.
              const reached = STEPS.filter((step) => step.reached.includes(order.status)).length;

              return (
                <div key={order._id} className={card}>
                  <div className={cardBar}>
                    <div>
                      <h3 className={orderId}>Order #{order._id.slice(-8).toUpperCase()}</h3>
                      <span className={orderDate}>
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className={statusPill(order.status)}>{order.status.toUpperCase()}</div>
                  </div>

                  <div className={cardBody}>
                    <div className={itemsBlock}>
                      <h4 className={itemsTitle}>Items ({order.items.length})</h4>
                      {order.items.map((item, index) => (
                        <div key={index} className={itemRow}>
                          <div className="flex flex-1 items-center">
                            <span className="flex-1">{item.name}</span>
                            <span className={itemQuantity}>x{item.quantity}</span>
                          </div>
                          {/* `.item-price` was declared in cart.css too, with
                              `color: ... !important`, so this rendered in the
                              cart's amber bold 18px beside the already-amber
                              quantity. These are this page's own values. */}
                          <span className={itemPrice}>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className={details}>
                      <div className={detailItem}>
                        <span className={detailLabel}>
                          <i className="fas fa-shopping-bag" aria-hidden="true"></i> Order Type
                        </span>
                        <span className={detailValue}>{order.orderType}</span>
                      </div>
                      {order.deliveryAddress && (
                        <div className={detailItem}>
                          <span className={detailLabel}>
                            <i className="fas fa-location-dot" aria-hidden="true"></i> Delivery
                            Address
                          </span>
                          <span className={detailValue}>{order.deliveryAddress}</span>
                        </div>
                      )}
                      {order.specialInstructions && (
                        <div className={detailItem}>
                          <span className={detailLabel}>
                            <i className="fas fa-note-sticky" aria-hidden="true"></i> Instructions
                          </span>
                          <span className={detailValue}>{order.specialInstructions}</span>
                        </div>
                      )}
                    </div>

                    <div className={tracking}>
                      <div className={trackingSteps}>
                        <div className={trackingLine} aria-hidden="true">
                          <div
                            className={trackingProgress}
                            style={{
                              width: `${reached <= 1 ? 0 : ((reached - 1) / (STEPS.length - 1)) * 100}%`,
                            }}
                          />
                        </div>

                        {STEPS.map((step, index) => {
                          const done = index < reached;
                          const current = index === reached - 1;

                          return (
                            <div key={step.label} className={trackingStep}>
                              <div
                                className={
                                  current
                                    ? trackingIconActive
                                    : done
                                      ? trackingIconDone
                                      : trackingIconIdle
                                }
                              >
                                <i className={`fas ${step.icon}`} aria-hidden="true"></i>
                              </div>
                              <span className={done ? trackingLabelDone : trackingLabelIdle}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={cardBar}>
                    <div className="text-l text-white">
                      <span>Total Amount:</span>
                      <span className="ml-2.5 text-xl font-bold text-secondary">
                        ₹{order.totalAmount}
                      </span>
                    </div>
                    <button
                      className="flex cursor-pointer items-center gap-2 rounded-s border-none bg-secondary px-[25px] py-2.5 font-bold text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(243,150,28,0.3)]"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className={overlay} onClick={() => setSelectedOrder(null)}>
          <div className={modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalHeader}>
              <h2 className={modalTitle}>Order Details</h2>
              <button
                className={modalClose}
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
            <div className={modalBody}>
              <div className={modalSection}>
                <h3 className={modalSectionTitle}>Order Information</h3>
                <p className={modalText}>
                  <strong>Order ID:</strong> {selectedOrder._id}
                </p>
                <p className={modalText}>
                  <strong>Status:</strong>{' '}
                  <span className={statusPill(selectedOrder.status)}>
                    {selectedOrder.status.toUpperCase()}
                  </span>
                </p>
                <p className={modalText}>
                  <strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
                <p className={modalText}>
                  <strong>Order Type:</strong> {selectedOrder.orderType}
                </p>
              </div>

              <div className={modalSection}>
                <h3 className={modalSectionTitle}>Customer Information</h3>
                <p className={modalText}>
                  <strong>Name:</strong> {selectedOrder.customerName}
                </p>
                <p className={modalText}>
                  <strong>Email:</strong> {selectedOrder.customerEmail}
                </p>
                <p className={modalText}>
                  <strong>Phone:</strong> {selectedOrder.customerPhone}
                </p>
                {selectedOrder.deliveryAddress && (
                  <p className={modalText}>
                    <strong>Address:</strong> {selectedOrder.deliveryAddress}
                  </p>
                )}
              </div>

              <div className={modalSection}>
                <h3 className={modalSectionTitle}>Order Items</h3>
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className={modalRow}>
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className={modalTotal}>
                  <strong>Total:</strong>
                  <strong>₹{selectedOrder.totalAmount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
