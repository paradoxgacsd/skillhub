import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useApprovePromotionCampaign,
  useCreatePromotionCampaign,
  usePromotionCampaigns,
  useRejectPromotionCampaign,
} from '@/features/promotion-campaign/hooks'
import type { CampaignStatus, CreateCampaignPayload } from '@/features/promotion-campaign/api'
import { useApprovePromotion, usePromotionList, useRejectPromotion } from '@/features/promotion/use-promotion-list'
import type { SkillSummary } from '@/api/types'
import { formatLocalDateTime } from '@/shared/lib/date-time'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  normalizeSelectValue,
} from '@/shared/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import { DashboardPageHeader } from '@/shared/components/dashboard-page-header'
import { useSearchSkills } from '@/shared/hooks/use-skill-queries'

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
  'SEARCH_PINNED',
  'DETAIL_RELATED',
] as const

const EMPTY_SKILL_VALUE = '__select_skill__'

type PromotionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type CampaignFormState = {
  selectedSkillId: string
  skillQuery: string
  slotCode: string
  title: string
  subtitle: string
  startsAt: string
  endsAt: string
}

function toLocalDateTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function createDefaultCampaignForm(): CampaignFormState {
  const now = new Date()
  const startsAt = now
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    selectedSkillId: '',
    skillQuery: '',
    slotCode: 'HOME_HERO',
    title: '',
    subtitle: '',
    startsAt: toLocalDateTimeInputValue(startsAt),
    endsAt: toLocalDateTimeInputValue(endsAt),
  }
}

function optionalString(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function getSkillOptionLabel(skill: SkillSummary) {
  const version = skill.publishedVersion?.version
  return `${skill.displayName} (@${skill.namespace}/${skill.slug}${version ? ` · v${version}` : ''})`
}

function PromotionCampaignCreateDialog() {
  const { t } = useTranslation()
  const createMutation = useCreatePromotionCampaign()
  const [form, setForm] = useState<CampaignFormState>(() => createDefaultCampaignForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const normalizedSkillQuery = form.skillQuery.trim()
  const { data: skillPage, isLoading: isLoadingSkills } = useSearchSkills({
    q: normalizedSkillQuery || undefined,
    sort: normalizedSkillQuery ? 'relevance' : 'newest',
    page: 0,
    size: 50,
  })
  const skillOptions = useMemo(
    () => (skillPage?.items ?? []).filter((skill) => skill.publishedVersion),
    [skillPage?.items],
  )
  const selectedSkill = skillOptions.find((skill) => String(skill.id) === form.selectedSkillId)

  const updateField = <K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const resetAndClose = () => {
    setForm(createDefaultCampaignForm())
    setFormError(null)
    setOpen(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const startsAt = new Date(form.startsAt)
    const endsAt = new Date(form.endsAt)

    if (!selectedSkill) {
      setFormError(t('promotions.campaigns.errors.skillRequired'))
      return
    }
    if (!form.title.trim()) {
      setFormError(t('promotions.campaigns.errors.title'))
      return
    }
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || !endsAt.getTime() || endsAt <= startsAt) {
      setFormError(t('promotions.campaigns.errors.timeWindow'))
      return
    }

    const payload: CreateCampaignPayload = {
      targetType: 'SKILL',
      targetId: selectedSkill.id,
      targetVersionId: selectedSkill.publishedVersion?.id ?? null,
      slotCode: form.slotCode,
      title: form.title.trim(),
      subtitle: optionalString(form.subtitle),
      coverMediaId: null,
      demoMediaId: null,
      priority: 50,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      reason: null,
    }

    createMutation.mutate(payload, {
      onSuccess: resetAndClose,
    })
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen(true)}>
          {t('promotions.campaigns.createAction')}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(calc(100vw-2rem),44rem)]">
          <DialogHeader>
            <DialogTitle>{t('promotions.campaigns.createTitle')}</DialogTitle>
            <DialogDescription>{t('promotions.campaigns.createSubtitle')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <Label htmlFor="promotion-skill-search" className="text-sm font-semibold font-heading">
                {t('promotions.campaigns.formSkillSearch')}
              </Label>
              <Input
                id="promotion-skill-search"
                value={form.skillQuery}
                placeholder={t('promotions.campaigns.skillSearchPlaceholder')}
                onChange={(event) => {
                  updateField('skillQuery', event.target.value)
                  updateField('selectedSkillId', '')
                }}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="promotion-skill" className="text-sm font-semibold font-heading">
                {t('promotions.campaigns.formSkill')}
              </Label>
              {isLoadingSkills ? (
                <div className="h-11 animate-shimmer rounded-lg" />
              ) : (
                <Select
                  value={normalizeSelectValue(form.selectedSkillId) ?? EMPTY_SKILL_VALUE}
                  onValueChange={(value) => {
                    const nextSkillId = value === EMPTY_SKILL_VALUE ? '' : value
                    updateField('selectedSkillId', nextSkillId)
                    const nextSkill = skillOptions.find((skill) => String(skill.id) === nextSkillId)
                    if (nextSkill && !form.title.trim()) {
                      updateField('title', nextSkill.displayName)
                    }
                  }}
                >
                  <SelectTrigger id="promotion-skill">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SKILL_VALUE}>{t('promotions.campaigns.selectSkill')}</SelectItem>
                    {skillOptions.map((skill) => (
                      <SelectItem key={skill.id} value={String(skill.id)}>
                        {getSkillOptionLabel(skill)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!isLoadingSkills && skillOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('promotions.campaigns.noPromotableSkills')}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label htmlFor="promotion-slot" className="text-sm font-semibold font-heading">
                {t('promotions.campaigns.formSlot')}
              </Label>
              <Select value={form.slotCode} onValueChange={(value) => updateField('slotCode', value)}>
                <SelectTrigger id="promotion-slot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMOTION_SLOT_CODES.map((slotCode) => (
                    <SelectItem key={slotCode} value={slotCode}>
                      {t(`promotions.campaigns.slots.${slotCode}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>{t('promotions.campaigns.formStartsAt')}</span>
                <Input
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(event) => updateField('startsAt', event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>{t('promotions.campaigns.formEndsAt')}</span>
                <Input
                  type="datetime-local"
                  required
                  value={form.endsAt}
                  onChange={(event) => updateField('endsAt', event.target.value)}
                />
              </label>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            {createMutation.error ? <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
                {t('dialog.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('promotions.campaigns.creating') : t('promotions.campaigns.createAction')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
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
      <PromotionCampaignCreateDialog />
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
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">{t('promotions.tabRequests')}</TabsTrigger>
          <TabsTrigger value="campaigns">{t('promotions.tabCampaigns')}</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-6">
          <PromotionRequestTabs />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-6">
          <PromotionCampaignTabs />
        </TabsContent>
      </Tabs>
    </div>
  )
}
