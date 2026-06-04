import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Star,
} from 'lucide-react'
import type { PromotionSlotItem } from './api'
import { usePromotionSlot, useRecordPromotionEvent } from './hooks'
import { buildInstallCommand, getBaseUrl } from '@/features/skill/install-command'
import { useCopyToClipboard } from '@/shared/lib/clipboard'
import { formatCompactCount } from '@/shared/lib/number-format'
import { toast } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'

type PromotionSlotDisplayVariant = 'hero' | 'strip' | 'pinned'

interface PromotionSlotDisplayProps {
  slotCode: string
  variant?: PromotionSlotDisplayVariant
  maxItems?: number
  className?: string
}

const PROMOTION_CARD_PALETTES = [
  {
    accent: 'bg-amber-300',
    pinned: 'border-slate-950 bg-[linear-gradient(115deg,#0b1220_0%,#12372f_58%,#0f766e_100%)] text-white shadow-[0_18px_44px_-28px_rgba(15,23,42,0.95)] ring-1 ring-white/10 hover:shadow-[0_26px_58px_-30px_rgba(15,23,42,0.95)] hover:ring-amber-300/35',
    light: 'border-emerald-200 bg-[linear-gradient(115deg,#ffffff_0%,#f0fdf4_58%,#ecfeff_100%)] text-slate-950 shadow-[0_14px_34px_-28px_rgba(15,118,110,0.55)] ring-1 ring-emerald-500/10 hover:border-emerald-300 hover:shadow-[0_22px_44px_-30px_rgba(15,118,110,0.65)] hover:ring-emerald-500/25',
  },
  {
    accent: 'bg-sky-300',
    pinned: 'border-slate-950 bg-[linear-gradient(115deg,#0f172a_0%,#1e3a8a_55%,#0e7490_100%)] text-white shadow-[0_18px_44px_-28px_rgba(15,23,42,0.95)] ring-1 ring-white/10 hover:shadow-[0_26px_58px_-30px_rgba(30,64,175,0.9)] hover:ring-sky-300/35',
    light: 'border-sky-200 bg-[linear-gradient(115deg,#ffffff_0%,#eff6ff_58%,#ecfeff_100%)] text-slate-950 shadow-[0_14px_34px_-28px_rgba(2,132,199,0.55)] ring-1 ring-sky-500/10 hover:border-sky-300 hover:shadow-[0_22px_44px_-30px_rgba(2,132,199,0.65)] hover:ring-sky-500/25',
  },
  {
    accent: 'bg-rose-300',
    pinned: 'border-slate-950 bg-[linear-gradient(115deg,#111827_0%,#7f1d1d_54%,#be123c_100%)] text-white shadow-[0_18px_44px_-28px_rgba(15,23,42,0.95)] ring-1 ring-white/10 hover:shadow-[0_26px_58px_-30px_rgba(190,18,60,0.85)] hover:ring-rose-300/35',
    light: 'border-rose-200 bg-[linear-gradient(115deg,#ffffff_0%,#fff1f2_58%,#fff7ed_100%)] text-slate-950 shadow-[0_14px_34px_-28px_rgba(225,29,72,0.5)] ring-1 ring-rose-500/10 hover:border-rose-300 hover:shadow-[0_22px_44px_-30px_rgba(225,29,72,0.6)] hover:ring-rose-500/25',
  },
  {
    accent: 'bg-lime-300',
    pinned: 'border-slate-950 bg-[linear-gradient(115deg,#0f172a_0%,#365314_54%,#15803d_100%)] text-white shadow-[0_18px_44px_-28px_rgba(15,23,42,0.95)] ring-1 ring-white/10 hover:shadow-[0_26px_58px_-30px_rgba(21,128,61,0.85)] hover:ring-lime-300/35',
    light: 'border-lime-200 bg-[linear-gradient(115deg,#ffffff_0%,#f7fee7_58%,#f0fdf4_100%)] text-slate-950 shadow-[0_14px_34px_-28px_rgba(77,124,15,0.5)] ring-1 ring-lime-500/10 hover:border-lime-300 hover:shadow-[0_22px_44px_-30px_rgba(77,124,15,0.6)] hover:ring-lime-500/25',
  },
] as const

