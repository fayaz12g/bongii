const { DomainError } = require('./db');

const ACTIONS = Object.freeze({
  publish: { from: 'draft', to: 'open' },
  lock: { from: 'open', to: 'locked' },
  reopen: { from: 'locked', to: 'open' },
  startModeration: { from: 'locked', to: 'moderating' },
  cancel: { from: ['draft', 'open', 'locked', 'moderating'], to: 'cancelled' },
});

const selectableItemCount = (campaign) => campaign.categories.reduce(
  (total, category) => total + category.items.length,
  0,
);

const canPublish = (campaign) => (
  selectableItemCount(campaign) >= (campaign.boardSize * campaign.boardSize) - 1
);

const getAllowedActions = (campaign) => {
  switch (campaign.status) {
    case 'draft':
      return [...(canPublish(campaign) ? ['publish'] : []), 'cancel'];
    case 'open':
      return ['lock', 'cancel'];
    case 'locked':
      return [
        ...(campaign.moderationStartedAt ? [] : ['reopen', 'startModeration']),
        'cancel',
      ];
    case 'moderating':
      return ['finalize', 'cancel'];
    default:
      return [];
  }
};

const withAllowedActions = (campaign) => ({
  ...campaign,
  allowedActions: getAllowedActions(campaign),
});

class CampaignLifecycle {
  constructor(database, clock = () => new Date().toISOString()) {
    this.database = database;
    this.clock = clock;
  }

  async getOwnedCampaign(code, userId) {
    const campaign = await this.database.getCampaignByCode(code);
    if (!campaign) throw new DomainError('Campaign not found', 404);
    if (campaign.createdBy !== userId) {
      throw new DomainError('Only the campaign creator can manage it', 403);
    }
    return campaign;
  }

  async getModeratorCampaign(code, userId) {
    return withAllowedActions(await this.getOwnedCampaign(code, userId));
  }

  finalize(code, userId) {
    return this.database.finalizeCampaign(code, userId, this.clock());
  }

  async transition(code, userId, action) {
    const transition = ACTIONS[action];
    if (!transition) throw new DomainError('Unknown campaign action');

    const campaign = await this.getOwnedCampaign(code, userId);
    const validSources = Array.isArray(transition.from) ? transition.from : [transition.from];
    if (!validSources.includes(campaign.status)) {
      throw new DomainError(`Cannot ${action} a ${campaign.status} campaign`, 409);
    }
    if (action === 'publish' && !canPublish(campaign)) {
      const requiredItems = (campaign.boardSize * campaign.boardSize) - 1;
      throw new DomainError(`Campaign needs at least ${requiredItems} selectable items`, 409);
    }
    if (action === 'reopen' && campaign.moderationStartedAt) {
      throw new DomainError('Campaign cannot reopen after moderation has started', 409);
    }

    const changedAt = this.clock();
    const lifecycle = {
      publishedAt: campaign.publishedAt,
      boardCreationClosedAt: campaign.boardCreationClosedAt,
      moderationStartedAt: campaign.moderationStartedAt,
      finalizedAt: campaign.finalizedAt,
      cancelledAt: campaign.cancelledAt,
    };

    if (action === 'publish') lifecycle.publishedAt = changedAt;
    if (action === 'lock') lifecycle.boardCreationClosedAt = changedAt;
    if (action === 'reopen') lifecycle.boardCreationClosedAt = null;
    if (action === 'startModeration') {
      lifecycle.boardCreationClosedAt ||= changedAt;
      lifecycle.moderationStartedAt = changedAt;
    }
    if (action === 'cancel') {
      lifecycle.cancelledAt = changedAt;
      if (campaign.status === 'open') lifecycle.boardCreationClosedAt = changedAt;
    }

    const updated = await this.database.transitionCampaign(
      campaign,
      transition.to,
      lifecycle,
    );
    if (!updated) {
      throw new DomainError('Campaign changed; refresh and try again', 409);
    }
    return withAllowedActions(updated);
  }
}

module.exports = { CampaignLifecycle, getAllowedActions, withAllowedActions };