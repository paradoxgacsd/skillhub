import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Sparkles,
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
  const targetLabel = item.targetType === 'SKILL_BUNDLE'
    ? t('promotionSlots.targetBundle')
    : t('promotionSlots.targetSkill')
  const displayName = item.targetName || item.title
  const summary = item.targetSummary || item.subtitle
  const namespaceLabel = item.targetNamespace && item.targetSlug
    ? `@${item.targetNamespace}/${item.targetSlug}`
    : targetLabel
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
    'hidden items-center gap-1 text-xs font-semibold md:inline-flex',
    isPinned ? 'text-emerald-50/85' : 'text-slate-500',
  )

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border px-3 py-2.5 shadow-sm transition-colors',
        hasMultiple && 'pb-4',
        isHero && 'md:px-4',
        isPinned
          ? 'border-slate-950 bg-[linear-gradient(115deg,#0b1220_0%,#12372f_58%,#0f766e_100%)] text-white shadow-[0_14px_36px_-26px_rgba(15,23,42,0.9)]'
          : 'border-emerald-200 bg-white text-slate-950 ring-1 ring-emerald-500/10',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          isPinned ? 'bg-amber-300' : 'bg-emerald-500',
        )}
        aria-hidden="true"
      />
      <div className="relative z-10 flex min-w-0 items-center gap-3 pl-1">
        <div
          className={cn(
            'relative shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-600',
            isHero ? 'h-12 w-12 md:h-14 md:w-14' : 'h-11 w-11',
          )}
        >
          {item.coverUrl ? (
            <img src={item.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white">
              <Sparkles className="h-5 w-5" strokeWidth={1.8} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold uppercase',
                isPinned ? 'bg-amber-300 text-slate-950' : 'bg-emerald-600 text-white',
              )}
            >
              <Sparkles className="h-3 w-3" />
              {t('promotionSlots.sponsored')}
            </span>
            <span className={cn('truncate text-xs font-medium', isPinned ? 'text-emerald-50/85' : 'text-slate-500')}>
              {namespaceLabel}
            </span>
            {item.targetVersion ? (
              <span className={cn('hidden rounded-full px-1.5 py-0.5 text-[11px] font-medium sm:inline-flex', isPinned ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600')}>
                v{item.targetVersion}
              </span>
            ) : null}
          </div>
          <h3 className={cn('line-clamp-1 font-heading text-sm font-semibold leading-tight md:text-base', isPinned ? 'text-white' : 'text-slate-950')}>
            {displayName}
          </h3>
          {summary ? (
            <p className={cn('mt-0.5 line-clamp-1 text-xs leading-relaxed', isPinned ? 'text-emerald-50/80' : 'text-slate-600')}>
              {summary}
            </p>
          ) : null}
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {typeof item.downloadCount === 'number' ? (
            <span className={metricClassName}>
              <Download className="h-3.5 w-3.5" />
              {formatCompactCount(item.downloadCount)}
            </span>
          ) : null}
          {typeof item.starCount === 'number' ? (
            <span className={metricClassName}>
              <Star className="h-3.5 w-3.5" />
              {formatCompactCount(item.starCount)}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
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
          {item.targetUrl ? (
            <a
              href={item.targetUrl}
              onClick={(event) => onClick(event, item)}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isPinned
                  ? 'bg-white text-slate-950 hover:bg-emerald-50 focus-visible:ring-white/60 focus-visible:ring-offset-slate-950'
                  : 'bg-slate-950 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/60',
              )}
            >
              <span className="hidden md:inline">{t('promotionSlots.openTarget')}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
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
      </div>

      {hasMultiple ? (
        <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
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
