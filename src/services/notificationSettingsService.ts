import Config from "../models/config";

const CONFIG_KEY = "upcoming-payment-notification-days";
const DEFAULT_DAYS = [7, 3, 1, 0];

/**
 * Get the configured days for upcoming payment notifications.
 * Returns default days [7, 3, 1, 0] if no configuration exists.
 */
export async function getUpcomingPaymentNotificationDays(): Promise<number[]> {
  const config = await Config.findOne({ key: CONFIG_KEY }).lean();
  if (!config || !Array.isArray(config.value)) {
    return DEFAULT_DAYS;
  }
  // Ensure we return a sorted array (descending) and filter out invalid values
  const days = config.value
    .filter((d: any) => typeof d === "number" && d >= 0 && Number.isInteger(d))
    .sort((a: number, b: number) => b - a);
  return days.length > 0 ? days : DEFAULT_DAYS;
}

/**
 * Replace the entire list of notification days.
 * Validates and sorts the days before saving.
 */
export async function setUpcomingPaymentNotificationDays(
  days: number[],
): Promise<number[]> {
  // Validate: must be array of non-negative integers
  if (!Array.isArray(days)) {
    throw new Error("Days must be an array");
  }

  const validatedDays = days
    .map((d) => {
      if (typeof d !== "number" || !Number.isInteger(d) || d < 0) {
        throw new Error(`Invalid day value: ${d}. Must be a non-negative integer.`);
      }
      return d;
    })
    .filter((d, index, arr) => arr.indexOf(d) === index); // Remove duplicates

  if (validatedDays.length === 0) {
    throw new Error("At least one day must be provided");
  }

  // Sort descending
  const sortedDays = [...validatedDays].sort((a, b) => b - a);

  // Save or update config
  const existingConfig = await Config.findOne({ key: CONFIG_KEY });
  if (existingConfig) {
    existingConfig.value = sortedDays;
    existingConfig.type = "array";
    await existingConfig.save();
  } else {
    const newConfig = new Config({
      key: CONFIG_KEY,
      value: sortedDays,
      type: "array",
      description: "Días antes del vencimiento para enviar notificaciones de cuotas próximas",
    });
    await newConfig.save();
  }

  return sortedDays;
}

/**
 * Add a new day to the notification days list.
 * If the day already exists, it will be ignored (no error thrown).
 */
export async function addUpcomingPaymentNotificationDay(
  day: number,
): Promise<number[]> {
  if (typeof day !== "number" || !Number.isInteger(day) || day < 0) {
    throw new Error(`Invalid day value: ${day}. Must be a non-negative integer.`);
  }

  const currentDays = await getUpcomingPaymentNotificationDays();
  if (currentDays.includes(day)) {
    // Day already exists, return current list
    return currentDays;
  }

  const updatedDays = [...currentDays, day];
  return await setUpcomingPaymentNotificationDays(updatedDays);
}

/**
 * Remove a day from the notification days list.
 * Throws error if the day doesn't exist or if it's the last day.
 */
export async function removeUpcomingPaymentNotificationDay(
  day: number,
): Promise<number[]> {
  if (typeof day !== "number" || !Number.isInteger(day)) {
    throw new Error(`Invalid day value: ${day}. Must be an integer.`);
  }

  const currentDays = await getUpcomingPaymentNotificationDays();
  const index = currentDays.indexOf(day);

  if (index === -1) {
    throw new Error(`Day ${day} not found in notification days`);
  }

  if (currentDays.length === 1) {
    throw new Error("Cannot remove the last day. At least one day must remain.");
  }

  const updatedDays = currentDays.filter((d) => d !== day);
  return await setUpcomingPaymentNotificationDays(updatedDays);
}
