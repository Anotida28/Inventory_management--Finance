"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessTodayDate = exports.formatDateForBusinessTimeZone = void 0;
const BUSINESS_TIME_ZONE = process.env.OMARI_TIME_ZONE || process.env.BUSINESS_TIME_ZONE || "Africa/Harare";
const getDatePart = (date, partType, timeZone = BUSINESS_TIME_ZONE) => {
    var _a, _b;
    return (_b = (_a = new Intl.DateTimeFormat("en", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
        .formatToParts(date)
        .find((part) => part.type === partType)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "";
};
const formatDateForBusinessTimeZone = (date, timeZone = BUSINESS_TIME_ZONE) => {
    const year = getDatePart(date, "year", timeZone);
    const month = getDatePart(date, "month", timeZone);
    const day = getDatePart(date, "day", timeZone);
    return `${year}-${month}-${day}`;
};
exports.formatDateForBusinessTimeZone = formatDateForBusinessTimeZone;
const getBusinessTodayDate = (timeZone = BUSINESS_TIME_ZONE) => (0, exports.formatDateForBusinessTimeZone)(new Date(), timeZone);
exports.getBusinessTodayDate = getBusinessTodayDate;
