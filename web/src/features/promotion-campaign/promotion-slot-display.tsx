import { type MouseEvent, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Download, Sparkles, Star } from 'lucide-react'
import type { PromotionSlotItem } from './api'
import { usePromotionSlot, useRecordPromotionEvent } from './hooks'
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
  onClick,
}: {
  item: PromotionSlotItem
  variant: PromotionSlotDisplayVariant
  onClick: (event: MouseEvent<HTMLAnchorElement>, item: PromotionSlotItem) => void
}) {
  const { t } = useTranslation()
  const isHero = variant === 'hero'
  const isPinned = variant === 'pinned'
  const targetLabel = item.targetType === 'SKILL_BUNDLE'
    ? t('promotionSlots.targetBundle')
    : t('promotionSlots.targetSkill')
  const displayName = item.targetName || item.title
  const summary = item.targetSummary || item.subtitle
  const namespaceLabel = item.targetNamespace && item.targetSlug
    ? `@${item.targetNamespace}/${item.targetSlug}`
    : targetLabel
  const metricClassName = cn(
    'inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white/85 px-2.5 text-xs font-semibold text-slate-700 shadow-sm',
    isPinned && 'border-white/40 bg-white/15 text-white shadow-none backdrop-blur',
  )
  const content = (
    <>
      <div className={cn(
        'relative shrink-0 overflow-hidden bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-600',
        isHero ? 'h-24 w-28 rounded-md md:w-40' : isPinned ? 'h-14 w-14 rounded-lg ring-2 ring-white/45 md:h-16 md:w-16' : 'h-14 w-14 rounded-md',
      )}>
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white">
            <Sparkles className={isHero ? 'h-8 w-8' : 'h-5 w-5'} strokeWidth={1.8} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
            isPinned ? 'bg-amber-300 text-slate-950' : 'bg-emerald-600 text-white',
          )}>
            <Sparkles className="h-3 w-3" />
            {t('promotionSlots.sponsored')}
          </span>
          <span className={cn(
            'truncate text-xs font-medium',
            isPinned ? 'text-emerald-50/90' : 'text-slate-600',
          )}>
            {namespaceLabel}
          </span>
          {item.targetVersion ? (
            <span className={cn(
              'rounded-full px-2 py-1 text-xs font-medium',
              isPinned ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600',
            )}>
              v{item.targetVersion}
            </span>
          ) : null}
        </div>
        <h3 className={cn(
          'line-clamp-1 font-heading font-semibold leading-tight',
          isPinned ? 'text-lg text-white md:text-xl' : 'text-slate-950',
          isHero ? 'text-xl md:text-2xl' : !isPinned && 'text-base md:text-lg',
        )}>
          {displayName}
        </h3>
        {summary ? (
          <p className={cn(
            'mt-1 text-sm leading-relaxed',
            isPinned ? 'line-clamp-1 text-emerald-50/90' : 'text-slate-600',
            isHero ? 'line-clamp-2' : !isPinned && 'line-clamp-1',
          )}>
            {summary}
          </p>
        ) : null}
      </div>
      <div className={cn(
        'flex shrink-0 items-center gap-2',
        isHero ? 'hidden md:flex md:flex-col md:items-end md:justify-center' : isPinned ? 'flex' : 'hidden sm:flex',
      )}>
        <div className={cn('flex flex-wrap justify-end gap-1.5', isPinned && 'hidden md:flex')}>
          {typeof item.downloadCount === 'number' ? (
            <span className={metricClassName}>
              <Download className="h-3 w-3" />
              {item.downloadCount}
            </span>
          ) : null}
          {typeof item.starCount === 'number' ? (
            <span className={metricClassName}>
              <Star className="h-3 w-3" />
              {item.starCount}
            </span>
          ) : null}
        </div>
        <span className={cn(
          'inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold shadow-sm',
          isPinned ? 'bg-white text-slate-950' : 'bg-slate-950 text-white',
        )}>
          <span className={cn(isPinned && 'hidden md:inline')}>{t('promotionSlots.openTarget')}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  )
  const pinnedDecoration = isPinned ? (
    <>
      <span className="absolute inset-y-0 left-0 w-1.5 bg-amber-300" aria-hidden="true" />
      <span
        className="absolute -right-16 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full border border-white/15 bg-white/5"
        aria-hidden="true"
      />
    </>
  ) : null
  const renderedContent = isPinned ? (
    <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
      {content}
    </div>
  ) : content

  if (!item.targetUrl) {
    return (
      <div className={cn(
        'flex h-full gap-3 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-3 shadow-sm',
        isHero && 'md:p-4',
        isPinned && 'relative items-center overflow-hidden border-0 bg-[linear-gradient(110deg,#0f766e_0%,#0f172a_56%,#2563eb_100%)] p-3 text-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.95)] ring-1 ring-white/20',
      )}>
        {pinnedDecoration}
        {renderedContent}
      </div>
    )
  }

  return (
    <a
      href={item.targetUrl}
      onClick={(event) => onClick(event, item)}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2"
    >
      <div
        className={cn(
          'flex h-full gap-3 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-3 shadow-sm ring-1 ring-emerald-500/10 transition-all',
          'hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md hover:ring-emerald-500/20',
          isHero && 'md:p-4',
          isPinned && [
            'relative items-center overflow-hidden border-0 bg-[linear-gradient(110deg,#0f766e_0%,#0f172a_56%,#2563eb_100%)] p-3 text-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.95)] ring-1 ring-white/20',
            'hover:border-0 hover:shadow-[0_22px_50px_-28px_rgba(15,23,42,0.95)] hover:ring-white/30',
          ],
        )}
      >
        {pinnedDecoration}
        {renderedContent}
      </div>
    </a>
  )
}

/**
 * Public promotion slot renderer. It records one impression per displayed campaign
 * during the component lifetime and records clicks before following the target URL.
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

  useEffect(() => {
    for (const item of visibleItems) {
      if (!recordedImpressions.current.has(item.campaignId)) {
        recordedImpressions.current.add(item.campaignId)
        recordPromotionEvent({ id: item.campaignId, eventType: 'IMPRESSION' })
      }
    }
  }, [recordPromotionEvent, visibleItems])

  if (isLoading || error || visibleItems.length === 0) {
    return null
  }

  return (
    <section className={className} aria-label={`${slotCode} promotions`}>
      <div className={cn(
        variant === 'hero' && 'grid gap-3 lg:grid-cols-2',
        variant === 'strip' && 'grid gap-3 md:grid-cols-2 lg:grid-cols-3',
        variant === 'pinned' && 'space-y-2',
      )}>
        {visibleItems.map((item) => (
          <PromotionItemCard
            key={item.campaignId}
            item={item}
            variant={variant}
            onClick={recordClickAndNavigate}
          />
        ))}
      </div>
    </section>
  )
}
