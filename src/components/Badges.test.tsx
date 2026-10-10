import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  SAMPLE_USER_BADGES,
  SAMPLE_DESTINATION_BADGES,
  getActiveNametagBadgeIds,
  setActiveNametagBadgeIds,
  getActiveNametagBadges,
  getSampleDestinationBadges,
  getUserBadges,
} from '@/lib/badges';
import {
  BadgePreviewModal,
  UserBadgeChip,
  UserBadgeIcon,
  UserBadgesRow,
  UserNametag,
  DestinationBadgeChip,
  DestinationBadgeList,
} from '@/components/Badges';

describe('Badges System & Components', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Badge Data Model & Utilities', () => {
    it('provides a rich catalog of sample user badges including Soulbound NFTs', () => {
      expect(SAMPLE_USER_BADGES.length).toBeGreaterThanOrEqual(10);
      const nftBadges = SAMPLE_USER_BADGES.filter((b) => b.isNft);
      expect(nftBadges.length).toBeGreaterThanOrEqual(3);

      const pioneerNft = SAMPLE_USER_BADGES.find((b) => b.id === 'nft-hundred-islands-pioneer');
      expect(pioneerNft).toBeDefined();
      expect(pioneerNft?.isNft).toBe(true);
      expect(pioneerNft?.tokenId).toBe('#0042');
      expect(pioneerNft?.network).toBe('Base L2');
    });

    it('provides a varied catalog of sample destination badges across categories', () => {
      expect(SAMPLE_DESTINATION_BADGES.length).toBeGreaterThanOrEqual(12);
      const categories = new Set(SAMPLE_DESTINATION_BADGES.map((b) => b.category));
      expect(categories.has('official')).toBe(true);
      expect(categories.has('nature')).toBe(true);
      expect(categories.has('culture')).toBe(true);
      expect(categories.has('atmosphere')).toBe(true);
      expect(categories.has('web3')).toBe(true);
    });

    it('saves and bounds active nametag badges to a maximum of 3', () => {
      const selected = ['nft-hundred-islands-pioneer', 'badge-eco-guardian', 'badge-lgu-ranger', 'badge-sovereign-explorer'];
      setActiveNametagBadgeIds(selected);

      const saved = getActiveNametagBadgeIds();
      expect(saved.length).toBe(3);
      expect(saved).toEqual(['nft-hundred-islands-pioneer', 'badge-eco-guardian', 'badge-lgu-ranger']);

      const activeBadges = getActiveNametagBadges();
      expect(activeBadges.length).toBe(3);
      expect(activeBadges[0].name).toBe('Hundred Islands Pioneer');
    });

    it('deterministically assigns destination badges for spots', () => {
      const badgesA = getSampleDestinationBadges('spot-hundred-islands', 'island_beach');
      const badgesB = getSampleDestinationBadges('spot-hundred-islands', 'island_beach');
      expect(badgesA).toEqual(badgesB);
      expect(badgesA.length).toBeGreaterThanOrEqual(2);
    });

    it('deterministically derives user badges using getUserBadges', () => {
      const badgesA = getUserBadges('Scout Ben');
      const badgesB = getUserBadges('Scout Ben');
      expect(badgesA).toEqual(badgesB);
      expect(badgesA.length).toBeGreaterThanOrEqual(1);

      const active = getUserBadges('someone', true);
      expect(active).toEqual(getActiveNametagBadges());
    });
  });

  describe('UserBadgeChip & UserBadgeIcon Components', () => {
    it('renders standard achievement badge with name and icon', () => {
      const badge = SAMPLE_USER_BADGES.find((b) => b.id === 'badge-eco-guardian')!;
      render(<UserBadgeChip badge={badge} />);

      expect(screen.getByText('Eco-Heritage Guardian')).toBeDefined();
      expect(screen.getByText('🌿')).toBeDefined();
      expect(screen.queryByText('NFT')).toBeNull();
    });

    it('renders Soulbound NFT badge with NFT tag and glint container', () => {
      const nftBadge = SAMPLE_USER_BADGES.find((b) => b.id === 'nft-hundred-islands-pioneer')!;
      render(<UserBadgeChip badge={nftBadge} showDetails />);

      expect(screen.getByText('Hundred Islands Pioneer')).toBeDefined();
      expect(screen.getByText('NFT')).toBeDefined();
      expect(screen.getByText('#0042')).toBeDefined();
    });

    it('renders Discord/Reddit-style UserBadgeIcon with accessible label and modal trigger', () => {
      const badge = SAMPLE_USER_BADGES[0];
      render(<UserBadgeIcon badge={badge} size="xs" />);

      const iconEl = screen.getByRole('button', { name: badge.name });
      expect(iconEl).toBeDefined();
      expect(iconEl.getAttribute('aria-label')).toBe(badge.name);
      expect(iconEl.getAttribute('title')).toBeNull();
    });

    it('renders UserBadgesRow containing multiple badge icons', () => {
      const badges = [SAMPLE_USER_BADGES[0], SAMPLE_USER_BADGES[1]];
      render(<UserBadgesRow badges={badges} size="xs" />);

      expect(screen.getByRole('button', { name: badges[0].name })).toBeDefined();
      expect(screen.getByRole('button', { name: badges[1].name })).toBeDefined();
    });
  });

  describe('UserNametag Component', () => {
    it('renders username along with specified badges in icon-only Discord/Reddit style', () => {
      const badge = SAMPLE_USER_BADGES[0];
      render(
        <UserNametag
          displayName="Juan Dela Cruz"
          handle="juandelacruz"
          badges={[badge]}
          showHandle
        />
      );

      expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
      expect(screen.getByText('@juandelacruz')).toBeDefined();
      expect(screen.getByRole('button', { name: badge.name })).toBeDefined();
    });

    it('renders full chips when iconOnly is false', () => {
      const badge = SAMPLE_USER_BADGES[0];
      render(
        <UserNametag
          displayName="Juan Dela Cruz"
          badges={[badge]}
          iconOnly={false}
        />
      );

      expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
      expect(screen.getByText(badge.name)).toBeDefined();
    });
  });

  describe('DestinationBadgeChip & List Components', () => {
    it('renders destination badge chip with icon and title', () => {
      const badge = SAMPLE_DESTINATION_BADGES[0];
      render(<DestinationBadgeChip badge={badge} />);

      expect(screen.getByText(badge.name)).toBeDefined();
      expect(screen.getByText(badge.icon)).toBeDefined();
    });

    it('renders a list of destination badges bounded by maxDisplay with remainder counter', () => {
      const badges = SAMPLE_DESTINATION_BADGES.slice(0, 5);
      render(<DestinationBadgeList badges={badges} maxDisplay={3} />);

      expect(screen.getByText(badges[0].name)).toBeDefined();
      expect(screen.getByText(badges[1].name)).toBeDefined();
      expect(screen.getByText(badges[2].name)).toBeDefined();
      expect(screen.getByText('+2')).toBeDefined();
    });

    it('renders compressed icon-only destination badges without title tooltip', () => {
      const badge = SAMPLE_DESTINATION_BADGES[0];
      render(<DestinationBadgeChip badge={badge} iconOnly={true} />);

      const btn = screen.getByRole('button', { name: badge.name });
      expect(btn).toBeDefined();
      expect(btn.getAttribute('aria-label')).toBe(badge.name);
      expect(btn.getAttribute('title')).toBeNull();
      expect(screen.getByText(badge.icon)).toBeDefined();
      // Full text label should not be rendered as a separate span in iconOnly mode
      expect(screen.queryByText(badge.name)).toBeNull();
    });

    it('renders iconOnly destination badge list without expanding line height', () => {
      const badges = SAMPLE_DESTINATION_BADGES.slice(0, 4);
      render(<DestinationBadgeList badges={badges} maxDisplay={2} iconOnly={true} />);

      expect(screen.getByRole('button', { name: badges[0].name })).toBeDefined();
      expect(screen.getByRole('button', { name: badges[1].name })).toBeDefined();
      expect(screen.getByText('+2')).toBeDefined();
    });
  });

  describe('BadgePreviewModal & Hover Overlay Tests', () => {
    it('renders BadgePreviewModal with criteria, how to earn, and token ID', () => {
      const nftBadge = SAMPLE_USER_BADGES[0];
      const onClose = () => {};

      render(
        <BadgePreviewModal
          badge={nftBadge}
          isOpen={true}
          onClose={onClose}
        />
      );

      // Verify modal dialog is accessible
      expect(screen.getByRole('dialog', { name: `${nftBadge.name} details` })).toBeDefined();
      expect(screen.getByText(nftBadge.name)).toBeDefined();
      expect(screen.getByText('Soulbound')).toBeDefined();
      expect(screen.getByText(nftBadge.description)).toBeDefined();
      expect(screen.getByText('Achievement Criteria')).toBeDefined();
      if (nftBadge.howToEarn) {
        expect(screen.getByText(nftBadge.howToEarn)).toBeDefined();
      }
      if (nftBadge.tokenId) {
        expect(screen.getByText(nftBadge.tokenId)).toBeDefined();
      }
    });

    it('renders destination badge preview modal with LGU / eco criteria', () => {
      const destBadge = SAMPLE_DESTINATION_BADGES[0];
      render(
        <BadgePreviewModal
          badge={destBadge}
          kind="destination"
          isOpen={true}
          onClose={() => {}}
        />
      );

      expect(screen.getByRole('dialog', { name: `${destBadge.name} details` })).toBeDefined();
      expect(screen.getByText(destBadge.name)).toBeDefined();
      expect(screen.getByText(destBadge.description)).toBeDefined();
      if (destBadge.howToEarn) {
        expect(screen.getByText(destBadge.howToEarn)).toBeDefined();
      }
    });

    it('opens BadgePreviewModal on click for UserBadgeIcon', () => {
      const badge = SAMPLE_USER_BADGES[0];
      render(<UserBadgeIcon badge={badge} />);

      const icon = screen.getByRole('button', { name: badge.name });
      fireEvent.click(icon);

      expect(screen.getByRole('dialog', { name: `${badge.name} details` })).toBeDefined();
      expect(screen.getByText('Achievement Criteria')).toBeDefined();
    });

    it('opens on hover and closes when mouse drifts away for UserBadgeIcon', () => {
      const badge = SAMPLE_USER_BADGES[0];
      render(<UserBadgeIcon badge={badge} />);

      const icon = screen.getByRole('button', { name: badge.name });
      
      // Mouse enters: opens preview modal
      fireEvent.mouseEnter(icon);
      expect(screen.getByRole('dialog', { name: `${badge.name} details` })).toBeDefined();

      // Mouse leaves: closes preview modal
      fireEvent.mouseLeave(icon);
      act(() => {
        // flush close timer
      });
    });

    it('opens on keyboard focus and closes on blur', () => {
      const badge = SAMPLE_USER_BADGES[0];
      render(<UserBadgeIcon badge={badge} />);

      const icon = screen.getByRole('button', { name: badge.name });

      // Focus
      fireEvent.focus(icon);
      expect(screen.getByRole('dialog', { name: `${badge.name} details` })).toBeDefined();

      // Blur
      fireEvent.blur(icon);
    });

    it('opens BadgePreviewModal on click for DestinationBadgeChip', () => {
      const badge = SAMPLE_DESTINATION_BADGES[0];
      render(<DestinationBadgeChip badge={badge} iconOnly={true} />);

      const chip = screen.getByRole('button', { name: badge.name });
      fireEvent.click(chip);

      expect(screen.getByRole('dialog', { name: `${badge.name} details` })).toBeDefined();
      expect(screen.getByText(badge.name)).toBeDefined();
    });
  });
});
