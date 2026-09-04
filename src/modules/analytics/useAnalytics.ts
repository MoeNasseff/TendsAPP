import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRealtime } from '../../hooks/useRealtime'
import type {
  Expense,
  ExpenseCategory,
  Merchant,
  PriceObservation,
  Product,
  Receipt,
  ReceiptItem,
} from '../../lib/types'
import {
  computeCategoryRollups,
  computeHighLowSpendDays,
  computeItemCategoryRollups,
  computeItemCoverage,
  computeItemRollups,
  computeMerchantRollups,
  computeMonthOverMonthDelta,
  computeProductPriceChanges,
  computeRecentPurchases,
  computeRecurringCandidates,
  computeTotals,
  computeWeekOverWeekDelta,
  monthRangeFor,
} from './compute'
import type {
  AnalyticsResult,
  CategoryRollup,
  DateRange,
  HighLowSpendDays,
  ItemCategoryRollup,
  ItemCoverage,
  ItemRollup,
  MerchantRollup,
  PeriodDelta,
  PeriodTotals,
  ProductPriceChange,
  RecentPurchase,
  RecurringCandidate,
} from './types'

export function useAnalytics() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [priceObservations, setPriceObservations] = useState<PriceObservation[]>([])
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const [expRes, catRes, receiptRes, merchantRes, productRes, priceRes, itemRes] = await Promise.all([
      // Purchases only. A `transfer` — the account debit that settles a credit
      // card — is real money leaving a real account, but the purchases it pays
      // for are already in this table individually. Including it would count
      // every card purchase twice: once when it was made, once when the card
      // was paid. Filtered at the query rather than in compute.ts so that
      // every rollup, delta, insight and chart downstream inherits it without
      // each one having to remember. See tasks/s35-transaction-kind.md.
      supabase.from('expenses').select('*').eq('kind', 'purchase').order('spent_at', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
      supabase.from('receipts').select('*'),
      supabase.from('merchants').select('*'),
      supabase.from('products').select('*'),
      supabase.from('price_observations').select('*').order('observed_at', { ascending: true }),
      supabase.from('receipt_items').select('*').order('position', { ascending: true }),
    ])
    setExpenses(expRes.data ?? [])
    setCategories(catRes.data ?? [])
    setReceipts(receiptRes.data ?? [])
    setMerchants(merchantRes.data ?? [])
    setProducts(productRes.data ?? [])
    setPriceObservations(priceRes.data ?? [])
    setReceiptItems(itemRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('expenses', load)
  useRealtime('expense_categories', load)
  useRealtime('receipts', load)
  useRealtime('merchants', load)
  useRealtime('products', load)
  useRealtime('price_observations', load)
  useRealtime('receipt_items', load)

  const thisMonth = useMemo(() => monthRangeFor(new Date()), [])

  const totals = useMemo<AnalyticsResult<PeriodTotals>>(() => computeTotals(expenses, thisMonth), [expenses, thisMonth])

  const highLowSpendDays = useMemo<AnalyticsResult<HighLowSpendDays>>(
    () => computeHighLowSpendDays(expenses, thisMonth),
    [expenses, thisMonth],
  )

  const categoryRollups = useMemo<AnalyticsResult<{ rollups: CategoryRollup[] }>>(
    () => computeCategoryRollups(expenses, categories, thisMonth),
    [expenses, categories, thisMonth],
  )

  const merchantRollups = useMemo<AnalyticsResult<{ rollups: MerchantRollup[] }>>(
    () => computeMerchantRollups(expenses, receipts, merchants, thisMonth),
    [expenses, receipts, merchants, thisMonth],
  )

  const monthOverMonth = useMemo<AnalyticsResult<PeriodDelta>>(() => computeMonthOverMonthDelta(expenses), [expenses])

  const weekOverWeek = useMemo<AnalyticsResult<PeriodDelta>>(() => computeWeekOverWeekDelta(expenses), [expenses])

  const recurringCandidates = useMemo<AnalyticsResult<{ candidates: RecurringCandidate[] }>>(
    () => computeRecurringCandidates(expenses, receipts, merchants),
    [expenses, receipts, merchants],
  )

  const productPriceChanges = useMemo<AnalyticsResult<{ changes: ProductPriceChange[] }>>(
    () => computeProductPriceChanges(priceObservations, products),
    [priceObservations, products],
  )

  const itemRollups = useMemo<AnalyticsResult<{ rollups: ItemRollup[] }>>(
    () => computeItemRollups(receiptItems, receipts, expenses, merchants, thisMonth),
    [receiptItems, receipts, expenses, merchants, thisMonth],
  )

  const itemCategoryRollups = useMemo<AnalyticsResult<{ rollups: ItemCategoryRollup[] }>>(
    () => computeItemCategoryRollups(receiptItems, receipts, expenses, merchants, categories, thisMonth),
    [receiptItems, receipts, expenses, merchants, categories, thisMonth],
  )

  const itemCoverage = useMemo<AnalyticsResult<ItemCoverage>>(
    () => computeItemCoverage(receiptItems, receipts, expenses, merchants, thisMonth),
    [receiptItems, receipts, expenses, merchants, thisMonth],
  )

  const recentPurchases = useMemo<AnalyticsResult<{ purchases: RecentPurchase[] }>>(
    () => computeRecentPurchases(receiptItems, receipts, expenses, merchants, categories, 10),
    [receiptItems, receipts, expenses, merchants, categories],
  )

  // Lets a consumer (e.g. a date-range picker) ask for the same rollups over
  // an arbitrary window without re-deriving the fetch/join logic itself.
  const computeForRange = useCallback(
    (range: DateRange) => ({
      totals: computeTotals(expenses, range),
      highLowSpendDays: computeHighLowSpendDays(expenses, range),
      categoryRollups: computeCategoryRollups(expenses, categories, range),
      merchantRollups: computeMerchantRollups(expenses, receipts, merchants, range),
    }),
    [expenses, categories, receipts, merchants],
  )

  return {
    loading,
    expenses,
    categories,
    receipts,
    merchants,
    products,
    priceObservations,
    receiptItems,
    totals,
    highLowSpendDays,
    categoryRollups,
    merchantRollups,
    monthOverMonth,
    weekOverWeek,
    recurringCandidates,
    productPriceChanges,
    itemRollups,
    itemCategoryRollups,
    itemCoverage,
    recentPurchases,
    computeForRange,
  }
}
