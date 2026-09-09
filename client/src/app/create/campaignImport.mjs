import { z } from "zod";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum([
    "choose_many",
    "choose_many_required",
    "choose_one",
    "choose_one_required",
  ]),
  required: z.boolean().optional(),
  items: z.array(z.string().trim().min(1).max(200)).min(1).max(200),
});

const campaignImportSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  boardSize: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  startDateTime: z.string().trim().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    "Use local YYYY-MM-DDTHH:mm format",
  ),
  timeZone: z.string().trim().min(1).max(100).optional(),
  backgroundPresetId: z.number().int().min(1).max(6).optional().default(1),
  categories: z.array(categorySchema).min(1).max(50),
}).superRefine((campaign, context) => {
  const itemCount = campaign.categories.reduce(
    (total, category) => total + category.items.length,
    0,
  );
  const requiredItemCount = (campaign.boardSize * campaign.boardSize) - 1;
  if (itemCount < requiredItemCount) {
    context.addIssue({
      code: "custom",
      path: ["categories"],
      message: `Add at least ${requiredItemCount} items for a ${campaign.boardSize}x${campaign.boardSize} board`,
    });
  }
});

export const exampleCampaign = {
  title: "Awards Night Predictions",
  description: "Predictions to watch for during the show.",
  boardSize: 3,
  startDateTime: "2026-10-15T19:00",
  timeZone: "America/New_York",
  backgroundPresetId: 2,
  categories: [
    {
      name: "Speeches",
      type: "choose_many",
      required: false,
      items: [
        "A winner thanks their childhood teacher",
        "A speech runs past the music cue",
        "Someone reads from their phone",
        "A presenter tears up",
      ],
    },
    {
      name: "Stage moments",
      type: "choose_many",
      required: false,
      items: [
        "A surprise guest appears",
        "The host changes outfits",
        "A prop fails on stage",
        "The audience gives a standing ovation",
      ],
    },
  ],
};

export const parseCampaignImport = (source) => {
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("The selected file is not valid JSON");
  }

  const result = campaignImportSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "campaign"}: ${issue.message}`)
      .join("; ");
    throw new Error(details);
  }
  return result.data;
};

export const downloadExampleCampaign = () => {
  const blob = new Blob([`${JSON.stringify(exampleCampaign, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "bongii-campaign-example.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};