import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useApprovePromotionCampaign,
  useCreatePromotionCampaign,
  usePromotionCampaigns,
  useRejectPromotionCampaign,
} from '@/features/promotion-campaign/hooks'
import type { CampaignStatus, CreateCampaignPayload } from '@/features/promotion-campaign/api'
import { useApprovePromotion, usePromotionList, useRejectPromotion } from '@/features/promotion/use-promotion-list'
import { formatLocalDateTime } from '@/shared/lib/date-time'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import { DashboardPageHeader } from '@/shared/components/dashboard-page-header'

const CAMPAIGN_STATUSES: Array<{ value: CampaignStatus; labelKey: string }> = [
  { value: 'PENDING_REVIEW', labelKey: 'promotions.campaigns.tabPendingReview' },
  { value: 'SCHEDULED', labelKey: 'promotions.campaigns.tabScheduled' },
  { value: 'ACTIVE', labelKey: 'promotions.campaigns.tabActive' },
  { value: 'ENDED', labelKey: 'promotions.campaigns.tabEnded' },
  { value: 'REJECTED', labelKey: 'promotions.campaigns.tabRejected' },
]

const PROMOTION_SLOT_CODES = [
  'HOME_HERO',
  'HOME_FEATURED_SKILLS',
  'HOME_FEATURED_BUNDLES',
  'SEARCH_PINNED',
  'CATEGORY_FEATURED',
  'DETAIL_RELATED',
  'CLI_RECOMMENDED',
] as const

type PromotionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type CampaignFormState = {
  targetType: CreateCampaignPayload['targetType']
  targetId: string
  targetVersionId: string
  slotCode: string
  title: string
  subtitle: string
  coverMediaId: string
  demoMediaId: string
  priority: string
  startsAt: string
  endsAt: string
  reason: string
}

function toLocalDateTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function createDefaultCampaignForm(): CampaignFormState {
  const now = new Date()
  const startsAt = new Date(now.getTime() + 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    targetType: 'SKILL',
    targetId: '',
    targetVersionId: '',
    slotCode: 'HOME_HERO',
    title: '',
    subtitle: '',
    coverMediaId: '',
    demoMediaId: '',
    priority: '50',
    startsAt: toLocalDateTimeInputValue(startsAt),
    endsAt: toLocalDateTimeInputValue(endsAt),
    reason: '',
  }
}

function optionalNumber(value: string) {
  const trimmed = value.trim()
  return trimmed ? Number(trimmed) : null
}

