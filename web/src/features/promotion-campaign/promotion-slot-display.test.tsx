// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PromotionSlotDisplay } from './promotion-slot-display'

const { recordPromotionEventMock, usePromotionSlotMock } = vi.hoisted(() => ({
  recordPromotionEventMock: vi.fn(),
  usePromotionSlotMock: vi.fn(),
}))

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('./hooks', () => ({
  usePromotionSlot: (slotCode: string) => usePromotionSlotMock(slotCode),
  useRecordPromotionEvent: () => ({ mutate: recordPromotionEventMock }),
}))

vi.mock('@/shared/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('PromotionSlotDisplay', () => {
  const clipboardWriteText = vi.fn()

  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    recordPromotionEventMock.mockReset()
    usePromotionSlotMock.mockReset()
    clipboardWriteText.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteText.mockResolvedValue(undefined) },
      configurable: true,
    })
    usePromotionSlotMock.mockReturnValue({
      data: [
        {
          campaignId: 7,
          slotCode: 'HOME_HERO',
          targetType: 'SKILL',
          targetId: 42,
          title: 'Launch assistant',
          subtitle: 'A promoted skill',
          targetNamespace: 'global',
          targetSlug: 'launch-assistant',
          targetName: 'Launch Assistant Skill',
          targetSummary: 'Automates launch planning',
          targetVersion: '1.2.0',
          downloadCount: 128,
          starCount: 9,
          targetUrl: '/space/global/launch-assistant',
        },
      ],
      isLoading: false,
      error: null,
    })
  })

  it('renders slot items and records impression and click events', async () => {
    render(<PromotionSlotDisplay slotCode="HOME_HERO" maxItems={1} />)

    expect(screen.getByText('Launch Assistant Skill')).toBeTruthy()
    expect(screen.queryByText('@global/launch-assistant')).toBeNull()
    expect(screen.getByText('Automates launch planning')).toBeTruthy()
    expect(recordPromotionEventMock).toHaveBeenCalledWith({ id: 7, eventType: 'IMPRESSION' })

    fireEvent.click(screen.getByRole('link'))

    expect(recordPromotionEventMock).toHaveBeenLastCalledWith(
      { id: 7, eventType: 'CLICK' },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    )
  })

  it('rotates multiple active campaigns in one slot instead of stacking cards', async () => {
    usePromotionSlotMock.mockReturnValue({
      data: [
        {
          campaignId: 7,
          slotCode: 'HOME_HERO',
          targetType: 'SKILL',
          targetId: 42,
          title: 'Launch assistant',
          targetNamespace: 'global',
          targetSlug: 'launch-assistant',
          targetName: 'Launch Assistant Skill',
          targetUrl: '/space/global/launch-assistant',
        },
        {
          campaignId: 8,
          slotCode: 'HOME_HERO',
          targetType: 'SKILL',
          targetId: 43,
          title: 'Deploy assistant',
          targetNamespace: 'global',
          targetSlug: 'deploy-assistant',
          targetName: 'Deploy Assistant Skill',
          targetUrl: '/space/global/deploy-assistant',
        },
      ],
      isLoading: false,
      error: null,
    })

    render(<PromotionSlotDisplay slotCode="HOME_HERO" maxItems={2} rotationIntervalMs={10} />)

    expect(screen.getByLabelText('HOME_HERO promotions')).toBeTruthy()
    expect(screen.getByText('Launch Assistant Skill')).toBeTruthy()
    expect(screen.queryByText('Deploy Assistant Skill')).toBeNull()
    expect(screen.queryByLabelText('promotionSlots.previous')).toBeNull()
    expect(screen.queryByLabelText('promotionSlots.next')).toBeNull()
    await waitFor(() => {
      expect(recordPromotionEventMock).toHaveBeenCalledWith({ id: 7, eventType: 'IMPRESSION' })
    })

    await waitFor(() => {
      expect(screen.getByText('Deploy Assistant Skill')).toBeTruthy()
      expect(screen.queryByText('Launch Assistant Skill')).toBeNull()
    })
    expect(recordPromotionEventMock).toHaveBeenCalledWith({ id: 8, eventType: 'IMPRESSION' })
  })

  it('copies the same clawhub install command used by skill cards', async () => {
    render(<PromotionSlotDisplay slotCode="HOME_HERO" maxItems={1} />)

    fireEvent.click(screen.getByLabelText('copyButton.copy'))

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringMatching(/^npx clawhub install launch-assistant --registry /),
      )
    })
  })
})
