import { type MouseEvent, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import type { PromotionSlotItem } from './api'
import { usePromotionSlot, useRecordPromotionEvent } from './hooks'
import { Card } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

type PromotionSlotDisplayVariant = 'hero' | 'strip'

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
  const targetLabel = item.targetType === 'SKILL_BUNDLE'
    ? t('promotionSlots.targetBundle')
    : t('promotionSlots.targetSkill')
  const content = (
    <>
      {item.coverUrl ? (
        <div className={isHero ? 'h-36 overflow-hidden rounded-lg bg-secondary md:h-full' : 'h-24 overflow-hidden rounded-lg bg-secondary'}>
          <img
            src={item.coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {t('promotionSlots.sponsored')}
          </span>
          <span className="text-xs text-muted-foreground">{targetLabel}</span>
        </div>
        <h3 className={isHero ? 'font-heading text-2xl font-semibold leading-tight' : 'font-heading text-lg font-semibold leading-tight'}>
          {item.title}
        </h3>
        {item.subtitle ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.subtitle}</p>
        ) : null}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          {t('promotionSlots.openTarget')}
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </>
  )

  if (!item.targetUrl) {
    return (
      <Card className={isHero ? 'grid gap-5 p-5 md:grid-cols-[220px_1fr]' : 'flex gap-4 p-4'}>
        {content}
      </Card>
    )
  }

  return (
    <a
      href={item.targetUrl}
      onClick={(event) => onClick(event, item)}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
    >
      <Card
        className={cn(
          'h-full transition-transform hover:-translate-y-0.5 hover:shadow-md',
          isHero ? 'grid gap-5 p-5 md:grid-cols-[220px_1fr]' : 'flex gap-4 p-4',
        )}
      >
        {content}
      </Card>
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
      <div className={variant === 'hero' ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}>
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
