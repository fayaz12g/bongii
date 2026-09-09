const { Server } = require('socket.io');

const SOCKET_EVENTS = Object.freeze({
  finalized: 'campaign:finalized',
  join: 'campaign:join',
  outcome: 'campaign:outcome',
  snapshotInvalidated: 'campaign:snapshot-invalidated',
  status: 'campaign:status',
});

const campaignRoom = (campaignCode) => `campaign:${campaignCode}`;

const normalizeCampaignCode = (value) => {
  if (typeof value !== 'string') return null;
  const campaignCode = value.trim().toUpperCase();
  return /^[A-Z]{4}$/.test(campaignCode) ? campaignCode : null;
};

const createRealtimeServer = ({ server, database, config, campaignEvents, logger = console }) => {
  const isAllowedOrigin = (origin) => !origin || config.allowedOrigins.includes(origin);
  const io = new Server(server, {
    allowRequest(request, callback) {
      callback(null, isAllowedOrigin(request.headers.origin));
    },
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed'));
      },
      methods: ['GET', 'POST'],
    },
  });
  let connectionCount = 0;

  io.on('connection', (socket) => {
    connectionCount += 1;
    logger.info('Socket connection state', {
      state: 'connected',
      connectionCount,
      recovered: socket.recovered,
      transport: socket.conn.transport.name,
    });

    socket.on(SOCKET_EVENTS.join, async (payload, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      const campaignCode = normalizeCampaignCode(payload?.campaignCode);
      if (!campaignCode) {
        logger.info('Socket campaign room state', {
          state: 'join_rejected',
          reason: 'invalid_code',
        });
        reply({ ok: false, error: 'Campaign code must contain four letters' });
        return;
      }

      try {
        const campaign = await database.getPublicCampaignByCode(campaignCode);
        if (!campaign) {
          logger.info('Socket campaign room state', {
            state: 'join_rejected',
            reason: 'not_found',
          });
          reply({ ok: false, error: 'Campaign not found' });
          return;
        }

        const previousRooms = [...socket.rooms]
          .filter((room) => room.startsWith('campaign:'));
        await Promise.all(previousRooms.map((room) => socket.leave(room)));
        await socket.join(campaignRoom(campaignCode));
        logger.info('Socket campaign room state', { state: 'joined' });
        reply({
          ok: true,
          campaignCode,
          campaignVersion: campaign.version,
        });
      } catch (error) {
        logger.error('Socket campaign room state', { state: 'join_failed' });
        reply({ ok: false, error: 'Unable to join campaign' });
      }
    });

    socket.on('disconnect', (reason) => {
      connectionCount = Math.max(0, connectionCount - 1);
      logger.info('Socket connection state', {
        state: 'disconnected',
        connectionCount,
        reason,
      });
    });
  });

  const emitInvalidation = (campaignCode, campaignVersion, reason) => {
    io.to(campaignRoom(campaignCode)).emit(SOCKET_EVENTS.snapshotInvalidated, {
      type: 'snapshotInvalidated',
      campaignCode,
      campaignVersion,
      reason,
    });
  };

  const handleOutcomeUpdated = ({ campaignCode, campaignVersion, outcome }) => {
    const { decidedBy, ...publicOutcome } = outcome;
    io.to(campaignRoom(campaignCode)).emit(SOCKET_EVENTS.outcome, {
      type: 'itemOutcome',
      campaignCode,
      campaignVersion,
      ...publicOutcome,
    });
    emitInvalidation(campaignCode, campaignVersion, 'outcome.updated');
  };

  const handleStatusChanged = (campaign) => {
    io.to(campaignRoom(campaign.code)).emit(SOCKET_EVENTS.status, {
      type: 'campaignStatus',
      campaignCode: campaign.code,
      campaignVersion: campaign.version,
      status: campaign.status,
    });
    emitInvalidation(campaign.code, campaign.version, 'status.changed');
  };

  const handleCampaignFinalized = ({
    campaignCode,
    campaignVersion,
    finalizedAt,
    status,
  }) => {
    io.to(campaignRoom(campaignCode)).emit(SOCKET_EVENTS.finalized, {
      type: 'campaignFinalized',
      campaignCode,
      campaignVersion,
      status,
      finalizedAt,
      leaderboardPath: `/leaderboards/${campaignCode}`,
    });
    emitInvalidation(campaignCode, campaignVersion, 'campaign.finalized');
  };

  campaignEvents.on('campaign.finalized', handleCampaignFinalized);
  campaignEvents.on('outcome.updated', handleOutcomeUpdated);
  campaignEvents.on('status.changed', handleStatusChanged);

  const close = () => new Promise((resolve) => {
    campaignEvents.off('campaign.finalized', handleCampaignFinalized);
    campaignEvents.off('outcome.updated', handleOutcomeUpdated);
    campaignEvents.off('status.changed', handleStatusChanged);
    io.close(resolve);
  });

  return { close, io };
};

module.exports = { SOCKET_EVENTS, createRealtimeServer };