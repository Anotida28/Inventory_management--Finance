const BUSINESS_TIME_ZONE = "Africa/Harare";

const getDatePart = (
  date: Date,
  partType: "year" | "month" | "day",
  timeZone = BUSINESS_TIME_ZONE
) =>
  new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .find((part) => part.type === partType)?.value ?? "";

export const formatDateForBusinessTimeZone = (
  date: Date,
  timeZone = BUSINESS_TIME_ZONE
) => {
  const year = getDatePart(date, "year", timeZone);
  const month = getDatePart(date, "month", timeZone);
  const day = getDatePart(date, "day", timeZone);

  return `${year}-${month}-${day}`;
};

export const getBusinessTodayDate = (timeZone = BUSINESS_TIME_ZONE) =>
  formatDateForBusinessTimeZone(new Date(), timeZone);
