// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('PromotionSlotDisplay', () => {
  beforeEach(() => {
    recordPromotionEventMock.mockReset()
    usePromotionSlotMock.mockReset()
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
    expect(screen.getByText('@global/launch-assistant')).toBeTruthy()
    expect(screen.getByText('Automates launch planning')).toBeTruthy()
    await waitFor(() => {
      expect(recordPromotionEventMock).toHaveBeenCalledWith({ id: 7, eventType: 'IMPRESSION' })
    })

    fireEvent.click(screen.getByRole('link'))

    expect(recordPromotionEventMock).toHaveBeenLastCalledWith(
      { id: 7, eventType: 'CLICK' },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    )
  })
})
