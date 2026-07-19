import { User } from '../models/user.model.js';
import { Group } from '../models/group.model.js';
import { Event } from '../models/event.model.js';
import { Payment } from '../models/payment.model.js';
import { Review } from '../models/review.model.js';
import { Ticket } from '../models/ticket.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getStats = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    totalGroups,
    activeGroups,
    totalEvents,
    upcomingEvents,
    totalTickets,
    totalPayments,
    successPayments,
    flaggedReviews,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ is_banned: false }),
    User.countDocuments({ is_banned: true }),
    Group.countDocuments(),
    Group.countDocuments({ is_active: true }),
    Event.countDocuments(),
    Event.countDocuments({ start_at: { $gte: new Date() }, is_cancelled: false }),
    Ticket.countDocuments(),
    Payment.countDocuments(),
    Payment.countDocuments({ status: 'success' }),
    Review.countDocuments({ is_flagged: true }),
  ]);

  const revenueAgg = await Payment.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount_centimes' }, commission: { $sum: '$commission_centimes' } } },
  ]);

  const totalRevenueCentimes = revenueAgg[0]?.total ?? 0;
  const totalCommissionCentimes = revenueAgg[0]?.commission ?? 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const userGrowth = await User.aggregate([
    { $match: { created_at: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$created_at' }, month: { $month: '$created_at' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, active: activeUsers, banned: bannedUsers },
      groups: { total: totalGroups, active: activeGroups },
      events: { total: totalEvents, upcoming: upcomingEvents },
      tickets: { total: totalTickets },
      payments: {
        total: totalPayments,
        successful: successPayments,
        revenue_centimes: totalRevenueCentimes,
        revenue_mad: (totalRevenueCentimes / 100).toFixed(2),
        commission_mad: (totalCommissionCentimes / 100).toFixed(2),
      },
      moderation: { flagged_reviews: flaggedReviews },
      user_growth: userGrowth,
    },
  });
});
