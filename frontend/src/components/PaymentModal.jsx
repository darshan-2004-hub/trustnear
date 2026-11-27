/**
 * PaymentModal – DEMO payment flow for TrustNear.
 *
 * Shows payment status for a booking and lets the customer:
 *   1. Pay the 20% advance (when booking is 'accepted')
 *   2. Pay the 80% balance (when booking is 'completed' and advance is paid)
 *
 * Props
 * -----
 * booking  : booking object
 * role     : 'customer' | 'provider'
 * onClose  : () => void
 * onPaid   : () => void  – called after a successful payment
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, IndianRupee, CheckCircle2, AlertCircle, CreditCard,
  Receipt, Loader2, ShieldCheck, AlertTriangle
} from 'lucide-react';
import api from '../services/api';

const PAYMENT_STATUS_STYLES = {
  unpaid:        { bg: 'bg-slate-50 text-slate-600 border-slate-200',   label: 'Unpaid' },
  partially_paid:{ bg: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'Advance Paid' },
  fully_paid:    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Fully Paid' },
  refunded:      { bg: 'bg-blue-50 text-blue-700 border-blue-200',      label: 'Refunded' },
};

const fmt = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;

export default function PaymentModal({ booking, role, onClose, onPaid }) {
  const [payment, setPayment]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [simulating, setSimulating] = useState(null); // 'advance' | 'balance'
  const [result, setResult]         = useState(null); // { success, message, txnId }

  const isCustomer = role === 'customer';

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/payments/booking/${booking.id}`);
      if (res.data?.success) {
        setPayment(res.data.payment);
      } else {
        setError(res.data?.message || 'Could not load payment details.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payment info.');
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const handlePay = async (type, simulate) => {
    setSimulating(type);
    setResult(null);
    try {
      const endpoint = `/payments/booking/${booking.id}/${type}`;
      const res = await api.post(endpoint, { simulate });
      const ok = res.data?.payment_success;
      setResult({
        success: ok,
        message: res.data?.message || (ok ? 'Payment recorded.' : 'Payment failed.'),
        txnId: res.data?.transaction_id,
      });
      if (ok) {
        setPayment(res.data.payment);
        if (onPaid) onPaid();
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Payment request failed.',
      });
    } finally {
      setSimulating(null);
    }
  };

  const statusStyle = PAYMENT_STATUS_STYLES[payment?.payment_status] || PAYMENT_STATUS_STYLES.unpaid;

  const canPayAdvance =
    isCustomer &&
    booking.status === 'accepted' &&
    payment?.payment_status === 'unpaid' &&
    !payment?.advance_transaction_id;

  const canPayBalance =
    isCustomer &&
    booking.status === 'completed' &&
    payment?.payment_status === 'partially_paid' &&
    payment?.advance_transaction_id &&
    !payment?.balance_transaction_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-emerald-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-sky-50">
          <div className="flex items-center space-x-2 text-emerald-700">
            <CreditCard className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-black text-[#172033]">Payment Details</h3>
              <p className="text-[10px] text-[#475569]">Booking #{booking.id} · {booking.service_title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
              DEMO
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#475569] hover:text-[#172033] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">

          {/* Demo banner */}
          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <p>
              <strong>DEMO SYSTEM</strong> — This is a simulated payment interface.
              No real money is transferred and no card details are required.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-[#475569]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Loading payment record…</span>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : payment ? (
            <>
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                  Payment Status
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${statusStyle.bg}`}>
                  {statusStyle.label}
                </span>
              </div>

              {/* Amount breakdown */}
              <div className="bg-slate-50 rounded-xl border border-[#e2e8f0] divide-y divide-[#e2e8f0] overflow-hidden">
                <Row label="Total Agreed Price"  value={fmt(payment.total_amount)} bold />
                <Row label="20% Advance"         value={fmt(payment.advance_amount)} />
                <Row label="80% Balance"         value={fmt(payment.balance_amount)} />
                <Row label="Amount Paid"         value={fmt(payment.amount_paid)} accent />
              </div>

              {/* Transaction references */}
              {payment.advance_transaction_id && (
                <TxnBadge label="Advance Txn" txnId={payment.advance_transaction_id} />
              )}
              {payment.balance_transaction_id && (
                <TxnBadge label="Balance Txn" txnId={payment.balance_transaction_id} />
              )}
              {payment.payment_status === 'refunded' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 space-y-1">
                  <p className="font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> <span>Refunded</span>
                  </p>
                  {payment.refund_reason && <p>Reason: {payment.refund_reason}</p>}
                </div>
              )}

              {/* Payment result message */}
              {result && (
                <div className={`flex items-start space-x-2 p-3 rounded-xl border text-[11px] ${
                  result.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {result.success
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <div>
                    <p>{result.message}</p>
                    {result.txnId && (
                      <p className="mt-1 font-mono text-[10px] text-emerald-700">
                        Ref: {result.txnId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Customer action buttons */}
              {isCustomer && canPayAdvance && !result?.success && (
                <PaySection
                  title="Pay 20% Advance"
                  amount={fmt(payment.advance_amount)}
                  onSuccess={() => handlePay('advance', 'success')}
                  onFailure={() => handlePay('advance', 'failure')}
                  loading={simulating === 'advance'}
                />
              )}

              {isCustomer && canPayBalance && !result?.success && (
                <PaySection
                  title="Pay 80% Balance"
                  amount={fmt(payment.balance_amount)}
                  onSuccess={() => handlePay('balance', 'success')}
                  onFailure={() => handlePay('balance', 'failure')}
                  loading={simulating === 'balance'}
                />
              )}

              {/* Fully paid confirmation */}
              {payment.payment_status === 'fully_paid' && (
                <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p className="font-bold">Payment complete — fully paid. Thank you!</p>
                </div>
              )}

              {/* Provider read-only info */}
              {!isCustomer && (
                <p className="text-[10px] text-[#475569] text-center italic pt-1">
                  Read-only view — payment actions are for customers only.
                </p>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 btn-secondary rounded-xl text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Row({ label, value, bold, accent }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs">
      <span className="text-[#475569]">{label}</span>
      <span className={`font-${bold ? 'black' : 'semibold'} ${accent ? 'text-blue-700' : 'text-[#172033]'}`}>
        {value}
      </span>
    </div>
  );
}

function TxnBadge({ label, txnId }) {
  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
      <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <div>
        <p className="text-[10px] text-[#475569] font-semibold">{label}</p>
        <p className="font-mono text-[10px] text-emerald-700 font-bold">{txnId}</p>
      </div>
    </div>
  );
}

function PaySection({ title, amount, onSuccess, onFailure, loading }) {
  return (
    <div className="p-3 border border-[#e2e8f0] rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#172033]">{title}</span>
        <span className="font-black text-blue-700 flex items-center">
          <IndianRupee className="w-3 h-3" />{amount.replace('₹', '')}
        </span>
      </div>
      <p className="text-[10px] text-[#475569]">
        Select a simulation outcome (no real money is charged):
      </p>
      <div className="flex space-x-2">
        <button
          onClick={onSuccess}
          disabled={loading}
          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : (
            '✓ Simulate Success'
          )}
        </button>
        <button
          onClick={onFailure}
          disabled={loading}
          className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-[11px] transition disabled:opacity-50 cursor-pointer"
        >
          ✕ Simulate Failure
        </button>
      </div>
    </div>
  );
}