function optionalString(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function PromotionCampaignCreateForm() {
  const { t } = useTranslation()
  const createMutation = useCreatePromotionCampaign()
  const [form, setForm] = useState<CampaignFormState>(() => createDefaultCampaignForm())
  const [formError, setFormError] = useState<string | null>(null)

  const updateField = <K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const targetId = Number(form.targetId)
    const priority = Number(form.priority)
    const startsAt = new Date(form.startsAt)
    const endsAt = new Date(form.endsAt)

    if (!Number.isFinite(targetId) || targetId <= 0) {
      setFormError(t('promotions.campaigns.errors.targetId'))
      return
    }
    if (!form.title.trim()) {
      setFormError(t('promotions.campaigns.errors.title'))
      return
    }
    if (!Number.isFinite(priority) || priority < 0 || priority > 100) {
      setFormError(t('promotions.campaigns.errors.priority'))
      return
    }
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || !endsAt.getTime() || endsAt <= startsAt) {
      setFormError(t('promotions.campaigns.errors.timeWindow'))
      return
    }

    const payload: CreateCampaignPayload = {
      targetType: form.targetType,
      targetId,
      targetVersionId: optionalNumber(form.targetVersionId),
      slotCode: form.slotCode,
      title: form.title.trim(),
      subtitle: optionalString(form.subtitle),
      coverMediaId: optionalNumber(form.coverMediaId),
      demoMediaId: optionalNumber(form.demoMediaId),
      priority,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      reason: optionalString(form.reason),
    }

    createMutation.mutate(payload, {
      onSuccess: () => setForm(createDefaultCampaignForm()),
    })
  }

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="font-heading text-lg font-semibold">{t('promotions.campaigns.createTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('promotions.campaigns.createSubtitle')}</p>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formTargetType')}</span>
            <select
              className="flex h-11 w-full rounded-lg border bg-white px-4 py-2 text-sm"
              value={form.targetType}
              onChange={(event) => updateField('targetType', event.target.value as CampaignFormState['targetType'])}
            >
              <option value="SKILL">{t('promotions.campaigns.targetSkill')}</option>
              <option value="SKILL_BUNDLE">{t('promotions.campaigns.targetBundle')}</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formTargetId')}</span>
            <Input
              type="number"
              min={1}
              required
              value={form.targetId}
              onChange={(event) => updateField('targetId', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formVersionId')}</span>
            <Input
              type="number"
              min={1}
              value={form.targetVersionId}
              onChange={(event) => updateField('targetVersionId', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formSlot')}</span>
            <select
              className="flex h-11 w-full rounded-lg border bg-white px-4 py-2 text-sm"
              value={form.slotCode}
              onChange={(event) => updateField('slotCode', event.target.value)}
            >
              {PROMOTION_SLOT_CODES.map((slotCode) => (
                <option key={slotCode} value={slotCode}>
                  {slotCode}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formTitle')}</span>
            <Input
              required
              maxLength={128}
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formSubtitle')}</span>
            <Input
              maxLength={512}
              value={form.subtitle}
              onChange={(event) => updateField('subtitle', event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formPriority')}</span>
            <Input
              type="number"
              min={0}
              max={100}
              required
              value={form.priority}
              onChange={(event) => updateField('priority', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium lg:col-span-2">
            <span>{t('promotions.campaigns.formStartsAt')}</span>
            <Input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(event) => updateField('startsAt', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium lg:col-span-2">
            <span>{t('promotions.campaigns.formEndsAt')}</span>
            <Input
              type="datetime-local"
              required
              value={form.endsAt}
              onChange={(event) => updateField('endsAt', event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formCoverMediaId')}</span>
            <Input
              type="number"
              min={1}
              value={form.coverMediaId}
              onChange={(event) => updateField('coverMediaId', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>{t('promotions.campaigns.formDemoMediaId')}</span>
            <Input
              type="number"
              min={1}
              value={form.demoMediaId}
              onChange={(event) => updateField('demoMediaId', event.target.value)}
            />
          </label>
        </div>

        <label className="space-y-2 text-sm font-medium">
          <span>{t('promotions.campaigns.formReason')}</span>
          <Textarea
            maxLength={1000}
            value={form.reason}
            onChange={(event) => updateField('reason', event.target.value)}
          />
        </label>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        {createMutation.error ? <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? t('promotions.campaigns.creating') : t('promotions.campaigns.createAction')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

/**
 * Renders one promotion queue lane. Pending items expose moderation actions,
 * while historical lanes stay read-only and surface the review comment only.
 */
function PromotionRequestSection({ status }: { status: PromotionRequestStatus }) {
  const { t, i18n } = useTranslation()
  const { data: items, isLoading } = usePromotionList(status)
  const approveMutation = useApprovePromotion()
  const rejectMutation = useRejectPromotion()
  const [commentById, setCommentById] = useState<Record<number, string>>({})

  if (isLoading) {
    return <div className="h-32 animate-shimmer rounded-xl" />
  }

  if (!items || items.length === 0) {
    return <Card className="p-10 text-center text-muted-foreground">{t('promotions.empty')}</Card>
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold font-heading">{item.sourceNamespace}/{item.sourceSkillSlug}</div>
              <div className="text-sm text-muted-foreground">
                {item.sourceVersion} {'->'} @{item.targetNamespace}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{formatLocalDateTime(item.submittedAt, i18n.language)}</div>
          </div>
          {status === 'PENDING' ? (
            <>
              <Input
                placeholder={t('promotions.commentPlaceholder')}
                value={commentById[item.id] ?? ''}
                onChange={(event) => setCommentById((prev) => ({ ...prev, [item.id]: event.target.value }))}
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => approveMutation.mutate({ id: item.id, comment: commentById[item.id] })}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {t('promotions.approve')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate({ id: item.id, comment: commentById[item.id] })}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {t('promotions.reject')}
                </Button>
              </div>
            </>
          ) : item.reviewComment ? (
            <p className="text-sm text-muted-foreground">{item.reviewComment}</p>
          ) : null}
        </Card>
      ))}
    </div>
  )
}

function PromotionRequestTabs() {
  const { t } = useTranslation()

  return (
    <Tabs defaultValue="PENDING">
      <TabsList>
        <TabsTrigger value="PENDING">{t('promotions.tabPending')}</TabsTrigger>
        <TabsTrigger value="APPROVED">{t('promotions.tabApproved')}</TabsTrigger>
        <TabsTrigger value="REJECTED">{t('promotions.tabRejected')}</TabsTrigger>
      </TabsList>
      <TabsContent value="PENDING" className="mt-6">
        <PromotionRequestSection status="PENDING" />
      </TabsContent>
      <TabsContent value="APPROVED" className="mt-6">
        <PromotionRequestSection status="APPROVED" />
      </TabsContent>
      <TabsContent value="REJECTED" className="mt-6">
        <PromotionRequestSection status="REJECTED" />
      </TabsContent>
    </Tabs>
  )
}

function PromotionCampaignSection({ status }: { status: CampaignStatus }) {
  const { t, i18n } = useTranslation()
  const { data, isLoading, error } = usePromotionCampaigns(status)
  const approveMutation = useApprovePromotionCampaign()
  const rejectMutation = useRejectPromotionCampaign()
  const [commentById, setCommentById] = useState<Record<number, string>>({})
  const items = data?.items ?? []

  if (isLoading) {
    return <div className="h-32 animate-shimmer rounded-xl" />
  }

  if (error) {
    return <Card className="p-10 text-center text-destructive">{(error as Error).message}</Card>
  }

  if (items.length === 0) {
    return <Card className="p-10 text-center text-muted-foreground">{t('promotions.campaigns.empty')}</Card>
  }

  return (
    <div className="space-y-4">
      {items.map((campaign) => (
        <Card key={campaign.id} className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="font-heading font-semibold">{campaign.title}</div>
              {campaign.subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{campaign.subtitle}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{t('promotions.campaigns.slot')}: {campaign.slotCode}</span>
                <span>
                  {campaign.targetType} #{campaign.targetId}
                  {campaign.targetVersionId ? ` / v${campaign.targetVersionId}` : ''}
                </span>
                <span>{t('promotions.campaigns.priority')}: {campaign.priority}</span>
              </div>
            </div>
            <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {campaign.status}
            </span>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <div>
              {t('promotions.campaigns.schedule')}: {formatLocalDateTime(campaign.startsAt, i18n.language)} {'->'}{' '}
              {formatLocalDateTime(campaign.endsAt, i18n.language)}
            </div>
            <div>{t('promotions.campaigns.submittedBy')}: {campaign.submittedBy}</div>
          </div>

          {status === 'PENDING_REVIEW' ? (
            <div className="space-y-3">
              <Textarea
                placeholder={t('promotions.commentPlaceholder')}
                value={commentById[campaign.id] ?? ''}
                onChange={(event) => setCommentById((prev) => ({ ...prev, [campaign.id]: event.target.value }))}
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => approveMutation.mutate({ id: campaign.id, comment: commentById[campaign.id] })}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {t('promotions.approve')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate({ id: campaign.id, comment: commentById[campaign.id] })}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {t('promotions.reject')}
                </Button>
              </div>
            </div>
          ) : campaign.reviewComment ? (
            <p className="text-sm text-muted-foreground">{campaign.reviewComment}</p>
          ) : null}
        </Card>
      ))}
    </div>
  )
}

function PromotionCampaignTabs() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PromotionCampaignCreateForm />
      <Tabs defaultValue="PENDING_REVIEW">
        <TabsList className="max-w-full flex-wrap">
          {CAMPAIGN_STATUSES.map((status) => (
            <TabsTrigger key={status.value} value={status.value}>
              {t(status.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
        {CAMPAIGN_STATUSES.map((status) => (
          <TabsContent key={status.value} value={status.value} className="mt-6">
            <PromotionCampaignSection status={status.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

/**
 * Dashboard page for promotion slot campaigns and namespace promotion requests.
 */
export function PromotionsPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-8 animate-fade-up">
      <DashboardPageHeader title={t('promotions.title')} subtitle={t('promotions.subtitle')} />
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">{t('promotions.tabCampaigns')}</TabsTrigger>
          <TabsTrigger value="requests">{t('promotions.tabRequests')}</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="mt-6">
          <PromotionCampaignTabs />
        </TabsContent>
        <TabsContent value="requests" className="mt-6">
          <PromotionRequestTabs />
        </TabsContent>
      </Tabs>
    </div>
  )
}
