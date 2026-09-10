const { z } = require('zod');
const { PROFILE_AVATAR_IDS } = require('./profileAvatars');

const validationError = (result) => ({
  error: 'Invalid request',
  details: result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  })),
});

const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(validationError(result));
    return;
  }
  req.validatedBody = result.data;
  next();
};

const requiredText = (maximum) => z.string().trim().min(1).max(maximum);
const optionalEmail = z.union([z.string().trim().email(), z.literal('')]).optional();

const schemas = {
  profile: z.union([
    z.object({
      displayName: requiredText(160),
      profileIcon: z.enum(PROFILE_AVATAR_IDS).optional(),
    }),
    z.object({
      firstName: requiredText(80),
      lastName: requiredText(80),
      email: optionalEmail,
      profileIcon: z.enum(PROFILE_AVATAR_IDS).optional(),
    }),
  ]),
  debugTokenPurchase: z.object({}).strict().optional().default({}),
  campaign: z.object({
    title: requiredText(120),
    description: z.string().trim().max(2000).optional(),
    backgroundPreset: z.object({
      id: z.union([z.number().int().positive(), z.literal('custom')]),
      name: requiredText(80),
      gradient: requiredText(200),
      animation: requiredText(50),
    }),
    boardSize: z.union([z.literal(3), z.literal(4), z.literal(5)]),
    startDateTime: requiredText(100),
    categories: z.array(z.object({
      name: requiredText(100),
      type: z.enum([
        'choose_many',
        'choose_many_required',
        'choose_one',
        'choose_one_required',
      ]),
      required: z.boolean().optional().default(false),
      items: z.array(requiredText(200)).min(1).max(200),
    })).min(1).max(50),
  }),
  board: z.object({
    playerName: requiredText(80),
    selectedTiles: z.array(z.object({
      categoryItemId: z.number().int().positive().nullable().optional(),
      position: z.number().int().min(0).max(24),
      isCenter: z.boolean().optional().default(false),
      customText: z.string().trim().max(200).nullable().optional(),
    })).min(1).max(25),
    useDoubleOrNothing: z.boolean().optional().default(false),
  }),
  boardUpdate: z.object({
    playerName: requiredText(80),
    selectedTiles: z.array(z.object({
      categoryItemId: z.number().int().positive().nullable().optional(),
      position: z.number().int().min(0).max(24),
      isCenter: z.boolean().optional().default(false),
      customText: z.string().trim().max(200).nullable().optional(),
    })).min(1).max(25),
  }),
  itemOutcome: z.object({
    status: z.enum(['pending', 'happened', 'did_not_happen']),
  }),
};

module.exports = { schemas, validateBody };