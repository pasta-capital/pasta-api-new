import { Request, Response } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import Notifications from "../models/Notifications";
import NotificationUsers from "../models/NotificationUsers";
import { sendCampaign as processCampaign } from "../services/notificationService";
import { resolveTargetUsers } from "../services/notificationService";
import {
  getUpcomingPaymentNotificationDays,
  setUpcomingPaymentNotificationDays,
  addUpcomingPaymentNotificationDay,
  removeUpcomingPaymentNotificationDay,
} from "../services/notificationSettingsService";

const objectId = () => Joi.string().length(24).hex();

const createSchema = Joi.object({
  audience: Joi.string().valid("USER", "ADMIN").default("USER"),
  type: Joi.string().valid("MOBILE", "EMAIL", "INTERNAL", "SMS").required(),
  infoType: Joi.string()
    .valid("NEUTRAL", "SUCCESS", "WARNING", "ERROR", "BAN")
    .default("NEUTRAL"),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  imageUrl: Joi.string().uri().optional().allow(null, ""),
  link: Joi.string().uri().optional().allow(null, ""),
  users: Joi.array().items(objectId()).default([]),
  group: objectId().allow(null, ""),
  sendAt: Joi.date().optional().allow(null),
  status: Joi.string().valid("draft", "scheduled").optional(),
});

export async function createCampaign(req: Request, res: Response) {
  const { error, value } = createSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res.status(400).json({ success: false, message: error.message });

  if (!value.group && (!value.users || value.users.length === 0)) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one target: users or group",
    });
  }

  const notif = await Notifications.create({
    audience: value.audience || "USER",
    type: value.type,
    infoType: value.infoType || "NEUTRAL",
    title: value.title,
    description: value.description,
    imageUrl: value.imageUrl || null,
    link: value.link || null,
    users: Array.from(new Set(value.users || [])),
    group: value.group || null,
    sendAt: value.sendAt || null,
    status:
      value.sendAt && new Date(value.sendAt) > new Date()
        ? "scheduled"
        : "draft",
  });

  // If immediate send
  const shouldSendNow = !notif.sendAt || new Date(notif.sendAt) <= new Date();
  if (shouldSendNow) {
    await processCampaign(String(notif._id));
  }

  return res
    .status(201)
    .json({ success: true, message: "Campaign created", data: notif });
}

export async function sendCampaignNow(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ success: false, message: "Invalid id" });
  const notif = await Notifications.findById(id);
  if (!notif)
    return res
      .status(404)
      .json({ success: false, message: "Campaign not found" });

  await processCampaign(String(notif._id));
  return res.status(200).json({ success: true, message: "Campaign processed" });
}

