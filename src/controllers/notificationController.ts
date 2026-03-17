import mongoose from "mongoose";
import { Request, Response } from "express";
import NotificationCounter from "../models/NotificationCounter";
import Notification from "../models/Notification";
import User from "../models/User";
import { filterObj } from "../common/helper";

/**
 * Get notificacionCounter
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function getNotificationCounter(req: Request, res: Response) {
  const counter = await NotificationCounter.findOne({ user: req.user!.id });
  if (counter) {
    return res.json({ success: true, data: counter.count });
  }

  const cnt = new NotificationCounter({ user: req.user!.id });
  await cnt.save();
  return res.json({ success: true, data: cnt.count });
}

/**
 * Get Notifications
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function getNotifications(req: Request, res: Response) {
  const { page: _page, size: _size } = req.params;
  const page = Number.parseInt(_page, 10);
  const size = Number.parseInt(_size, 10);

  const notifications = await Notification.aggregate([
    { $match: { user: req.user!.id } },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1, _id: 1 } },
          { $skip: (page - 1) * size },
          { $limit: size },
        ],
        pageInfo: [
          {
            $count: "totalRecords",
          },
        ],
      },
    },
  ]);
  return res.status(200).json({
    success: true,
    message: "Notifications retrieved successfully",
    notifications,
  });
}

/**
 * Mark Notifications as read
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function markAsRead(req: Request, res: Response) {
  const { ids }: { ids: string[] } = req.body;
  const _ids = ids.map((id) => new mongoose.Types.ObjectId(id));
  const notifications = await Notification.updateMany(
    { user: req.user!.id, _id: { $in: _ids } },
    { isRead: true },
  );

  const decrementCount = notifications.modifiedCount;
  const notificacionCounter = await NotificationCounter.findOneAndUpdate(
    { user: req.user!.id },
    [
      {
        $set: {
          count: { $max: [{ $subtract: ["$count", decrementCount] }, 0] },
        },
      },
    ],
    { new: true },
  );

  return res.status(200).json({
    success: true,
    message: "Notifications marked as read successfully",
    data: notificacionCounter,
  });
}

/**
 * Mark Notifications as unread
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function markAsUnRead(req: Request, res: Response) {
  const { ids }: { ids: string[] } = req.body;
  const _ids = ids.map((id) => new mongoose.Types.ObjectId(id));
  const notifications = await Notification.updateMany(
    { user: req.user!.id, _id: { $in: _ids } },
    { isRead: false },
  );

  const incrementCount = notifications.modifiedCount;
  const notificacionCounter = await NotificationCounter.findOneAndUpdate(
    { user: req.user!.id },
    [{ $inc: { count: incrementCount } }],
    { new: true },
  );

  return res.status(200).json({
    success: true,
    message: "Notifications marked as unread successfully",
    data: notificacionCounter,
  });
}

/**
 * Delete Notifications
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function deleteNotifications(req: Request, res: Response) {
  const { ids }: { ids: string[] } = req.body;
  const _ids = ids.map((id) => new mongoose.Types.ObjectId(id));
  const notifications = await Notification.deleteMany({
    user: req.user!.id,
    _id: { $in: _ids },
  });

  const decrementCount = notifications.deletedCount;
  const notificacionCounter = await NotificationCounter.findOneAndUpdate(
    { user: req.user!.id },
    [
      {
        $set: {
          count: { $max: [{ $subtract: ["$count", decrementCount] }, 0] },
        },
      },
    ],
    { new: true },
  );

  return res.status(200).json({
    success: true,
    message: "Notifications deleted successfully",
    data: notificacionCounter,
  });
}

/**
 * Delete all Notifications
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function deleteAllNotifications(req: Request, res: Response) {
  const notifications = await Notification.deleteMany({ user: req.user!.id });

  const decrementCount = notifications.deletedCount;
  const notificacionCounter = await NotificationCounter.findOneAndUpdate(
    { user: req.user!.id },
    [
      {
        $set: {
          count: { $max: [{ $subtract: ["$count", decrementCount] }, 0] },
        },
      },
    ],
    { new: true },
  );

  return res.status(200).json({
    success: true,
    message: "Notifications deleted successfully",
    data: notificacionCounter,
  });
}

/**
 * Edit configuration
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function editConfiguration(req: Request, res: Response) {
  const { body } = req;
  const user = await User.findById(req.user!.id);
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized", code: "unauthorized" });
  }

  const filteredBody = filterObj(body, "email", "sms", "push", "promotions");

  if (!user.notificationsConfig)
    user.notificationsConfig = {
      email: false,
      sms: false,
      push: false,
      promotions: false,
    };
  Object.assign(user.notificationsConfig, filteredBody);
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Configuration updated successfully",
    data: { userId: user._id },
  });
}

/**
 * Get configuration
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export async function getConfiguration(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      code: "user_not_found",
    });
  }
  if (!user.notificationsConfig) {
    user.notificationsConfig = {
      email: false,
      sms: false,
      push: false,
      promotions: false,
    };
    await user.save();
  }

  return res.status(200).json({
    success: true,
    message: "Configuration retrieved successfully",
    data: user.notificationsConfig,
  });
}
