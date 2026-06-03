import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useApprovePromotionCampaign,
  usePromotionCampaigns,
  useRejectPromotionCampaign,
} from '@/features/promotion-campaign/hooks'
import type { CampaignStatus } from '@/features/promotion-campaign/api'
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

type PromotionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

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