export async function cancelCampaign(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ success: false, message: "Invalid id" });
  const notif = await Notifications.findById(id);
  if (!notif)
    return res
      .status(404)
      .json({ success: false, message: "Campaign not found" });

  if (["sent", "failed", "cancelled", "processing"].includes(notif.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel campaign in status: ${notif.status}`,
    });
  }

  notif.status = "cancelled";
  await notif.save();
  return res.status(200).json({
    success: true,
    message: "Campaign cancelled",
    data: { id: notif._id, status: notif.status },
  });
}

export async function getCampaignReadCount(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  const campaignObjectId = new mongoose.Types.ObjectId(id);

  const readCount = await NotificationUsers.countDocuments({
    campaignId: campaignObjectId,
    status: "read",
  });

  return res.status(200).json({
    success: true,
    message: "Read count retrieved",
    data: { readCount },
  });
}

export async function listCampaigns(req: Request, res: Response) {
  const page = Math.max(parseInt(String(req.query.page || 1), 10), 1);
  const size = Math.max(parseInt(String(req.query.size || 10), 10), 1);
  const status = String(req.query.status || "").trim();
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const search = String(req.query.search || "").trim();
  const infoType = String(req.query.infoType || "").trim();

  const filter: any = {};
  if (status) filter.status = status;
  if (infoType) filter.infoType = infoType;
  if (from || to) {
    filter.createdAt = {} as any;
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  // Build aggregation pipeline dynamically to inject search when provided
  const pipeline: any[] = [{ $match: filter }];

  if (search) {
    // Escape regex special characters for safe search
    const rx = new RegExp(
      search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
      "i",
    );
    pipeline.push({
      $match: {
        $or: [{ title: rx }, { description: rx }],
      },
    });
  }

  pipeline.push({
    $facet: {
      data: [
        { $sort: { createdAt: -1, _id: 1 } },
        { $skip: (page - 1) * size },
        { $limit: size },
      ],
      pageInfo: [{ $count: "totalRecords" }],
    },
  });

  const agg = await Notifications.aggregate(pipeline);

  return res
    .status(200)
    .json({ success: true, message: "Campaigns retrieved", data: agg[0] });
}

export async function listDeliveries(req: Request, res: Response) {
  const page = Math.max(parseInt(String(req.query.page || 1), 10), 1);
  const size = Math.max(parseInt(String(req.query.size || 10), 10), 1);
  const status = String(req.query.status || "").trim();
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const campaignId = String(req.query.campaignId || "").trim();
  const search = String(req.query.search || "").trim();
  const infoType = String(req.query.infoType || "").trim();

  const filter: any = {};
  if (status) {
    filter.status = status;
  }

  if (campaignId && mongoose.isValidObjectId(campaignId)) {
    filter.campaignId = new mongoose.Types.ObjectId(campaignId);
  }

  if (from || to) {
    filter.createdAt = {} as any;

    if (from) {
      filter.createdAt.$gte = from;
    }
    if (to) {
      filter.createdAt.$lte = to;
    }
  }
  if (infoType) {
    filter.infoType = infoType;
  }
  // If searching only fields that exist pre-lookup/projection, fold into initial $match
  if (search) {
    const rx = new RegExp(
      search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
      "i",
    );

    filter.$or = [{ title: rx }, { description: rx }];
  }

  // Build aggregation pipeline dynamically to inject search after projection
  const pipeline: any[] = [
    { $match: filter },
    // Lookup for User (optional)
    {
      $lookup: {
        from: "User",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    // Lookup for Admin (optional)
    {
      $lookup: {
        from: "Admin",
        localField: "adminId",
        foreignField: "_id",
        as: "admin",
      },
    },
    // Keep single entries (they may be empty arrays)
    {
      $addFields: {
        user: { $arrayElemAt: ["$user", 0] },
        admin: { $arrayElemAt: ["$admin", 0] },
      },
    },
    {
      $project: {
        _id: 1,
        campaignId: 1,
        recipientType: 1,
        type: 1,
        title: 1,
        description: 1,
        imageUrl: 1,
        link: 1,
        userId: 1,
        adminId: 1,
        status: 1,
        readAt: 1,
        createdAt: 1,
        // Lightweight populated data for user and admin
        user: {
          _id: "$user._id",
          name: "$user.name",
          lastname: "$user.lastname",
          email: "$user.email",
        },
        admin: {
          _id: "$admin._id",
          name: "$admin.name",
          lastname: "$admin.lastname",
          email: "$admin.email",
        },
        recipient: {
          $cond: [
            { $eq: ["$recipientType", "ADMIN"] },
            {
              _id: "$admin._id",
              name: "$admin.name",
              lastname: "$admin.lastname",
              email: "$admin.email",
            },
            {
              _id: "$user._id",
              name: "$user.name",
              lastname: "$user.lastname",
              email: "$user.email",
            },
          ],
        },
      },
    },
  ];

  // Note: no second $match needed since search is merged into initial filter

  pipeline.push({
    $facet: {
      data: [
        { $sort: { createdAt: -1, _id: 1 } },
        { $skip: (page - 1) * size },
        { $limit: size },
      ],
      pageInfo: [{ $count: "totalRecords" }],
    },
  });

  const agg = await NotificationUsers.aggregate(pipeline);

  return res
    .status(200)
    .json({ success: true, message: "Deliveries retrieved", data: agg[0] });
}

export async function getMyNotifications(req: Request, res: Response) {
  const user = req.user;
  const page = Math.max(parseInt(String(req.query.page || 1), 10), 1);
  const size = Math.max(parseInt(String(req.query.size || 10), 10), 1);
  const status = String(req.query.status || "").trim();
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const infoType = String(req.query.infoType || "").trim();

  const filter: any = {
    $or: [
      { userId: new mongoose.Types.ObjectId(req.user!.id) },
      { adminId: new mongoose.Types.ObjectId(req.user!.id) },
    ],
  };

  if (status) {
    filter.status = status;
  }
  if (infoType) {
    filter.infoType = infoType;
  }

  if (from || to) {
    filter.createdAt = {} as any;

    if (from) {
      filter.createdAt.$gte = from;
    }

    if (to) {
      filter.createdAt.$lte = to;
    }
  }

  const agg = await NotificationUsers.aggregate([
    { $match: filter },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1, _id: 1 } },
          { $skip: (page - 1) * size },
          { $limit: size },
        ],
        pageInfo: [{ $count: "totalRecords" }],
        unreadCount: [
          { $match: { status: { $ne: "read" } } },
          { $count: "count" },
        ],
      },
    },
  ]);

  const unreadCount = (agg?.[0]?.unreadCount?.[0]?.count as number) || 0;
  const payload: any = { ...agg[0], unreadCount };
  if (payload.unreadCount && Array.isArray(payload.unreadCount))
    delete payload.unreadCount; // keep only numeric field

  return res
    .status(200)
    .json({ success: true, message: "Notifications retrieved", data: payload });
}

export async function markMyAsRead(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids) || ids.some((id) => !mongoose.isValidObjectId(id))) {
    return res.status(400).json({ success: false, message: "Invalid ids" });
  }
  const _ids = ids.map((id) => new mongoose.Types.ObjectId(id));
  const propertyId = req.user!.id;

  const resp = await NotificationUsers.updateMany(
    {
      _id: { $in: _ids },
      $or: [
        { userId: new mongoose.Types.ObjectId(propertyId) },
        { adminId: new mongoose.Types.ObjectId(propertyId) },
      ],
    },
    { status: "read", readAt: new Date() },
  );

  return res.status(200).json({
    success: true,
    message: "Notifications marked as read",
    data: { modified: resp.modifiedCount },
  });
}

/**
 * Get the configured days for upcoming payment notifications
 */
export async function getUpcomingPaymentNotificationDaysHandler(
  req: Request,
  res: Response,
) {
  try {
    const days = await getUpcomingPaymentNotificationDays();
    return res.status(200).json({
      success: true,
      message: "Notification days retrieved",
      data: { days },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving notification days",
      error: error.message || error,
    });
  }
}

/**
 * Replace the entire list of notification days
 */
const replaceDaysSchema = Joi.object({
  days: Joi.array()
    .items(Joi.number().integer().min(0).required())
    .min(1)
    .required(),
});

export async function replaceUpcomingPaymentNotificationDaysHandler(
  req: Request,
  res: Response,
) {
  const { error, value } = replaceDaysSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  try {
    const days = await setUpcomingPaymentNotificationDays(value.days);
    return res.status(200).json({
      success: true,
      message: "Notification days updated",
      data: { days },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Error updating notification days",
      error: error.message || error,
    });
  }
}

/**
 * Add a new day to the notification days list
 */
const addDaySchema = Joi.object({
  day: Joi.number().integer().min(0).required(),
});

export async function addUpcomingPaymentNotificationDayHandler(
  req: Request,
  res: Response,
) {
  const { error, value } = addDaySchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  try {
    const days = await addUpcomingPaymentNotificationDay(value.day);
    return res.status(200).json({
      success: true,
      message: "Notification day added",
      data: { days },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Error adding notification day",
      error: error.message || error,
    });
  }
}

/**
 * Remove a day from the notification days list
 */
export async function removeUpcomingPaymentNotificationDayHandler(
  req: Request,
  res: Response,
) {
  const { day } = req.params;
  const dayNum = parseInt(day, 10);

  if (isNaN(dayNum)) {
    return res.status(400).json({
      success: false,
      message: "Invalid day parameter. Must be a number.",
    });
  }

  try {
    const days = await removeUpcomingPaymentNotificationDay(dayNum);
    return res.status(200).json({
      success: true,
      message: "Notification day removed",
      data: { days },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Error removing notification day",
      error: error.message || error,
    });
  }
}