function PromotionItemCard({
  item,
  variant,
  hasMultiple,
  activeIndex,
  totalItems,
  onClick,
  onPrevious,
  onNext,
  onSelect,
}: {
  item: PromotionSlotItem
  variant: PromotionSlotDisplayVariant
  hasMultiple: boolean
  activeIndex: number
  totalItems: number
  onClick: (event: MouseEvent<HTMLAnchorElement>, item: PromotionSlotItem) => void
  onPrevious: () => void
  onNext: () => void
  onSelect: (index: number) => void
}) {
  const { t } = useTranslation()
  const [copied, copy] = useCopyToClipboard()
  const baseUrl = useMemo(() => getBaseUrl(), [])
  const isPinned = variant === 'pinned'
  const isHero = variant === 'hero'
  const displayName = item.targetName || item.title
  const summary = item.targetSummary || item.subtitle
  const palette = PROMOTION_CARD_PALETTES[activeIndex % PROMOTION_CARD_PALETTES.length]
  const installCommand = useMemo(() => {
    if (item.targetType !== 'SKILL' || !item.targetNamespace || !item.targetSlug) {
      return null
    }
    return buildInstallCommand(item.targetNamespace, item.targetSlug, baseUrl)
  }, [baseUrl, item.targetNamespace, item.targetSlug, item.targetType])

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!installCommand) {
      return
    }
    try {
      await copy(installCommand)
      toast.success('Install command copied', installCommand)
    } catch {
      toast.error('Failed to copy install command')
    }
  }

  const iconButtonClassName = cn(
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    isPinned
      ? 'border-white/15 bg-white/10 text-white hover:bg-white/18 focus-visible:ring-white/60 focus-visible:ring-offset-slate-950'
      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700 focus-visible:ring-emerald-500/60',
  )
  const metricClassName = cn(
    'inline-flex items-center gap-1 text-[11px] font-semibold leading-none',
    isPinned ? 'text-emerald-50/85' : 'text-slate-500',
  )

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border px-3 py-2.5 transition-all duration-200',
        item.targetUrl && 'cursor-pointer hover:-translate-y-0.5',
        hasMultiple && 'pb-4',
        isHero && 'md:px-4',
        isPinned ? palette.pinned : palette.light,
      )}
    >
      {item.targetUrl ? (
        <a
          href={item.targetUrl}
          onClick={(event) => onClick(event, item)}
          aria-label={displayName}
          className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2"
        />
      ) : null}
      <span
        className={cn('absolute inset-y-0 left-0 z-10 w-1 transition-all duration-200 group-hover:w-1.5', palette.accent)}
        aria-hidden="true"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <h3 className={cn('line-clamp-1 font-heading text-sm font-semibold leading-tight transition-colors md:text-base', isPinned ? 'text-white' : 'text-slate-950 group-hover:text-emerald-800')}>
            {displayName}
          </h3>
          {summary ? (
            <p className={cn('mt-0.5 line-clamp-1 text-xs leading-relaxed', isPinned ? 'text-emerald-50/80' : 'text-slate-600')}>
              {summary}
            </p>
          ) : null}
          {item.targetVersion ? (
            <span className={cn('mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-medium', isPinned ? 'bg-white/10 text-white' : 'bg-white/75 text-slate-600')}>
              v{item.targetVersion}
            </span>
          ) : null}
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            {hasMultiple ? (
              <>
                <button
                  type="button"
                  className={iconButtonClassName}
                  title={t('promotionSlots.previous')}
                  aria-label={t('promotionSlots.previous')}
                  onClick={onPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={iconButtonClassName}
                  title={t('promotionSlots.next')}
                  aria-label={t('promotionSlots.next')}
                  onClick={onNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
            {installCommand ? (
              <button
                type="button"
                onClick={handleCopy}
                title={installCommand}
                aria-label={copied ? t('copyButton.copied') : t('copyButton.copy')}
                className={iconButtonClassName}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
          <div className="flex min-h-3.5 items-center justify-end gap-2">
            {typeof item.downloadCount === 'number' ? (
              <span className={metricClassName}>
                <Download className="h-3 w-3" />
                {formatCompactCount(item.downloadCount)}
              </span>
            ) : null}
            {typeof item.starCount === 'number' ? (
              <span className={metricClassName}>
                <Star className="h-3 w-3" />
                {formatCompactCount(item.starCount)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {hasMultiple ? (
        <div className="pointer-events-auto absolute bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">
          {Array.from({ length: totalItems }, (_, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === activeIndex
                  ? isPinned ? 'w-4 bg-amber-300' : 'w-4 bg-emerald-600'
                  : isPinned ? 'w-1.5 bg-white/35' : 'w-1.5 bg-slate-300',
              )}
              aria-label={t('promotionSlots.goTo', { index: index + 1, total: totalItems })}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => onSelect(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Public promotion slot renderer. It shows one compact promoted item at a time,
 * rotates through concurrent campaigns, and records impressions per visible slide.
 */
export function PromotionSlotDisplay({
  slotCode,
  variant = 'strip',
  maxItems = 3,
  className,
}: PromotionSlotDisplayProps) {
  const { data: items, isLoading, error } = usePromotionSlot(slotCode)
  const { mutate: recordPromotionEvent } = useRecordPromotionEvent()
  const recordedImpressions = useRef<Set<number>>(new Set())
  const visibleItems = useMemo(() => (items ?? []).slice(0, maxItems), [items, maxItems])
  const [activeIndex, setActiveIndex] = useState(0)
  const activeItem = visibleItems[activeIndex] ?? visibleItems[0]

  useEffect(() => {
    recordedImpressions.current.clear()
    setActiveIndex(0)
  }, [slotCode])

  useEffect(() => {
    if (activeIndex >= visibleItems.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, visibleItems.length])

  useEffect(() => {
    if (visibleItems.length <= 1 || typeof window === 'undefined') {
      return
    }
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleItems.length)
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [visibleItems.length])

  useEffect(() => {
    if (!activeItem || recordedImpressions.current.has(activeItem.campaignId)) {
      return
    }
    recordedImpressions.current.add(activeItem.campaignId)
    recordPromotionEvent({ id: activeItem.campaignId, eventType: 'IMPRESSION' })
  }, [activeItem, recordPromotionEvent])

  const recordClickAndNavigate = (event: MouseEvent<HTMLAnchorElement>, item: PromotionSlotItem) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      recordPromotionEvent({ id: item.campaignId, eventType: 'CLICK' })
      return
    }

    event.preventDefault()
    let navigated = false
    const navigateOnce = () => {
      if (navigated || !item.targetUrl || typeof window === 'undefined') {
        return
      }
      navigated = true
      window.location.assign(item.targetUrl)
    }

    const fallback = window.setTimeout(navigateOnce, 250)
    recordPromotionEvent(
      { id: item.campaignId, eventType: 'CLICK' },
      {
        onSettled: () => {
          window.clearTimeout(fallback)
          navigateOnce()
        },
      },
    )
  }

  if (isLoading || error || visibleItems.length === 0 || !activeItem) {
    return null
  }

  return (
    <section className={className} aria-label={`${slotCode} promotions`}>
      <PromotionItemCard
        item={activeItem}
        variant={variant}
        hasMultiple={visibleItems.length > 1}
        activeIndex={visibleItems.indexOf(activeItem)}
        totalItems={visibleItems.length}
        onClick={recordClickAndNavigate}
        onPrevious={() => setActiveIndex((current) => (current - 1 + visibleItems.length) % visibleItems.length)}
        onNext={() => setActiveIndex((current) => (current + 1) % visibleItems.length)}
        onSelect={setActiveIndex}
      />
    </section>
  )
}
